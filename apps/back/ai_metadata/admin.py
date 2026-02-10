from django.contrib import admin
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import AIProcessingLog, AIProvider, AIRequest, AISettings, AITask


@admin.register(AIProvider)
class AIProviderAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "provider_type",
        "default_model",
        "is_active",
        "is_default",
        "max_tokens",
        "temperature",
        "updated_at",
    ]
    list_filter = ["provider_type", "is_active", "is_default", "created_at"]
    search_fields = ["name", "description", "default_model"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (
            "Основная информация",
            {"fields": ("name", "provider_type", "is_active", "is_default")},
        ),
        (
            "Настройки API",
            {"fields": ("api_key", "api_url", "timeout"), "classes": ("collapse",)},
        ),
        (
            "Модели и параметры",
            {
                "fields": (
                    "default_model",
                    "available_models",
                    "max_tokens",
                    "temperature",
                )
            },
        ),
        ("Описание", {"fields": ("description",), "classes": ("collapse",)}),
        (
            "Временные метки",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # Скрываем API ключ в форме
        if "api_key" in form.base_fields:
            form.base_fields["api_key"].widget.attrs["type"] = "password"
        return form


@admin.register(AITask)
class AITaskAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "task_type",
        "provider_link",
        "model_name",
        "is_active",
        "is_default_for_type",
        "priority",
        "retry_count",
        "updated_at",
    ]
    list_filter = [
        "task_type",
        "is_active",
        "is_default_for_type",
        "provider",
        "created_at",
    ]
    search_fields = ["name", "description", "system_prompt", "user_prompt_template"]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["provider"]

    fieldsets = (
        (
            "Основная информация",
            {
                "fields": (
                    "name",
                    "task_type",
                    "is_active",
                    "is_default_for_type",
                    "priority",
                )
            },
        ),
        ("Провайдер и модель", {"fields": ("provider", "model_name")}),
        (
            "Промпты",
            {"fields": ("system_prompt", "user_prompt_template"), "classes": ("wide",)},
        ),
        (
            "Параметры обработки",
            {
                "fields": (
                    "max_tokens",
                    "temperature",
                    "response_format",
                    "retry_count",
                ),
                "classes": ("collapse",),
            },
        ),
        ("Валидация", {"fields": ("validation_rules",), "classes": ("collapse",)}),
        ("Описание", {"fields": ("description",), "classes": ("collapse",)}),
        (
            "Временные метки",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def provider_link(self, obj):
        if obj.provider:
            url = reverse("admin:ai_metadata_aiprovider_change", args=[obj.provider.pk])
            return format_html('<a href="{}">{}</a>', url, obj.provider.name)
        return "По умолчанию"

    provider_link.short_description = "Провайдер"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("provider")


@admin.register(AIRequest)
class AIRequestAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "video_file_link",
        "task_link",
        "provider_link",
        "model_used",
        "status_badge",
        "tokens_used",
        "execution_time",
        "retry_count",
        "created_at",
        "processed_at",
        "response_preview",
    ]
    list_filter = [
        "status",
        "task__task_type",
        "provider",
        "created_at",
        "processed_at",
    ]
    search_fields = ["video_file__name", "response", "task__name"]
    readonly_fields = ["created_at", "updated_at", "processed_at"]
    raw_id_fields = ["video_file", "task", "provider"]

    fieldsets = (
        (
            "Основная информация",
            {"fields": ("video_file", "task", "provider", "model_used", "status")},
        ),
        (
            "Запросы",
            {"fields": ("system_prompt", "user_prompt"), "classes": ("collapse",)},
        ),
        ("Ответ", {"fields": ("response", "error_message"), "classes": ("collapse",)}),
        (
            "Метрики",
            {
                "fields": ("tokens_used", "cost", "execution_time", "retry_count"),
                "classes": ("collapse",),
            },
        ),
        (
            "Временные метки",
            {
                "fields": ("created_at", "updated_at", "processed_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def video_file_link(self, obj):
        if obj.video_file:
            url = reverse("admin:tvchannels_videofile_change", args=[obj.video_file.pk])
            return format_html('<a href="{}">{}</a>', url, obj.video_file.name)
        return "-"

    video_file_link.short_description = "Видеофайл"

    def task_link(self, obj):
        if obj.task:
            url = reverse("admin:ai_metadata_aitask_change", args=[obj.task.pk])
            return format_html('<a href="{}">{}</a>', url, obj.task.name)
        return "-"

    task_link.short_description = "Задача"

    def provider_link(self, obj):
        if obj.provider:
            url = reverse("admin:ai_metadata_aiprovider_change", args=[obj.provider.pk])
            return format_html('<a href="{}">{}</a>', url, obj.provider.name)
        return "-"

    provider_link.short_description = "Провайдер"

    def status_badge(self, obj):
        colors = {
            "pending": "#ffc107",  # Желтый
            "processing": "#007bff",  # Синий
            "completed": "#28a745",  # Зеленый
            "failed": "#dc3545",  # Красный
        }
        color = colors.get(obj.status, "#6c757d")
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Статус"

    def response_preview(self, obj):
        if obj.response:
            preview = (
                obj.response[:50] + "..." if len(obj.response) > 50 else obj.response
            )
            return format_html('<span title="{}">{}</span>', obj.response, preview)
        return "-"

    response_preview.short_description = "Ответ (превью)"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("video_file", "task", "provider")
        )


class AIProcessingLogInline(admin.TabularInline):
    model = AIProcessingLog
    extra = 0
    readonly_fields = ["created_at"]
    fields = ["level", "message", "created_at"]

    def get_queryset(self, request):
        return super().get_queryset(request).order_by("-created_at")


@admin.register(AIProcessingLog)
class AIProcessingLogAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "video_file_link",
        "ai_request_link",
        "level_badge",
        "message_preview",
        "created_at",
    ]
    list_filter = ["level", "created_at"]
    search_fields = ["message", "video_file__name"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["ai_request", "video_file"]

    fieldsets = (
        ("Основная информация", {"fields": ("video_file", "ai_request", "level")}),
        ("Сообщение", {"fields": ("message",)}),
        ("Детали", {"fields": ("details",), "classes": ("collapse",)}),
        ("Временные метки", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    def video_file_link(self, obj):
        if obj.video_file:
            url = reverse("admin:tvchannels_videofile_change", args=[obj.video_file.pk])
            return format_html('<a href="{}">{}</a>', url, obj.video_file.name)
        return "-"

    video_file_link.short_description = "Видеофайл"

    def ai_request_link(self, obj):
        if obj.ai_request:
            url = reverse(
                "admin:ai_metadata_airequest_change", args=[obj.ai_request.pk]
            )
            return format_html('<a href="{}">Запрос #{}</a>', url, obj.ai_request.pk)
        return "-"

    ai_request_link.short_description = "AI Запрос"

    def level_badge(self, obj):
        colors = {
            "info": "#17a2b8",  # Голубой
            "warning": "#ffc107",  # Желтый
            "error": "#dc3545",  # Красный
            "debug": "#6c757d",  # Серый
        }
        color = colors.get(obj.level, "#6c757d")
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_level_display(),
        )

    level_badge.short_description = "Уровень"

    def message_preview(self, obj):
        preview = obj.message[:80] + "..." if len(obj.message) > 80 else obj.message
        return format_html('<span title="{}">{}</span>', obj.message, preview)

    message_preview.short_description = "Сообщение"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("video_file", "ai_request")


@admin.register(AISettings)
class AISettingsAdmin(admin.ModelAdmin):
    list_display = ["key", "value_preview", "is_active", "updated_at"]
    list_filter = ["is_active", "created_at", "updated_at"]
    search_fields = ["key", "value", "description"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("Основная информация", {"fields": ("key", "value", "is_active")}),
        ("Описание", {"fields": ("description",)}),
        (
            "Временные метки",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def value_preview(self, obj):
        # Скрываем чувствительную информацию
        if (
            "key" in obj.key.lower()
            or "password" in obj.key.lower()
            or "secret" in obj.key.lower()
        ):
            return "*** скрыто ***"

        preview = obj.value[:50] + "..." if len(obj.value) > 50 else obj.value
        return format_html('<span title="{}">{}</span>', obj.value, preview)

    value_preview.short_description = "Значение"


# Добавляем инлайн логов в админку AI запросов
AIRequestAdmin.inlines = [AIProcessingLogInline]
