import os
import secrets
import string

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = "Создает суперпользователя автоматически, если он еще не существует"

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            type=str,
            default=os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin"),
            help="Username для суперпользователя (по умолчанию: admin или DJANGO_SUPERUSER_USERNAME)",
        )
        parser.add_argument(
            "--email",
            type=str,
            default=os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@example.com"),
            help="Email для суперпользователя (по умолчанию: admin@example.com или DJANGO_SUPERUSER_EMAIL)",
        )
        parser.add_argument(
            "--password",
            type=str,
            default=os.environ.get("DJANGO_SUPERUSER_PASSWORD"),
            help="Пароль для суперпользователя (по умолчанию: DJANGO_SUPERUSER_PASSWORD или генерируется автоматически)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Пересоздать пользователя, если он уже существует",
        )

    def generate_password(self, length=12):
        """Генерирует случайный пароль"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return "".join(secrets.choice(alphabet) for _ in range(length))

    def handle(self, *args, **options):
        username = options["username"]
        email = options["email"]
        password = options["password"]
        force = options["force"]

        # Генерируем пароль, если не указан
        if not password:
            password = self.generate_password()

        try:
            with transaction.atomic():
                # Проверяем, существует ли уже суперпользователь
                existing_user = User.objects.filter(username=username).first()

                if existing_user:
                    if not force:
                        self.stdout.write(
                            self.style.WARNING(
                                f'Суперпользователь "{username}" уже существует. '
                                "Используйте --force для пересоздания."
                            )
                        )
                        return
                    else:
                        existing_user.delete()
                        self.stdout.write(
                            self.style.WARNING(
                                f'Удален существующий пользователь "{username}"'
                            )
                        )

                # Создаем суперпользователя
                user = User.objects.create_superuser(
                    username=username, email=email, password=password
                )

                # Выводим информацию о созданном пользователе
                self.stdout.write(
                    self.style.SUCCESS(
                        "\n" + "=" * 60 + "\n"
                        f"Суперпользователь успешно создан!\n\n"
                        f"Username: {username}\n"
                        f"Email: {email}\n"
                        f"Password: {password}\n\n"
                        f"Админ-панель: https://dash.example.com/admin/\n"
                        "=" * 60 + "\n"
                    )
                )

                # Сохраняем в переменную окружения для логов Docker
                env_info = (
                    f"ADAPTO_ADMIN_USERNAME={username}\n"
                    f"ADAPTO_ADMIN_EMAIL={email}\n"
                    f"ADAPTO_ADMIN_PASSWORD={password}\n"
                )

                # Создаем файл с данными админа (только для разработки)
                admin_info_file = "/tmp/adapto_admin_info.txt"
                try:
                    with open(admin_info_file, "w", encoding="utf-8") as f:
                        f.write(
                            f"Adapto Digital TV Admin Credentials\n"
                            f"========================\n"
                            f"Username: {username}\n"
                            f"Email: {email}\n"
                            f"Password: {password}\n"
                            f"Admin URL: https://dash.example.com/admin/\n"
                            f"Created: {user.date_joined}\n"
                        )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Данные сохранены в файл: {admin_info_file}"
                        )
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f"Не удалось сохранить файл с данными: {e}")
                    )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Ошибка при создании суперпользователя: {e}")
            )
            raise e
