from django.contrib import admin, messages
from django.db.models import Q
from django.utils.html import format_html

from .models import Channel, Program, VideoFile, VideoMetadata

# Импортируем AI модели для действий
try:
    from ai_metadata.models import AITask
    from ai_metadata.services import VideoMetadataProcessor

    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ["name", "sort_order", "display_logo", "is_active", "stream_url"]
    list_filter = ["is_active"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-sort_order", "name"]

    def display_logo(self, obj):
        if obj.logo:
            return format_html('<img src="{}" width="50" height="50" />', obj.logo.url)
        return "Нет логотипа"

    display_logo.short_description = "Логотип"


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ["name", "channel", "start_time", "end_time", "duration"]
    list_filter = ["channel", "start_time"]
    search_fields = ["name", "description", "channel__name"]
    readonly_fields = ["duration"]
    date_hierarchy = "start_time"
    # Changed from created_at to start_time since created_at field doesn't
    # exist
    ordering = ["-start_time"]

    fieldsets = (
        (None, {"fields": ("channel", "name", "description")}),
        ("Время", {"fields": ("start_time", "end_time", "duration")}),
    )


class VideoMetadataInline(admin.StackedInline):
    model = VideoMetadata
    extra = 0
    fields = (
        "original_title",
        ("category", "age_rating", "language"),
        ("series_name", "season_number", "episode_number"),
        "description",
        ("director", "year", "country"),
        "actors",
        "tags",
        "is_active",
    )


# Создаем inline только если AI доступен
if AI_AVAILABLE:
    from ai_metadata.models import AIRequest

    class AIRequestInline(admin.TabularInline):
        """Inline для AI запросов"""

        model = AIRequest
        extra = 0
        readonly_fields = [
            "task",
            "provider",
            "status",
            "created_at",
            "processed_at",
            "response_preview",
        ]
        fields = ["task", "provider", "status", "response_preview", "created_at"]
        can_delete = False

        def response_preview(self, obj):
            if obj.response:
                preview = (
                    obj.response[:80] + "..."
                    if len(obj.response) > 80
                    else obj.response
                )
                return format_html('<span title="{}">{}</span>', obj.response, preview)
            return "-"

        response_preview.short_description = "Ответ AI"

        def get_queryset(self, request):
            return (
                super()
                .get_queryset(request)
                .select_related("task", "provider")
                .order_by("-created_at")
            )

else:

    class AIRequestInline:
        """Заглушка для случая, когда AI недоступен"""

        pass


class AIStatusFilter(admin.SimpleListFilter):
    """Фильтр по статусу AI обработки"""

    title = "Статус AI обработки"
    parameter_name = "ai_status"

    def lookups(self, request, model_admin):
        return (
            ("need_ai", "Требуется AI обработка"),
            ("processing", "Обрабатывается AI"),
            ("completed", "AI обработка завершена"),
            ("no_metadata", "Без метаданных"),
            ("empty_title", "Пустое название"),
            ("error", "Ошибки обработки"),
        )

    def queryset(self, request, queryset):
        if self.value() == "need_ai":
            return queryset.filter(status="need_add_meta_with_ai")
        elif self.value() == "processing":
            return queryset.filter(status="ai_processing")
        elif self.value() == "completed":
            return queryset.filter(status="ai_completed")
        elif self.value() == "no_metadata":
            return queryset.filter(metadata__isnull=True)
        elif self.value() == "empty_title":
            return queryset.filter(
                Q(metadata__original_title="")
                | Q(metadata__original_title__isnull=True)
            )
        elif self.value() == "error":
            return queryset.filter(status="error")
        return queryset


@admin.register(VideoFile)
class VideoFileAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "status_badge",
        "extension",
        "duration_formatted",
        "file_size_display",
        "resolution",
        "ai_title_preview",
        "video_codec",
        "audio_codec",
        "created_at",
    ]
    list_filter = [
        AIStatusFilter,
        "status",
        "extension",
        "video_codec",
        "audio_codec",
        "created_at",
    ]
    search_fields = ["name", "file_path", "metadata__original_title"]
    readonly_fields = [
        "created_at",
        "updated_at",
        "file_size_display",
        "duration_formatted",
    ]
    inlines = [VideoMetadataInline] + ([AIRequestInline] if AI_AVAILABLE else [])
    # Сортировка: сначала видео, требующие AI обработки, затем по дате создания
    ordering = ["-created_at"]  # Дефолтная сортировка

    # Определяем базовые actions
    actions = ["set_need_ai_processing", "reset_error_status", "mark_as_processed"]

    def get_queryset(self, request):
        """Оптимизированный queryset с предзагрузкой метаданных и кастомной сортировкой"""
        from django.db.models import Case, IntegerField, When

        queryset = super().get_queryset(request).select_related("metadata")

        # Добавляем поле для приоритизации статусов
        queryset = queryset.annotate(
            status_priority=Case(
                When(status="need_add_meta_with_ai", then=1),
                When(status="error", then=2),
                When(status="ai_processing", then=3),
                When(status="new", then=4),
                When(status="processed", then=5),
                When(status="ai_completed", then=6),
                default=7,
                output_field=IntegerField(),
            )
        ).order_by("status_priority", "-created_at")

        return queryset

    def changelist_view(self, request, extra_context=None):
        """Добавляем статистику в changelist"""
        extra_context = extra_context or {}

        if AI_AVAILABLE:
            # Получаем статистику по статусам
            from django.db.models import Count

            status_stats = (
                VideoFile.objects.values("status")
                .annotate(count=Count("id"))
                .order_by("status")
            )

            # Статистика по метаданным
            total_videos = VideoFile.objects.count()
            videos_with_metadata = VideoFile.objects.filter(
                metadata__isnull=False
            ).count()
            videos_with_titles = (
                VideoFile.objects.filter(
                    metadata__isnull=False, metadata__original_title__isnull=False
                )
                .exclude(metadata__original_title="")
                .count()
            )

            extra_context.update(
                {
                    "status_stats": status_stats,
                    "total_videos": total_videos,
                    "videos_with_metadata": videos_with_metadata,
                    "videos_with_titles": videos_with_titles,
                    "ai_available": True,
                }
            )
        else:
            extra_context["ai_available"] = False

        return super().changelist_view(request, extra_context)

    fieldsets = (
        (
            "Основная информация",
            {"fields": ("name", "file_path", "extension", "status")},
        ),
        (
            "Временные характеристики",
            {"fields": ("duration_seconds", "duration_frames", "duration_formatted")},
        ),
        ("Файл", {"fields": ("file_size", "file_size_display")}),
        (
            "Видео",
            {
                "fields": (
                    ("resolution_width", "resolution_height"),
                    "framerate",
                    "video_codec",
                    "video_bitrate",
                )
            },
        ),
        ("Аудио", {"fields": ("audio_codec", "audio_bitrate")}),
        (
            "Системная информация",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def file_size_display(self, obj):
        if obj.file_size:
            return f"{obj.file_size_mb} МБ"
        return "Неизвестно"

    file_size_display.short_description = "Размер файла"

    def status_badge(self, obj):
        """Отображение статуса с цветовыми индикаторами"""
        status_colors = {
            "new": "#6c757d",  # Серый
            "processed": "#28a745",  # Зеленый
            "need_add_meta_with_ai": "#ffc107",  # Желтый
            "ai_processing": "#007bff",  # Синий
            "ai_completed": "#28a745",  # Зеленый
            "error": "#dc3545",  # Красный
        }

        status_icons = {
            "new": "⚪",
            "processed": "✅",
            "need_add_meta_with_ai": "⏳",
            "ai_processing": "🔄",
            "ai_completed": "✅",
            "error": "❌",
        }

        color = status_colors.get(obj.status, "#6c757d")
        icon = status_icons.get(obj.status, "⚪")
        display_text = obj.get_status_display()

        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {}</span>',
            color,
            icon,
            display_text,
        )

    status_badge.short_description = "Статус"

    def ai_title_preview(self, obj):
        """Превью AI-сгенерированного названия"""
        try:
            if hasattr(obj, "metadata") and obj.metadata.original_title:
                title = obj.metadata.original_title
                preview = title[:50] + "..." if len(title) > 50 else title
                return format_html('<span title="{}">{}</span>', title, preview)
            return format_html('<span style="color: #6c757d;">Нет названия</span>')
        except BaseException:
            return format_html('<span style="color: #dc3545;">Ошибка метаданных</span>')

    ai_title_preview.short_description = "AI Название"

    def get_actions(self, request):
        """Динамическое добавление AI действий"""
        actions = super().get_actions(request)

        if AI_AVAILABLE:
            # Добавляем действия для каждой активной AI задачи
            try:
                ai_tasks = AITask.objects.filter(is_active=True).order_by(
                    "task_type", "priority"
                )
                for task in ai_tasks:
                    action_name = f"process_with_task_{task.id}"
                    action_func = self.create_ai_task_action(task)
                    action_func.short_description = f"🤖 Обработать: {task.name}"
                    actions[action_name] = (
                        action_func,
                        action_name,
                        f"🤖 Обработать: {task.name}",
                    )
            except Exception as e:
                pass  # Если возникла ошибка с базой данных, игнорируем

        return actions

    @admin.action(description="⏳ Отметить для AI обработки")
    def set_need_ai_processing(self, request, queryset):
        """Установить статус 'требуется AI обработка'"""
        if not AI_AVAILABLE:
            self.message_user(request, "AI модуль недоступен", messages.ERROR)
            return

        updated = queryset.update(status="need_add_meta_with_ai")
        self.message_user(
            request, f"Помечено для AI обработки: {updated} видео", messages.SUCCESS
        )

    @admin.action(description="🔄 Сбросить ошибки обработки")
    def reset_error_status(self, request, queryset):
        """Сбросить статус ошибки и отметить для повторной обработки"""
        if not AI_AVAILABLE:
            self.message_user(request, "AI модуль недоступен", messages.ERROR)
            return

        error_videos = queryset.filter(status="error")
        updated = error_videos.update(status="need_add_meta_with_ai")
        self.message_user(
            request,
            f"Сброшен статус ошибки для {updated} видео, отмечены для повторной обработки",
            messages.SUCCESS,
        )

    @admin.action(description="✅ Отметить как обработанные")
    def mark_as_processed(self, request, queryset):
        """Отметить видео как обработанные"""
        updated = queryset.update(status="processed")
        self.message_user(
            request, f"Отмечено как обработанные: {updated} видео", messages.SUCCESS
        )

    def create_ai_task_action(self, task):
        """Создать действие для конкретной AI задачи"""

        def ai_task_action(admin_self, request, queryset):
            if not AI_AVAILABLE:
                admin_self.message_user(request, "AI модуль недоступен", messages.ERROR)
                return

            processor = VideoMetadataProcessor()
            processed_count = 0
            errors = []

            for video in queryset[:20]:  # Ограничиваем до 20 видео за раз
                try:
                    # Устанавливаем статус обработки
                    video.status = "ai_processing"
                    video.save()

                    # Обрабатываем через конкретную задачу
                    result = processor.process_single_video(video, task_name=task.name)

                    if result["success"]:
                        # Получаем или создаем метаданные
                        try:
                            metadata = video.metadata
                        except VideoMetadata.DoesNotExist:
                            metadata = VideoMetadata.objects.create(video_file=video)

                        # Сохраняем результат в соответствующее поле
                        if task.task_type == "generate_title":
                            metadata.original_title = result["response"]
                        elif task.task_type == "generate_description":
                            metadata.description = result["response"]
                        elif task.task_type == "extract_keywords":
                            metadata.tags = result["response"]

                        metadata.save()

                        # Обновляем статус видео
                        video.status = "ai_completed"
                        video.save()

                        processed_count += 1
                    else:
                        video.status = "error"
                        video.save()
                        errors.append(f"{video.name}: {result['error']}")

                except Exception as e:
                    video.status = "error"
                    video.save()
                    errors.append(f"{video.name}: {str(e)}")

            # Показываем результаты
            if processed_count > 0:
                admin_self.message_user(
                    request,
                    f'✅ Успешно обработано: {processed_count} видео с задачей "{task.name}"',
                    messages.SUCCESS,
                )

            if errors:
                error_message = (
                    f"❌ Ошибки при обработке ({len(errors)} видео): "
                    + "; ".join(errors[:3])
                )
                if len(errors) > 3:
                    error_message += f" и еще {len(errors) - 3}..."
                admin_self.message_user(request, error_message, messages.ERROR)

            if processed_count == 0 and not errors:
                admin_self.message_user(
                    request,
                    f'ℹ️ Нет видео для обработки с задачей "{task.name}"',
                    messages.INFO,
                )

        # Устанавливаем атрибуты для действия
        ai_task_action.short_description = f"🤖 Обработать: {task.name}"
        ai_task_action.__name__ = f"process_with_task_{task.id}"

        return ai_task_action


@admin.register(VideoMetadata)
class VideoMetadataAdmin(admin.ModelAdmin):
    list_display = [
        "display_title",
        "category",
        "language",
        "age_rating",
        "year",
        "is_active",
        "updated_at",
    ]
    list_filter = [
        "category",
        "language",
        "age_rating",
        "year",
        "is_active",
        "updated_at",
    ]
    search_fields = [
        "original_title",
        "series_name",
        "description",
        "director",
        "actors",
        "tags",
        "video_file__name",
    ]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]

    fieldsets = (
        (
            "Основная информация",
            {"fields": ("video_file", "original_title", "category", "is_active")},
        ),
        (
            "Серии и эпизоды",
            {
                "fields": ("series_name", "season_number", "episode_number"),
                "classes": ("collapse",),
            },
        ),
        ("Классификация", {"fields": ("age_rating", "language", "year", "country")}),
        ("Описание", {"fields": ("description", "director", "actors", "tags")}),
        (
            "Системная информация",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def display_title(self, obj):
        return obj.display_title

    display_title.short_description = "Название"
