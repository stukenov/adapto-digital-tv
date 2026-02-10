import os

import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Настройка SeaweedFS S3 бакетов для ADAPTO"

    def add_arguments(self, parser):
        parser.add_argument(
            "--endpoint",
            type=str,
            default="http://localhost:8333",
            help="SeaweedFS S3 endpoint (по умолчанию: http://localhost:8333)",
        )
        parser.add_argument(
            "--access-key",
            type=str,
            default=os.environ.get("SEAWEEDFS_S3_ACCESS_KEY", "adapto-access-key-123"),
            help="S3 Access Key",
        )
        parser.add_argument(
            "--secret-key",
            type=str,
            default=os.environ.get("SEAWEEDFS_S3_SECRET_KEY", "adapto-secret-key-456"),
            help="S3 Secret Key",
        )
        parser.add_argument(
            "--bucket",
            type=str,
            default=os.environ.get("SEAWEEDFS_S3_BUCKET", "adapto-media"),
            help="S3 Bucket name",
        )

    def handle(self, *args, **options):
        self.stdout.write("🪣 Настройка SeaweedFS S3 бакетов...")

        # Конфигурация S3 клиента
        s3_client = boto3.client(
            "s3",
            endpoint_url=options["endpoint"],
            aws_access_key_id=options["access_key"],
            aws_secret_access_key=options["secret_key"],
            region_name="us-east-1",
        )

        bucket_name = options["bucket"]

        try:
            # Проверяем подключение к SeaweedFS
            self.stdout.write("🔌 Проверка подключения к SeaweedFS...")
            response = s3_client.list_buckets()
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ Подключение успешно! Найдено {len(response['Buckets'])} бакетов"
                )
            )

            # Создаем основной бакет если не существует
            if not self._bucket_exists(s3_client, bucket_name):
                self.stdout.write(f"📁 Создание бакета: {bucket_name}")
                s3_client.create_bucket(Bucket=bucket_name)
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Бакет {bucket_name} создан успешно!")
                )
            else:
                self.stdout.write(f"📁 Бакет {bucket_name} уже существует")

            # Создаем дополнительные бакеты для разных типов файлов
            additional_buckets = [
                f"{bucket_name}-videos",  # Видео файлы
                f"{bucket_name}-images",  # Изображения
                f"{bucket_name}-thumbnails",  # Миниатюры
                f"{bucket_name}-temp",  # Временные файлы
            ]

            for additional_bucket in additional_buckets:
                if not self._bucket_exists(s3_client, additional_bucket):
                    self.stdout.write(f"📁 Создание бакета: {additional_bucket}")
                    s3_client.create_bucket(Bucket=additional_bucket)
                    self.stdout.write(
                        self.style.SUCCESS(f"✅ Бакет {additional_bucket} создан!")
                    )
                else:
                    self.stdout.write(f"📁 Бакет {additional_bucket} уже существует")

            # Тестовая загрузка файла
            self._test_upload(s3_client, bucket_name)

            # Показываем итоговую информацию
            self._show_summary(s3_client, options)

        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "NoSuchBucket":
                self.stdout.write(
                    self.style.ERROR(f"❌ Бакет не найден: {bucket_name}")
                )
            else:
                self.stdout.write(self.style.ERROR(f"❌ Ошибка S3: {error_code} - {e}"))
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Ошибка подключения к SeaweedFS: {e}")
            )
            self.stdout.write("💡 Убедитесь что SeaweedFS запущен: make seaweedfs-test")

    def _bucket_exists(self, s3_client, bucket_name):
        """Проверяет существование бакета"""
        try:
            s3_client.head_bucket(Bucket=bucket_name)
            return True
        except ClientError:
            return False

    def _test_upload(self, s3_client, bucket_name):
        """Тестовая загрузка файла"""
        test_content = "Hello from ADAPTO! SeaweedFS is working!"
        test_key = "test/connection_test.txt"

        try:
            self.stdout.write("🧪 Тестовая загрузка файла...")
            s3_client.put_object(
                Bucket=bucket_name,
                Key=test_key,
                Body=test_content.encode("utf-8"),
                ContentType="text/plain",
            )

            # Проверяем что файл загружен
            response = s3_client.get_object(Bucket=bucket_name, Key=test_key)
            downloaded_content = response["Body"].read().decode("utf-8")

            if downloaded_content == test_content:
                self.stdout.write(
                    self.style.SUCCESS(
                        "✅ Тестовая загрузка/скачивание прошла успешно!"
                    )
                )
            else:
                self.stdout.write(
                    self.style.ERROR("❌ Ошибка: содержимое файла не совпадает")
                )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Ошибка тестовой загрузки: {e}"))

    def _show_summary(self, s3_client, options):
        """Показывает итоговую информацию"""
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("🎉 SeaweedFS настроен успешно!"))
        self.stdout.write("=" * 60)

        # Список всех бакетов
        try:
            response = s3_client.list_buckets()
            self.stdout.write(f"\n📂 Доступные бакеты ({len(response['Buckets'])}):")
            for bucket in response["Buckets"]:
                self.stdout.write(f"  - {bucket['Name']}")
        except Exception as e:
            self.stdout.write(f"❌ Ошибка получения списка бакетов: {e}")

        self.stdout.write(f"\n🔗 Настройки подключения:")
        self.stdout.write(f"  Endpoint: {options['endpoint']}")
        self.stdout.write(f"  Access Key: {options['access_key']}")
        self.stdout.write(f"  Bucket: {options['bucket']}")

        self.stdout.write(f"\n🌐 Web интерфейсы:")
        self.stdout.write(f"  SeaweedFS Master: http://localhost:9333")
        self.stdout.write(f"  SeaweedFS Filer: http://localhost:8888")
        self.stdout.write(f"  S3 API: {options['endpoint']}")

        self.stdout.write(f"\n💡 Для интеграции с Django добавьте в settings.py:")
        self.stdout.write(
            f"  DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'"
        )
        self.stdout.write(f"  AWS_S3_ENDPOINT_URL = '{options['endpoint']}'")
        self.stdout.write(f"  AWS_STORAGE_BUCKET_NAME = '{options['bucket']}'")
