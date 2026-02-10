import logging
import signal
import sys
import time

from django.conf import settings
from django.core.management.base import BaseCommand

from injest.services import scheduler

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("injest.log"), logging.StreamHandler(sys.stdout)],
)


class Command(BaseCommand):
    help = "Запуск планировщика импорта видеофайлов"

    def add_arguments(self, parser):
        parser.add_argument(
            "--daemon",
            action="store_true",
            help="Запустить в режиме демона",
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS("Запуск планировщика импорта видеофайлов...")
        )

        # Обработчик сигналов для корректного завершения
        def signal_handler(signum, frame):
            self.stdout.write(
                self.style.WARNING(
                    "Получен сигнал завершения. Остановка планировщика..."
                )
            )
            scheduler.stop()
            sys.exit(0)

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        try:
            # Запускаем планировщик
            scheduler.start()

            if options["daemon"]:
                self.stdout.write(
                    self.style.SUCCESS("Планировщик запущен в режиме демона")
                )
                # В режиме демона используем бесконечный цикл с небольшой
                # задержкой
                try:
                    while scheduler.running:
                        time.sleep(1)
                except KeyboardInterrupt:
                    pass
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        "Планировщик запущен. Нажмите Ctrl+C для остановки"
                    )
                )
                # В интерактивном режиме ждем ввода
                try:
                    input()
                except KeyboardInterrupt:
                    pass

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Ошибка при запуске планировщика: {e}"))
        finally:
            scheduler.stop()
            self.stdout.write(self.style.SUCCESS("Планировщик остановлен"))
