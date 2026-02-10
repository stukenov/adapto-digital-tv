import os

from django.db import models
from django.utils import timezone


class RemoteServer(models.Model):
    """Конфигурация удаленного сервера"""

    name = models.CharField("Название сервера", max_length=100)
    host = models.CharField("Хост", max_length=255)
    port = models.IntegerField("Порт SSH", default=22)
    username = models.CharField("Пользователь", max_length=100)
    password = models.CharField(
        "Пароль", max_length=255, blank=True, help_text="Или используйте ключ"
    )
    private_key_path = models.CharField(
        "Путь к приватному ключу", max_length=500, blank=True
    )
    remote_directory = models.CharField(
        "Удаленная папка для поиска", max_length=500, default="/media/videos/"
    )
    is_active = models.BooleanField("Активен", default=True)
    connection_timeout = models.IntegerField("Таймаут соединения (сек)", default=30)
    last_connected = models.DateTimeField(
        "Последнее подключение", blank=True, null=True
    )
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Удаленный сервер"
        verbose_name_plural = "Удаленные серверы"

    def __str__(self):
        return f"{self.name} ({self.host})"


class InjestJob(models.Model):
    """Задача импорта файлов"""

    STATUS_CHOICES = [
        ("pending", "Ожидает"),
        ("running", "Выполняется"),
        ("completed", "Завершена"),
        ("failed", "Ошибка"),
        ("paused", "Приостановлена"),
    ]

    server = models.ForeignKey(
        RemoteServer, on_delete=models.CASCADE, verbose_name="Сервер"
    )
    status = models.CharField(
        "Статус", max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    scan_interval = models.IntegerField(
        "Интервал сканирования (сек)", default=300
    )  # 5 минут
    file_extensions = models.CharField(
        "Расширения файлов",
        max_length=200,
        default="mp4,avi,mkv,mov,wmv,flv,webm,m4v,3gp,ts",
        help_text="Через запятую",
    )
    max_concurrent_transfers = models.IntegerField(
        "Макс. одновременных операций", default=3
    )
    is_active = models.BooleanField("Активна", default=True)
    last_run = models.DateTimeField("Последний запуск", blank=True, null=True)
    next_run = models.DateTimeField("Следующий запуск", blank=True, null=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Задача импорта"
        verbose_name_plural = "Задачи импорта"

    def __str__(self):
        return f"Импорт с {self.server.name} - {self.get_status_display()}"

    def get_file_extensions_list(self):
        """Получить список расширений"""
        return [ext.strip().lower() for ext in self.file_extensions.split(",")]

    def schedule_next_run(self):
        """Запланировать следующий запуск"""
        self.next_run = timezone.now() + timezone.timedelta(seconds=self.scan_interval)
        self.save(update_fields=["next_run"])


class FileImportLog(models.Model):
    """Лог импорта файлов"""

    STATUS_CHOICES = [
        ("discovered", "Обнаружен"),
        ("processing", "Обрабатывается"),
        ("imported", "Импортирован"),
        ("renamed", "Переименован"),
        ("failed", "Ошибка"),
        ("skipped", "Пропущен"),
    ]

    job = models.ForeignKey(
        InjestJob,
        on_delete=models.CASCADE,
        related_name="file_logs",
        verbose_name="Задача",
    )
    
    video_file = models.ForeignKey(
        "tvchannels.VideoFile",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name="Видеофайл",
    )
    original_filename = models.CharField("Оригинальное имя файла", max_length=500)
    original_path = models.CharField("Оригинальный путь", max_length=1000)
    new_filename = models.CharField("Новое имя файла", max_length=500, blank=True)
    new_path = models.CharField("Новый путь", max_length=1000, blank=True)
    file_size = models.PositiveBigIntegerField(
        "Размер файла (байты)", blank=True, null=True
    )
    status = models.CharField(
        "Статус", max_length=20, choices=STATUS_CHOICES, default="discovered"
    )
    error_message = models.TextField("Сообщение об ошибке", blank=True)
    processing_time = models.FloatField("Время обработки (сек)", blank=True, null=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Лог импорта файла"
        verbose_name_plural = "Логи импорта файлов"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.original_filename} - {self.get_status_display()}"

    @property
    def filename_without_extension(self):
        """Имя файла без расширения"""
        return os.path.splitext(self.original_filename)[0]

    @property
    def file_extension(self):
        """Расширение файла"""
        return os.path.splitext(self.original_filename)[1].lower().lstrip(".")

    def generate_new_filename(self, video_file_id):
        """Генерировать новое имя файла с ID"""
        name_without_ext = self.filename_without_extension
        extension = self.file_extension
        self.new_filename = f"{name_without_ext}.{video_file_id}.{extension}"
        return self.new_filename
