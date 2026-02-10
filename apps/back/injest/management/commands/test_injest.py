import logging
import sys

from django.core.management.base import BaseCommand, CommandError

from injest.models import InjestJob
from injest.services import FileImportService

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("injest_test.log"),
        logging.StreamHandler(sys.stdout),
    ],
)


class Command(BaseCommand):
    help = "Тестовый запуск одной задачи импорта"

    def add_arguments(self, parser):
        parser.add_argument(
            "job_id", type=int, help="ID задачи импорта для тестирования"
        )
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Подробный вывод",
        )

    def handle(self, *args, **options):
        job_id = options["job_id"]
        verbose = options["verbose"]

        if verbose:
            logging.getLogger("injest").setLevel(logging.DEBUG)

        try:
            job = InjestJob.objects.get(id=job_id)
        except InjestJob.DoesNotExist:
            raise CommandError(f"Задача с ID {job_id} не найдена")

        self.stdout.write(self.style.SUCCESS(f"Запуск тестирования задачи: {job}"))

        try:
            service = FileImportService(job)
            stats = service.process_files()

            self.stdout.write(self.style.SUCCESS("Тестирование завершено успешно!"))
            self.stdout.write(f"Статистика:")
            for key, value in stats.items():
                self.stdout.write(f"  {key}: {value}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Ошибка при тестировании: {e}"))
            if verbose:
                import traceback

                self.stdout.write(traceback.format_exc())
