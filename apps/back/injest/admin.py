from django.contrib import admin, messages
from django.urls import reverse, path
from django.utils import timezone
from django.utils.html import format_html
from django.shortcuts import redirect
import time

from .models import FileImportLog, InjestJob, RemoteServer


@admin.register(RemoteServer)
class RemoteServerAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "host",
        "port",
        "username",
        "is_active",
        "last_connected",
        "connection_status",
    ]
    list_filter = ["is_active", "last_connected"]
    search_fields = ["name", "host", "username"]
    readonly_fields = [
        "last_connected",
        "created_at",
        "updated_at",
        "test_connection_button",
    ]
    actions = ["test_connections"]

    fieldsets = (
        (
            "Основная информация",
            {"fields": ("name", "host", "port", "remote_directory", "is_active")},
        ),
        (
            "Аутентификация",
            {
                "fields": ("username", "password", "private_key_path"),
                "description": "Используйте либо пароль, либо приватный ключ",
            },
        ),
        ("Настройки", {"fields": ("connection_timeout",)}),
        (
            "Системная информация",
            {
                "fields": (
                    "last_connected",
                    "created_at",
                    "updated_at",
                    "test_connection_button",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def connection_status(self, obj):
        if obj.last_connected:
            time_diff = timezone.now() - obj.last_connected
            if time_diff.total_seconds() < 3600:  # меньше часа
                return format_html('<span style="color: green;">✓ Недавно</span>')
            elif time_diff.total_seconds() < 86400:  # меньше дня
                return format_html('<span style="color: orange;">⚠ Давно</span>')
        return format_html('<span style="color: red;">✗ Никогда</span>')

    connection_status.short_description = "Статус подключения"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "<path:object_id>/test-connection/",
                self.admin_site.admin_view(self.test_connection_view),
                name="injest_remoteserver_test_connection",
            ),
        ]
        return custom_urls + urls

    def test_connection_button(self, obj):
        if not obj or not obj.pk:
            return "Доступно после сохранения"
        url = reverse(
            "admin:injest_remoteserver_test_connection", args=[obj.pk]
        )
        return format_html(
            '<a class="button" href="{}">Проверить соединение</a>', url
        )

    test_connection_button.short_description = "Проверка соединения"

    def test_connection_view(self, request, object_id, *args, **kwargs):
        from .services import SSHService, SSHConnectionError

        obj = self.get_object(request, object_id)
        if obj is None:
            messages.error(request, "Объект не найден")
            return redirect("admin:injest_remoteserver_changelist")

        if not self.has_change_permission(request, obj):
            messages.error(request, "Недостаточно прав для выполнения операции")
            return redirect("admin:injest_remoteserver_change", object_id)

        service = SSHService(obj)
        try:
            start = time.time()
            connected = service.connect()
            elapsed_ms = int((time.time() - start) * 1000)
            if connected:
                messages.success(
                    request,
                    f"Успешное подключение к {obj.host}:{obj.port} за {elapsed_ms} мс",
                )
            else:
                messages.error(request, f"Не удалось подключиться к {obj.host}")
        except SSHConnectionError as e:
            messages.error(request, f"Ошибка подключения: {e}")
        except Exception as e:  # на случай любых неожиданных ошибок
            messages.error(request, f"Непредвиденная ошибка: {e}")
        finally:
            try:
                service.disconnect()
            except Exception:
                pass

        return redirect("admin:injest_remoteserver_change", object_id)

    def test_connections(self, request, queryset):
        from .services import SSHService

        success = 0
        failed = 0
        for server in queryset:
            service = SSHService(server)
            try:
                service.connect()
                success += 1
            except Exception as e:
                failed += 1
            finally:
                try:
                    service.disconnect()
                except Exception:
                    pass

        if success:
            messages.success(request, f"Успешно: {success}")
        if failed:
            messages.error(request, f"С ошибкой: {failed}")

    test_connections.short_description = "Проверить соединение для выбранных серверов"


@admin.register(InjestJob)
class InjestJobAdmin(admin.ModelAdmin):
    list_display = [
        "server",
        "status",
        "scan_interval_display",
        "is_active",
        "last_run",
        "next_run",
        "files_count",
    ]
    list_filter = ["status", "is_active", "server"]
    search_fields = ["server__name", "server__host"]
    readonly_fields = ["last_run", "next_run", "created_at", "updated_at"]
    actions = ["start_jobs", "pause_jobs", "schedule_now"]

    fieldsets = (
        ("Основная информация", {"fields": ("server", "status", "is_active")}),
        (
            "Настройки сканирования",
            {
                "fields": (
                    "scan_interval",
                    "file_extensions",
                    "max_concurrent_transfers",
                )
            },
        ),
        ("Планировщик", {"fields": ("last_run", "next_run"), "classes": ("collapse",)}),
        (
            "Системная информация",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def scan_interval_display(self, obj):
        minutes = obj.scan_interval // 60
        seconds = obj.scan_interval % 60
        if minutes > 0:
            return f"{minutes}м {seconds}с"
        return f"{seconds}с"

    scan_interval_display.short_description = "Интервал"

    def files_count(self, obj):
        count = obj.file_logs.count()
        if count > 0:
            url = (
                reverse("admin:injest_fileimportlog_changelist")
                + f"?job__id__exact={obj.id}"
            )
            return format_html('<a href="{}">{} файлов</a>', url, count)
        return "0 файлов"

    files_count.short_description = "Файлы"

    def start_jobs(self, request, queryset):
        updated = queryset.update(status="pending", is_active=True)
        self.message_user(request, f"Запущено {updated} задач.")

    start_jobs.short_description = "Запустить выбранные задачи"

    def pause_jobs(self, request, queryset):
        updated = queryset.update(status="paused", is_active=False)
        self.message_user(request, f"Приостановлено {updated} задач.")

    pause_jobs.short_description = "Приостановить выбранные задачи"

    def schedule_now(self, request, queryset):
        now = timezone.now()
        updated = queryset.update(next_run=now)
        self.message_user(
            request, f"Запланировано к немедленному выполнению {updated} задач."
        )

    schedule_now.short_description = "Запланировать к выполнению сейчас"


@admin.register(FileImportLog)
class FileImportLogAdmin(admin.ModelAdmin):
    list_display = [
        "original_filename",
        "status",
        "job",
        "file_size_display",
        "video_file_link",
        "processing_time",
        "created_at",
    ]
    list_filter = ["status", "job", "created_at"]
    search_fields = ["original_filename", "new_filename", "original_path"]
    readonly_fields = [
        "video_file_link",
        "file_size_display",
        "processing_time",
        "created_at",
        "updated_at",
    ]

    fieldsets = (
        (
            "Информация о файле",
            {
                "fields": (
                    "job",
                    "original_filename",
                    "original_path",
                    "file_size",
                    "file_size_display",
                )
            },
        ),
        (
            "Результат обработки",
            {
                "fields": (
                    "status",
                    "video_file",
                    "video_file_link",
                    "new_filename",
                    "new_path",
                )
            },
        ),
        (
            "Диагностика",
            {"fields": ("error_message", "processing_time"), "classes": ("collapse",)},
        ),
        (
            "Системная информация",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def file_size_display(self, obj):
        if obj.file_size:
            size_mb = obj.file_size / (1024 * 1024)
            if size_mb >= 1024:
                return f"{size_mb / 1024:.1f} ГБ"
            else:
                return f"{size_mb:.1f} МБ"
        return "Неизвестно"

    file_size_display.short_description = "Размер файла"

    def video_file_link(self, obj):
        if obj.video_file:
            url = reverse("admin:tvchannels_videofile_change", args=[obj.video_file.id])
            return format_html('<a href="{}">Видеофайл #{}</a>', url, obj.video_file.id)
        return "Не создан"

    video_file_link.short_description = "Ссылка на видеофайл"
