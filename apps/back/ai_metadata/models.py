from django.core.exceptions import ValidationError
from django.db import models

from tvchannels.models import VideoFile


class AIProvider(models.Model):
    """Провайдер AI сервиса"""

    PROVIDER_TYPES = [
        ("openai", "OpenAI"),
        ("anthropic", "Anthropic"),
        ("google", "Google AI"),
        ("yandex", "Yandex GPT"),
        ("custom", "Кастомный"),
    ]

    name = models.CharField("Название", max_length=100, unique=True)
    provider_type = models.CharField(
        "Тип провайдера", max_length=20, choices=PROVIDER_TYPES
    )
    api_key = models.TextField("API ключ")
    api_url = models.URLField(
        "URL API", blank=True, help_text="Для кастомных провайдеров"
    )
    default_model = models.CharField("Модель по умолчанию", max_length=100)
    available_models = models.JSONField(
        "Доступные модели",
        default=list,
        help_text="Список доступных моделей в формате JSON",
    )
    max_tokens = models.PositiveIntegerField("Максимум токенов", default=4000)
    temperature = models.FloatField(
        "Температура", default=0.7, help_text="От 0.0 до 2.0"
    )
    timeout = models.PositiveIntegerField("Таймаут (секунды)", default=30)
    is_active = models.BooleanField("Активен", default=True)
    is_default = models.BooleanField("По умолчанию", default=False)
    description = models.TextField("Описание", blank=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "AI Провайдер"
        verbose_name_plural = "AI Провайдеры"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_provider_type_display()})"

    def clean(self):
        # Проверяем, что только один провайдер может быть по умолчанию
        if self.is_default:
            existing_default = AIProvider.objects.filter(is_default=True)
            if self.pk:
                existing_default = existing_default.exclude(pk=self.pk)
            if existing_default.exists():
                raise ValidationError(
                    "Только один провайдер может быть установлен по умолчанию"
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def get_default_provider(cls):
        """Получить провайдера по умолчанию"""
        return cls.objects.filter(is_default=True, is_active=True).first()


class AITask(models.Model):
    """Задача для обработки AI"""

    TASK_TYPES = [
        ("generate_title", "Генерация названия"),
        ("generate_description", "Генерация описания"),
        ("extract_keywords", "Извлечение ключевых слов"),
        ("categorize_content", "Категоризация контента"),
        ("translate_title", "Перевод названия"),
        ("custom", "Кастомная задача"),
    ]

    name = models.CharField("Название задачи", max_length=100, unique=True)
    task_type = models.CharField("Тип задачи", max_length=30, choices=TASK_TYPES)
    provider = models.ForeignKey(
        AIProvider,
        on_delete=models.CASCADE,
        related_name="tasks",
        verbose_name="AI Провайдер",
        null=True,
        blank=True,
        help_text="Если не указан, будет использован провайдер по умолчанию",
    )
    model_name = models.CharField(
        "Название модели",
        max_length=100,
        blank=True,
        help_text="Если не указано, будет использована модель по умолчанию провайдера",
    )
    system_prompt = models.TextField(
        "Системный промпт", help_text="Инструкции для AI о том, как выполнять задачу"
    )
    user_prompt_template = models.TextField(
        "Шаблон пользовательского промпта",
        help_text="Шаблон с переменными: {file_path}, {filename}, {duration}, {extension}, {file_size}",
    )
    max_tokens = models.PositiveIntegerField("Максимум токенов", null=True, blank=True)
    temperature = models.FloatField("Температура", null=True, blank=True)
    response_format = models.CharField(
        "Формат ответа",
        max_length=50,
        choices=[
            ("text", "Текст"),
            ("json", "JSON"),
            ("structured", "Структурированный"),
        ],
        default="text",
    )
    validation_rules = models.JSONField(
        "Правила валидации",
        default=dict,
        blank=True,
        help_text="Правила для проверки ответа AI",
    )
    retry_count = models.PositiveIntegerField("Количество повторов", default=3)
    is_active = models.BooleanField("Активна", default=True)
    is_default_for_type = models.BooleanField("По умолчанию для типа", default=False)
    priority = models.PositiveIntegerField(
        "Приоритет", default=0, help_text="Больше число = выше приоритет"
    )
    description = models.TextField("Описание", blank=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "AI Задача"
        verbose_name_plural = "AI Задачи"
        ordering = ["-priority", "name"]
        indexes = [
            models.Index(fields=["task_type", "is_active"]),
            models.Index(fields=["is_default_for_type", "task_type"]),
            models.Index(fields=["priority"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_task_type_display()})"

    def clean(self):
        # Проверяем, что только одна задача может быть по умолчанию для каждого типа
        if self.is_default_for_type:
            existing_default = AITask.objects.filter(
                task_type=self.task_type, is_default_for_type=True
            )
            if self.pk:
                existing_default = existing_default.exclude(pk=self.pk)
            if existing_default.exists():
                raise ValidationError(
                    f'Только одна задача может быть по умолчанию для типа "{self.get_task_type_display()}"'
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def get_effective_provider(self):
        """Получить эффективного провайдера (назначенного или по умолчанию)"""
        return self.provider or AIProvider.get_default_provider()

    def get_effective_model(self):
        """Получить эффективную модель"""
        provider = self.get_effective_provider()
        return self.model_name or (provider.default_model if provider else None)

    def get_effective_max_tokens(self):
        """Получить эффективное значение max_tokens"""
        if self.max_tokens:
            return self.max_tokens
        provider = self.get_effective_provider()
        return provider.max_tokens if provider else 4000

    def get_effective_temperature(self):
        """Получить эффективное значение temperature"""
        if self.temperature is not None:
            return self.temperature
        provider = self.get_effective_provider()
        return provider.temperature if provider else 0.7

    def render_user_prompt(self, video_file):
        """Отрендерить пользовательский промпт с данными видеофайла"""
        # Убираем префикс /srv/ffplayout-media из пути
        clean_path = video_file.file_path.replace("/srv/ffplayout-media/", "").replace(
            "/srv/ffplayout-media", ""
        )

        # Получаем данные о файле
        import os

        filename_without_ext = os.path.splitext(os.path.basename(clean_path))[0]
        filename_with_ext = os.path.basename(clean_path)
        extension = video_file.extension
        duration = (
            video_file.duration_formatted
            if hasattr(video_file, "duration_formatted")
            else "неизвестно"
        )
        file_size = (
            video_file.file_size_mb
            if hasattr(video_file, "file_size_mb")
            else "неизвестно"
        )

        # Заменяем переменные в шаблоне
        return self.user_prompt_template.format(
            file_path=clean_path,
            filename=filename_without_ext,
            filename_full=filename_with_ext,
            duration=duration,
            extension=extension,
            file_size=file_size,
            video_name=video_file.name,
        )

    @classmethod
    def get_default_for_type(cls, task_type):
        """Получить задачу по умолчанию для типа"""
        return cls.objects.filter(
            task_type=task_type, is_default_for_type=True, is_active=True
        ).first()


class AIRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Ожидает"),
        ("processing", "Обрабатывается"),
        ("completed", "Завершен"),
        ("failed", "Ошибка"),
        ("cancelled", "Отменен"),
    ]

    video_file = models.ForeignKey(
        VideoFile,
        on_delete=models.CASCADE,
        related_name="ai_requests",
        verbose_name="Видеофайл",
    )
    task = models.ForeignKey(
        AITask,
        on_delete=models.CASCADE,
        related_name="requests",
        verbose_name="AI Задача",
        null=True,
        blank=True,
    )
    provider = models.ForeignKey(
        AIProvider,
        on_delete=models.CASCADE,
        related_name="requests",
        verbose_name="AI Провайдер",
        null=True,
        blank=True,
    )
    model_used = models.CharField(
        "Использованная модель", max_length=100, blank=True, default=""
    )
    system_prompt = models.TextField("Системный промпт", blank=True, default="")
    user_prompt = models.TextField("Пользовательский промпт", blank=True, default="")
    # Поле для обратной совместимости
    request_type = models.CharField(
        "Тип запроса (legacy)", max_length=50, default="generate_title", blank=True
    )
    prompt = models.TextField("Промпт (legacy)", blank=True, default="")
    response = models.TextField("Ответ AI", blank=True, null=True)
    status = models.CharField(
        "Статус", max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    error_message = models.TextField("Сообщение об ошибке", blank=True, null=True)
    tokens_used = models.PositiveIntegerField(
        "Использовано токенов", null=True, blank=True
    )
    cost = models.DecimalField(
        "Стоимость", max_digits=10, decimal_places=6, null=True, blank=True
    )
    execution_time = models.FloatField("Время выполнения (сек)", null=True, blank=True)
    retry_count = models.PositiveIntegerField("Количество попыток", default=0)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)
    processed_at = models.DateTimeField("Дата обработки", blank=True, null=True)

    class Meta:
        verbose_name = "AI Запрос"
        verbose_name_plural = "AI Запросы"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["video_file", "task"]),
            models.Index(fields=["task", "status"]),
            models.Index(fields=["provider"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        task_name = self.task.name if self.task else self.request_type
        return f"{task_name} для {self.video_file.name} ({self.get_status_display()})"


class AIProcessingLog(models.Model):
    LOG_LEVELS = [
        ("info", "Информация"),
        ("warning", "Предупреждение"),
        ("error", "Ошибка"),
        ("debug", "Отладка"),
    ]

    ai_request = models.ForeignKey(
        AIRequest,
        on_delete=models.CASCADE,
        related_name="logs",
        verbose_name="AI запрос",
        null=True,
        blank=True,
    )
    video_file = models.ForeignKey(
        VideoFile,
        on_delete=models.CASCADE,
        related_name="processing_logs",
        verbose_name="Видеофайл",
    )
    level = models.CharField(
        "Уровень", max_length=10, choices=LOG_LEVELS, default="info"
    )
    message = models.TextField("Сообщение")
    details = models.JSONField("Детали", blank=True, null=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)

    class Meta:
        verbose_name = "Лог обработки AI"
        verbose_name_plural = "Логи обработки AI"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["level"]),
            models.Index(fields=["video_file"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.get_level_display()}: {self.message[:50]}..."


class AISettings(models.Model):
    """Настройки для работы с AI"""

    key = models.CharField("Ключ настройки", max_length=100, unique=True)
    value = models.TextField("Значение")
    description = models.TextField("Описание", blank=True)
    is_active = models.BooleanField("Активно", default=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Настройка AI"
        verbose_name_plural = "Настройки AI"
        ordering = ["key"]

    def __str__(self):
        return f"{self.key}: {self.value[:50]}..."

    @classmethod
    def get_setting(cls, key, default=None):
        """Получить значение настройки"""
        try:
            setting = cls.objects.get(key=key, is_active=True)
            return setting.value
        except cls.DoesNotExist:
            return default

    @classmethod
    def set_setting(cls, key, value, description=""):
        """Установить значение настройки"""
        setting, created = cls.objects.get_or_create(
            key=key, defaults={"value": value, "description": description}
        )
        if not created:
            setting.value = value
            setting.description = description
            setting.save()
