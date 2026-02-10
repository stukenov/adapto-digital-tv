from django.core.management.base import BaseCommand
from tvchannels.models import Channel


class Command(BaseCommand):
    help = "Создать тестовый канал для отладки импорта программ"

    def add_arguments(self, parser):
        parser.add_argument(
            "--name",
            type=str,
            default="Тестовый канал",
            help="Название канала (по умолчанию: 'Тестовый канал')"
        )
        parser.add_argument(
            "--slug",
            type=str,
            default="test-channel",
            help="Slug канала (по умолчанию: 'test-channel')"
        )
        parser.add_argument(
            "--stream-url",
            type=str,
            default="https://example.com/stream.m3u8",
            help="URL стрима (по умолчанию: https://example.com/stream.m3u8)"
        )

    def handle(self, *args, **options):
        name = options['name']
        slug = options['slug']
        stream_url = options['stream_url']
        
        try:
            # Проверяем, существует ли уже канал с таким slug
            existing_channel = Channel.objects.filter(slug=slug).first()
            if existing_channel:
                self.stdout.write(
                    self.style.WARNING(
                        f"⚠️ Канал с slug '{slug}' уже существует: "
                        f"{existing_channel.name} (ID: {existing_channel.id})"
                    )
                )
                return
            
            # Создаем новый канал
            channel = Channel.objects.create(
                name=name,
                slug=slug,
                stream_url=stream_url,
                is_active=True,
                description=f"Тестовый канал для отладки импорта программ",
                sort_order=1
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ Тестовый канал успешно создан!\n"
                    f"   ID: {channel.id}\n"
                    f"   Название: {channel.name}\n"
                    f"   Slug: {channel.slug}\n"
                    f"   Stream URL: {channel.stream_url}"
                )
            )
            
            self.stdout.write("\n💡 Теперь можно тестировать импорт:")
            self.stdout.write(
                f"   python manage.py import_json_programs --channel-id {channel.id} ..."
            )
            self.stdout.write(
                f"   python manage.py import_json_programs --channel-slug \"{channel.slug}\" ..."
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Ошибка при создании канала: {str(e)}")
            )
            raise e
