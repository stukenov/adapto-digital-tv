import os

from django.core.management.base import BaseCommand
from django.utils import timezone

from tvchannels.models import Channel, VideoFile


class Command(BaseCommand):
    help = "Создать тестовое видео для демонстрации AI обработки"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=1,
            help="Количество тестовых видео для создания (по умолчанию: 1)",
        )
        parser.add_argument(
            "--channel-name",
            type=str,
            default="Test Channel",
            help="Название канала",
        )

    def handle(self, *args, **options):
        self.stdout.write("Создание тестовых видео для AI обработки...")

        # Создаем или получаем канал
        channel, created = Channel.objects.get_or_create(
            name=options["channel_name"],
            defaults={
                "description": "Тестовый канал для демонстрации",
                "is_active": True,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"✓ Создан канал: {channel}"))
        else:
            self.stdout.write(f"Канал уже существует: {channel}")

        # Создаем тестовые видео
        created_videos = []
        for i in range(options["count"]):
            # FIX: keep f-string on one line
            video_name = (
                f"test_video_{i + 1}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.mp4"
            )

            video, created = VideoFile.objects.get_or_create(
                filename=video_name,
                defaults={
                    "channel": channel,
                    "file_path": f"/app/media/test/{video_name}",
                    "file_size": 1024 * 1024,  # 1MB
                    "duration_seconds": 120,  # 2 минуты
                    "status": "need_add_meta_with_ai",  # Статус для AI обработки
                    "created_at": timezone.now(),
                },
            )

            if created:
                created_videos.append(video)
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Создано видео: {video.filename}")
                )
            else:
                self.stdout.write(f"Видео уже существует: {video.filename}")

        # Показываем статистику
        total_ai_videos = VideoFile.objects.filter(
            status="need_add_meta_with_ai"
        ).count()

        self.stdout.write(
            self.style.SUCCESS(f"\n✓ Создано {len(created_videos)} новых видео")
        )
        self.stdout.write(
            f"Всего видео со статусом 'need_add_meta_with_ai': {total_ai_videos}"
        )
        self.stdout.write(
            "AI processor должен подхватить эти видео в течение 30 секунд!"
        )

        if created_videos:
            self.stdout.write("\nДля удаления тестовых видео:")
            video_ids = [str(v.id) for v in created_videos]
            ids_joined = ",".join(video_ids)
            cmd = (
                'python manage.py shell -c "from tvchannels.models import VideoFile; '
                f'VideoFile.objects.filter(id__in=[{ids_joined}]).delete()"'
            )
            self.stdout.write(cmd)
