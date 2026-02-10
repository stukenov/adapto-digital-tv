from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify


class Channel(models.Model):
    name = models.CharField("Название", max_length=255)
    slug = models.SlugField("URL", unique=True, blank=True)
    is_active = models.BooleanField("Активность", default=True)
    logo = models.ImageField(
        "Логотип", upload_to="channel_logos/", blank=True, null=True
    )
    description = models.TextField("Описание", blank=True)
    stream_url = models.URLField("Ссылка на стрим (HLS)", max_length=500)
    sort_order = models.IntegerField(
        "Сортировка",
        default=0,
        help_text=(
            "Чем больше число — тем выше канал; отрицательные значения отправляют канал в конец"
        ),
    )
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Телеканал"
        verbose_name_plural = "Телеканалы"
        ordering = ["-sort_order", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Program(models.Model):
    channel = models.ForeignKey(
        Channel,
        on_delete=models.CASCADE,
        related_name="programs",
        verbose_name="Телеканал",
    )
    name = models.CharField("Название", max_length=255)
    description = models.TextField("Описание", blank=True)
    start_time = models.DateTimeField("Время начала")
    end_time = models.DateTimeField("Время окончания")
    duration = models.DurationField("Длительность", editable=False)

    class Meta:
        verbose_name = "Программа"
        verbose_name_plural = "Программы"
        ordering = ["start_time"]
        indexes = [
            models.Index(fields=["channel", "start_time"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.channel.name})"

    def clean(self):
        if self.start_time and self.end_time:
            if self.start_time >= self.end_time:
                raise ValidationError(
                    "Время начала должно быть раньше времени окончания"
                )

            # Check for overlapping programs on the same channel
            overlapping = Program.objects.filter(
                channel=self.channel,
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
            )
            if self.pk:
                overlapping = overlapping.exclude(pk=self.pk)
            if overlapping.exists():
                raise ValidationError(
                    "Программа пересекается с другими программами на этом канале"
                )

    def save(self, *args, **kwargs):
        if self.start_time and self.end_time:
            self.duration = self.end_time - self.start_time
        super().save(*args, **kwargs)


class VideoFile(models.Model):
    VIDEO_EXTENSIONS = [
        ("mp4", "MP4"),
        ("avi", "AVI"),
        ("mkv", "MKV"),
        ("mov", "MOV"),
        ("wmv", "WMV"),
        ("flv", "FLV"),
        ("webm", "WebM"),
        ("m4v", "M4V"),
        ("3gp", "3GP"),
        ("ts", "TS"),
    ]

    STATUS_CHOICES = [
        ("new", "Новый"),
        ("processed", "Обработан"),
        ("need_add_meta_with_ai", "Требуется добавление метаданных с AI"),
        ("ai_processing", "Обрабатывается AI"),
        ("ai_completed", "AI обработка завершена"),
        ("error", "Ошибка"),
    ]

    name = models.CharField("Название", max_length=255)
    status = models.CharField(
        "Статус", max_length=25, choices=STATUS_CHOICES, default="new"
    )
    file_path = models.CharField("Путь к файлу", max_length=500)
    extension = models.CharField(
        "Расширение (контейнер)", max_length=10, choices=VIDEO_EXTENSIONS
    )
    duration_seconds = models.PositiveIntegerField(
        "Длительность (секунды)", blank=True, null=True
    )
    duration_frames = models.PositiveIntegerField(
        "Длительность (кадры)", blank=True, null=True
    )
    file_size = models.PositiveBigIntegerField(
        "Размер файла (байты)", blank=True, null=True
    )
    video_bitrate = models.PositiveIntegerField(
        "Битрейт видео (kbps)", blank=True, null=True
    )
    audio_bitrate = models.PositiveIntegerField(
        "Битрейт аудио (kbps)", blank=True, null=True
    )
    video_codec = models.CharField("Видеокодек", max_length=50, blank=True)
    audio_codec = models.CharField("Аудиокодек", max_length=50, blank=True)
    resolution_width = models.PositiveIntegerField(
        "Ширина (пиксели)", blank=True, null=True
    )
    resolution_height = models.PositiveIntegerField(
        "Высота (пиксели)", blank=True, null=True
    )
    framerate = models.DecimalField(
        "Частота кадров (fps)", max_digits=6, decimal_places=3, blank=True, null=True
    )
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Видеофайл"
        verbose_name_plural = "Видеофайлы"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["extension"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.name

    @property
    def file_size_mb(self):
        """Размер файла в мегабайтах"""
        if self.file_size is None:
            return 0.0
        return round(self.file_size / (1024 * 1024), 2)

    @property
    def duration_formatted(self):
        """Форматированная длительность HH:MM:SS"""
        if self.duration_seconds is None:
            return "00:00:00"
        hours = self.duration_seconds // 3600
        minutes = (self.duration_seconds % 3600) // 60
        seconds = self.duration_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    @property
    def resolution(self):
        """Разрешение в формате WxH"""
        if self.resolution_width and self.resolution_height:
            return f"{self.resolution_width}x{self.resolution_height}"
        return "Неизвестно"


class VideoMetadata(models.Model):
    VIDEO_CATEGORIES = [
        ("series", "Сериалы"),
        ("shows", "Передачи"),
        ("movies", "Фильмы"),
        ("documentaries", "Документальные фильмы"),
        ("news", "Новости"),
        ("sports", "Спорт"),
        ("entertainment", "Развлекательные"),
        ("educational", "Образовательные"),
        ("children", "Детские"),
        ("music", "Музыкальные"),
        ("other", "Прочее"),
    ]

    AGE_RATINGS = [
        ("0+", "0+"),
        ("6+", "6+"),
        ("12+", "12+"),
        ("16+", "16+"),
        ("18+", "18+"),
    ]

    LANGUAGES = [
        ("kk", "Казахский"),
        ("ru", "Русский"),
        ("en", "Английский"),
        ("zh", "Китайский"),
        ("tr", "Турецкий"),
        ("fr", "Французский"),
        ("de", "Немецкий"),
        ("es", "Испанский"),
        ("other", "Другой"),
    ]

    video_file = models.OneToOneField(
        VideoFile,
        on_delete=models.CASCADE,
        related_name="metadata",
        verbose_name="Видеофайл",
    )
    original_title = models.CharField(
        "Оригинальное название", max_length=255, blank=True
    )
    series_name = models.CharField("Название серии/эпизода", max_length=255, blank=True)
    season_number = models.PositiveIntegerField("Номер сезона", blank=True, null=True)
    episode_number = models.PositiveIntegerField("Номер эпизода", blank=True, null=True)
    category = models.CharField(
        "Категория", max_length=20, choices=VIDEO_CATEGORIES, default="other"
    )
    age_rating = models.CharField(
        "Возрастной ценз", max_length=3, choices=AGE_RATINGS, blank=True
    )
    language = models.CharField("Язык", max_length=10, choices=LANGUAGES, default="kk")
    description = models.TextField("Описание", blank=True)
    director = models.CharField("Режиссер", max_length=255, blank=True)
    actors = models.TextField("Актеры", blank=True, help_text="Через запятую")
    year = models.PositiveIntegerField("Год выпуска", blank=True, null=True)
    country = models.CharField("Страна производства", max_length=100, blank=True)
    tags = models.CharField(
        "Теги", max_length=500, blank=True, help_text="Через запятую"
    )
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Метаданные видео"
        verbose_name_plural = "Метаданные видео"
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["language"]),
            models.Index(fields=["age_rating"]),
            models.Index(fields=["year"]),
        ]

    def __str__(self):
        title = self.original_title or self.video_file.name
        if self.series_name:
            if self.season_number and self.episode_number:
                return (
                    f"{title} - {self.series_name} "
                    f"(S{self.season_number:02d}E{self.episode_number:02d})"
                )
            else:
                return f"{title} - {self.series_name}"
        return title

    @property
    def display_title(self):
        """Отображаемое название с учетом серии"""
        return str(self)
