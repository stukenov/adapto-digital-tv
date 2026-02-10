from django.core.management.base import BaseCommand
from django.db.models import Count

from tvchannels.models import VideoFile


class Command(BaseCommand):
    help = "Показать статистику по статусам видеофайлов"

    def add_arguments(self, parser):
        parser.add_argument(
            "--status", type=str, help="Показать детали для конкретного статуса"
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=10,
            help="Ограничение на количество показываемых видео (по умолчанию: 10)",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("📊 Статистика видеофайлов\n"))

        # Общая статистика по статусам
        status_stats = (
            VideoFile.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )

        total_videos = VideoFile.objects.count()

        self.stdout.write("📈 Общая статистика:")
        self.stdout.write(f"   Всего видео: {total_videos}")
        self.stdout.write("")

        # Эмодзи для статусов
        status_icons = {
            "new": "⚪",
            "processed": "✅",
            "need_add_meta_with_ai": "⏳",
            "ai_processing": "🔄",
            "ai_completed": "✅",
            "error": "❌",
        }

        for stat in status_stats:
            status = stat["status"]
            count = stat["count"]
            percentage = (count / total_videos * 100) if total_videos > 0 else 0
            icon = status_icons.get(status, "❓")

            # Получаем человеко-читаемое название статуса
            try:
                video = VideoFile.objects.filter(status=status).first()
                display_name = video.get_status_display() if video else status
            except BaseException:
                display_name = status

            self.stdout.write(f"   {icon} {display_name}: {count} ({percentage:.1f}%)")

        # Детали для конкретного статуса
        if options["status"]:
            self._show_status_details(options["status"], options["limit"])
        else:
            # Показываем видео, требующие внимания
            self._show_attention_needed(options["limit"])

    def _show_status_details(self, status, limit):
        """Показать детали для конкретного статуса"""
        videos = VideoFile.objects.filter(status=status).order_by("-created_at")[:limit]

        if not videos.exists():
            self.stdout.write(f'\n❌ Нет видео со статусом "{status}"')
            return

        try:
            display_name = videos.first().get_status_display()
        except BaseException:
            display_name = status

        self.stdout.write(f'\n📋 Видео со статусом "{display_name}":')

        for video in videos:
            # Проверяем наличие метаданных
            has_metadata = hasattr(video, "metadata") and video.metadata
            title = ""
            if has_metadata and video.metadata.original_title:
                title = f" (AI: {video.metadata.original_title[:30]}...)"

            self.stdout.write(f"   • {video.name}{title}")
            self.stdout.write(f"     Путь: {video.file_path}")
            self.stdout.write(
                f'     Создан: {video.created_at.strftime("%Y-%m-%d %H:%M")}'
            )
            self.stdout.write("")

    def _show_attention_needed(self, limit):
        """Показать видео, требующие внимания"""
        self.stdout.write("\n🔍 Видео, требующие внимания:")

        # Видео, требующие AI обработки
        need_ai = VideoFile.objects.filter(status="need_add_meta_with_ai").count()
        if need_ai > 0:
            self.stdout.write(f"   ⏳ Требуют AI обработки: {need_ai}")
            if need_ai <= 5:
                for video in VideoFile.objects.filter(status="need_add_meta_with_ai")[
                    :5
                ]:
                    self.stdout.write(f"      • {video.name}")

        # Видео с ошибками
        errors = VideoFile.objects.filter(status="error").count()
        if errors > 0:
            self.stdout.write(f"   ❌ С ошибками: {errors}")
            if errors <= 5:
                for video in VideoFile.objects.filter(status="error")[:5]:
                    self.stdout.write(f"      • {video.name}")

        # Видео без метаданных
        no_metadata = VideoFile.objects.filter(metadata__isnull=True).count()
        if no_metadata > 0:
            self.stdout.write(f"   📝 Без метаданных: {no_metadata}")

        # Видео без AI названий
        no_titles = (
            VideoFile.objects.filter(
                metadata__isnull=False, metadata__original_title__isnull=True
            ).count()
            + VideoFile.objects.filter(
                metadata__isnull=False, metadata__original_title=""
            ).count()
        )

        if no_titles > 0:
            self.stdout.write(f"   🏷️  Без AI названий: {no_titles}")

        if need_ai == 0 and errors == 0:
            self.stdout.write("   ✅ Нет видео, требующих немедленного внимания!")

        self.stdout.write("\n💡 Совет:")
        if need_ai > 0:
            self.stdout.write("   Запустите: python manage.py process_ai_metadata")
        if errors > 0:
            self.stdout.write(
                "   Проверьте ошибки: python manage.py video_status --status error"
            )
        if need_ai == 0 and errors == 0:
            self.stdout.write("   Все видео обработаны корректно!")
