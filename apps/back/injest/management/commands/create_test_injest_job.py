from django.core.management.base import BaseCommand
from django.utils import timezone

from injest.models import InjestJob, RemoteServer


class Command(BaseCommand):
    help = "Создать тестовую задачу импорта для демонстрации"

    def add_arguments(self, parser):
        parser.add_argument(
            "--host",
            type=str,
            default="localhost",
            help="Хост удаленного сервера (по умолчанию: localhost)",
        )
        parser.add_argument(
            "--username", type=str, default="testuser", help="Имя пользователя"
        )
        parser.add_argument(
            "--directory",
            type=str,
            default="/tmp/videos/",
            help="Удаленная директория для поиска видео",
        )

    def handle(self, *args, **options):
        self.stdout.write("Создание тестовой задачи импорта...")

        # Создаем или получаем удаленный сервер
        server, created = RemoteServer.objects.get_or_create(
            name="Test Server",
            defaults={
                "host": options["host"],
                "port": 22,
                "username": options["username"],
                "password": "test123",  # В реальности использовать ключи!
                "remote_directory": options["directory"],
                "is_active": True,
                "connection_timeout": 30,
            },
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(f"✓ Создан удаленный сервер: {server}")
            )
        else:
            self.stdout.write(f"Удаленный сервер уже существует: {server}")

        # Создаем задачу импорта
        job, created = InjestJob.objects.get_or_create(
            server=server,
            defaults={
                "status": "pending",
                "scan_interval": 300,  # 5 минут
                "file_extensions": "mp4,avi,mkv,mov,wmv,flv,webm,m4v,3gp,ts",
                "max_concurrent_transfers": 3,
                "is_active": True,
                "next_run": timezone.now(),  # Сразу готова к выполнению
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"✓ Создана задача импорта: {job}"))
        else:
            # Обновляем время следующего запуска
            job.next_run = timezone.now()
            job.save(update_fields=["next_run"])
            self.stdout.write(
                f"Задача импорта уже существует, обновлено время запуска: {job}"
            )

        self.stdout.write(
            self.style.SUCCESS(
                "\nТестовая задача создана! Планировщик должен её подхватить в течение минуты."
            )
        )
        self.stdout.write(
            "Для просмотра задач в админ панели: /admin/injest/injestjob/"
        )
        self.stdout.write(
            'Для удаления: python manage.py shell -c "from injest.models import *; InjestJob.objects.all().delete(); RemoteServer.objects.all().delete()"'
        )
