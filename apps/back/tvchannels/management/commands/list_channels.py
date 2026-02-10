from django.core.management.base import BaseCommand
from tvchannels.models import Channel


class Command(BaseCommand):
    help = "Показать список всех доступных телеканалов"

    def add_arguments(self, parser):
        parser.add_argument(
            "--show-details",
            action="store_true",
            help="Показать подробную информацию о каналах"
        )

    def handle(self, *args, **options):
        show_details = options['show_details']
        
        try:
            channels = Channel.objects.all().order_by('id')
            
            if not channels.exists():
                self.stdout.write(
                    self.style.WARNING("❌ Каналы не найдены в базе данных")
                )
                return
            
            self.stdout.write(
                self.style.SUCCESS(f"📺 Найдено каналов: {channels.count()}")
            )
            self.stdout.write("=" * 80)
            
            for channel in channels:
                # Основная информация
                self.stdout.write(
                    f"🆔 ID: {channel.id} | "
                    f"📛 Название: {channel.name} | "
                    f"🔗 Slug: {channel.slug}"
                )
                
                if show_details:
                    self.stdout.write(f"   ✅ Активен: {channel.is_active}")
                    self.stdout.write(f"   📊 Сортировка: {getattr(channel, 'sort_order', 'N/A')}")
                    if channel.description:
                        self.stdout.write(f"   📝 Описание: {channel.description[:100]}...")
                    if channel.stream_url:
                        self.stdout.write(f"   🎥 Стрим URL: {channel.stream_url}")
                    
                    # Количество программ
                    program_count = channel.programs.count()
                    self.stdout.write(f"   📋 Программ: {program_count}")
                    
                    self.stdout.write("-" * 60)
            
            self.stdout.write("\n💡 Примеры использования:")
            for channel in channels[:3]:  # Показываем первые 3 канала как примеры
                self.stdout.write(
                    f"   python manage.py import_json_programs --channel-id {channel.id} ..."
                )
                self.stdout.write(
                    f"   python manage.py import_json_programs --channel-slug \"{channel.slug}\" ..."
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Ошибка при получении каналов: {str(e)}")
            )
            raise e
