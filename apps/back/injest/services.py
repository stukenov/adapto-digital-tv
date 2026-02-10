import logging
import os
import threading
import time
from typing import Dict, List, Optional

from django.db import transaction
from django.utils import timezone

from tvchannels.models import VideoFile, VideoMetadata

from .ffmpeg_service import FFmpegService
from .models import FileImportLog, InjestJob, RemoteServer

# Настройка логирования
logger = logging.getLogger("injest")


class SSHConnectionError(Exception):
    """Ошибка SSH подключения"""

    pass


class SSHService:
    """Сервис для работы с SSH подключениями"""

    def __init__(self, server: RemoteServer):
        self.server = server
        self.connection = None

    def connect(self) -> bool:
        """Подключение к серверу по SSH"""
        try:
            import paramiko

            self.connection = paramiko.SSHClient()
            self.connection.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            # Аутентификация по ключу или паролю
            if self.server.private_key_path and os.path.exists(
                self.server.private_key_path
            ):
                private_key = paramiko.RSAKey.from_private_key_file(
                    self.server.private_key_path
                )
                self.connection.connect(
                    hostname=self.server.host,
                    port=self.server.port,
                    username=self.server.username,
                    pkey=private_key,
                    timeout=self.server.connection_timeout,
                )
            else:
                self.connection.connect(
                    hostname=self.server.host,
                    port=self.server.port,
                    username=self.server.username,
                    password=self.server.password,
                    timeout=self.server.connection_timeout,
                )

            # Обновляем время последнего подключения
            self.server.last_connected = timezone.now()
            self.server.save(update_fields=["last_connected"])

            logger.info(f"Успешное подключение к {self.server.host}")
            return True

        except Exception as e:
            logger.error(f"Ошибка подключения к {self.server.host}: {e}")
            raise SSHConnectionError(f"Не удалось подключиться: {e}")

    def disconnect(self):
        """Закрытие SSH соединения"""
        if self.connection:
            self.connection.close()
            self.connection = None

    def list_files(self, extensions: List[str]) -> List[Dict[str, any]]:
        """Получить список видеофайлов с сервера"""
        if not self.connection:
            raise SSHConnectionError("Нет активного соединения")

        try:
            sftp = self.connection.open_sftp()
            files = []

            def scan_directory(directory_path: str):
                try:
                    for item in sftp.listdir_attr(directory_path):
                        item_path = os.path.join(directory_path, item.filename).replace(
                            "\\", "/"
                        )

                        if item.st_mode & 0o040000:  # Директория
                            scan_directory(item_path)
                        else:  # Файл
                            file_ext = (
                                os.path.splitext(item.filename)[1].lower().lstrip(".")
                            )
                            if file_ext in extensions:
                                # Проверяем, не содержит ли имя файла уже ID
                                if not self._has_id_in_filename(item.filename):
                                    files.append(
                                        {
                                            "filename": item.filename,
                                            "path": item_path,
                                            "size": item.st_size,
                                            "mtime": item.st_mtime,
                                        }
                                    )
                except PermissionError:
                    logger.warning(f"Нет доступа к директории: {directory_path}")
                except Exception as e:
                    logger.error(f"Ошибка при сканировании {directory_path}: {e}")

            scan_directory(self.server.remote_directory)
            sftp.close()

            logger.info(f"Найдено {len(files)} файлов на {self.server.host}")
            return files

        except Exception as e:
            logger.error(f"Ошибка при получении списка файлов: {e}")
            raise

    def rename_file(self, old_path: str, new_path: str) -> bool:
        """Переименовать файл на удаленном сервере"""
        if not self.connection:
            raise SSHConnectionError("Нет активного соединения")

        try:
            sftp = self.connection.open_sftp()
            sftp.rename(old_path, new_path)
            sftp.close()

            logger.info(f"Файл переименован: {old_path} -> {new_path}")
            return True

        except Exception as e:
            logger.error(f"Ошибка при переименовании файла: {e}")
            return False

    def _has_id_in_filename(self, filename: str) -> bool:
        """Проверить, содержит ли имя файла уже ID"""
        name_without_ext = os.path.splitext(filename)[0]
        parts = name_without_ext.split(".")

        # Если есть часть, которая является числом, считаем что ID уже есть
        for part in parts[1:]:  # Пропускаем первую часть (основное имя)
            if part.isdigit():
                return True
        return False


class FileImportService:
    """Сервис для импорта файлов"""

    def __init__(self, job: InjestJob):
        self.job = job
        self.ssh_service = SSHService(job.server)
        self.ffmpeg_service = None

    def process_files(self) -> Dict[str, int]:
        """Основной метод обработки файлов"""
        stats = {
            "discovered": 0,
            "imported": 0,
            "renamed": 0,
            "failed": 0,
            "skipped": 0,
        }

        start_time = time.time()

        try:
            # Обновляем статус задачи
            self.job.status = "running"
            self.job.last_run = timezone.now()
            self.job.save(update_fields=["status", "last_run"])

            # Подключаемся к серверу
            if not self.ssh_service.connect():
                raise Exception("Не удалось подключиться к серверу")

            # Инициализируем ffmpeg сервис
            self.ffmpeg_service = FFmpegService(self.ssh_service.connection)

            # Получаем список файлов
            extensions = self.job.get_file_extensions_list()
            remote_files = self.ssh_service.list_files(extensions)
            stats["discovered"] = len(remote_files)

            # Обрабатываем каждый файл
            for file_info in remote_files:
                try:
                    result = self._process_single_file(file_info)
                    stats[result] += 1
                except Exception as e:
                    logger.error(
                        f"Ошибка при обработке файла {file_info['filename']}: {e}"
                    )
                    stats["failed"] += 1

            # Обновляем статус задачи
            self.job.status = "completed"
            self.job.schedule_next_run()

        except Exception as e:
            logger.error(f"Ошибка при выполнении задачи {self.job.id}: {e}")
            self.job.status = "failed"
            stats["failed"] += len(remote_files) if "remote_files" in locals() else 0

        finally:
            # Закрываем соединение
            self.ssh_service.disconnect()

            # Сохраняем статус задачи
            processing_time = time.time() - start_time
            self.job.save(update_fields=["status"])

            logger.info(
                f"Задача {self.job.id} завершена за {processing_time:.2f}с. Статистика: {stats}"
            )

        return stats

    def _process_single_file(self, file_info: Dict[str, any]) -> str:
        """Обработка одного файла"""
        filename = file_info["filename"]
        file_path = file_info["path"]
        file_size = file_info["size"]

        start_time = time.time()

        # Проверяем, не обрабатывали ли мы уже этот файл
        existing_log = FileImportLog.objects.filter(
            job=self.job, original_filename=filename, status__in=["imported", "renamed"]
        ).first()

        if existing_log:
            logger.debug(f"Файл {filename} уже обработан, пропускаем")
            return "skipped"

        # Создаем лог для файла
        file_log = FileImportLog.objects.create(
            job=self.job,
            original_filename=filename,
            original_path=file_path,
            file_size=file_size,
            status="discovered",
        )

        video_file = None

        try:
            # Обновляем статус на "обрабатывается"
            file_log.status = "processing"
            file_log.save(update_fields=["status"])

            # Проверяем корректность файла через ffmpeg
            if not self.ffmpeg_service.validate_file(file_path):
                raise Exception("Файл не является корректным видеофайлом или поврежден")

            # Извлекаем метаданные через ffmpeg
            ffmpeg_metadata = self.ffmpeg_service.extract_metadata(file_path)
            if not ffmpeg_metadata:
                logger.warning(
                    f"Не удалось извлечь метаданные для {filename}, используем базовые данные"
                )

            # Создаем запись VideoFile с метаданными от ffmpeg
            video_file = self._create_video_file(file_info, ffmpeg_metadata)
            file_log.video_file = video_file
            file_log.status = "imported"
            file_log.save(update_fields=["video_file", "status"])

            # Переименовываем файл с ID
            new_filename = file_log.generate_new_filename(video_file.id)
            new_path = os.path.join(os.path.dirname(file_path), new_filename).replace(
                "\\", "/"
            )

            if self.ssh_service.rename_file(file_path, new_path):
                file_log.new_filename = new_filename
                file_log.new_path = new_path
                file_log.status = "renamed"

                # Обновляем путь в VideoFile
                video_file.file_path = new_path
                video_file.save(update_fields=["file_path"])
            else:
                raise Exception("Не удалось переименовать файл на сервере")

            # Сохраняем время обработки
            file_log.processing_time = time.time() - start_time
            file_log.save(
                update_fields=["new_filename", "new_path", "status", "processing_time"]
            )

            logger.info(f"Файл {filename} обработан успешно (ID: {video_file.id})")
            return file_log.status

        except Exception as e:
            # Если произошла ошибка, удаляем созданный VideoFile
            if video_file:
                try:
                    # Удаляем связанные метаданные
                    if hasattr(video_file, "metadata"):
                        video_file.metadata.delete()
                    # Удаляем сам VideoFile
                    video_file.delete()
                    logger.info(
                        f"Удален VideoFile #{video_file.id} из-за ошибки обработки"
                    )
                except Exception as delete_error:
                    logger.error(f"Ошибка при удалении VideoFile: {delete_error}")

            # Сохраняем информацию об ошибке в лог
            file_log.status = "failed"
            file_log.error_message = str(e)
            file_log.processing_time = time.time() - start_time
            file_log.video_file = None  # Убираем ссылку на удаленный VideoFile
            file_log.save(
                update_fields=[
                    "status",
                    "error_message",
                    "processing_time",
                    "video_file",
                ]
            )

            logger.error(f"Ошибка при обработке файла {filename}: {e}")
            return "failed"

    def _create_video_file(
        self, file_info: Dict[str, any], ffmpeg_metadata: Dict[str, any] = None
    ) -> VideoFile:
        """Создание записи VideoFile с метаданными от ffmpeg"""
        filename = file_info["filename"]
        file_path = file_info["path"]
        file_size = file_info["size"]

        # Определяем расширение
        file_ext = os.path.splitext(filename)[1].lower().lstrip(".")
        name_without_ext = os.path.splitext(filename)[0]

        # Используем метаданные от ffmpeg если доступны
        if ffmpeg_metadata is None:
            ffmpeg_metadata = {}

        # Создаем VideoFile с данными от ffmpeg
        video_file_data = {
            "name": name_without_ext,
            "file_path": file_path,
            "extension": file_ext,
            "file_size": ffmpeg_metadata.get("file_size", file_size),
            "duration_seconds": ffmpeg_metadata.get("duration_seconds"),
            "duration_frames": ffmpeg_metadata.get("duration_frames"),
            "video_bitrate": ffmpeg_metadata.get("video_bitrate"),
            "audio_bitrate": ffmpeg_metadata.get("audio_bitrate"),
            "video_codec": ffmpeg_metadata.get("video_codec", ""),
            "audio_codec": ffmpeg_metadata.get("audio_codec", ""),
            "resolution_width": ffmpeg_metadata.get("resolution_width"),
            "resolution_height": ffmpeg_metadata.get("resolution_height"),
            "framerate": ffmpeg_metadata.get("framerate"),
        }

        # Убираем None значения
        video_file_data = {k: v for k, v in video_file_data.items() if v is not None}

        # Создаем VideoFile
        video_file = VideoFile.objects.create(**video_file_data)

        # Создаем базовые метаданные
        VideoMetadata.objects.create(
            video_file=video_file,
            original_title=name_without_ext,
            category=self._detect_category_from_filename(name_without_ext),
            language="kk",  # По умолчанию
            is_active=True,
        )

        logger.info(
            f"Создан VideoFile #{video_file.id} с метаданными: {video_file_data}"
        )
        return video_file

    def _detect_category_from_filename(self, filename: str) -> str:
        """Попытка определить категорию по имени файла"""
        filename_lower = filename.lower()

        # Простые правила определения категории
        if any(
            word in filename_lower
            for word in ["serial", "series", "episode", "ep", "s0", "сериал"]
        ):
            return "series"
        elif any(word in filename_lower for word in ["movie", "film", "фильм", "кино"]):
            return "movies"
        elif any(word in filename_lower for word in ["news", "новости", "жаңалықтар"]):
            return "news"
        elif any(word in filename_lower for word in ["show", "передача", "хабар"]):
            return "shows"
        elif any(word in filename_lower for word in ["doc", "documentary", "деректi"]):
            return "documentaries"
        elif any(word in filename_lower for word in ["kids", "children", "балалар"]):
            return "children"
        else:
            return "other"


class InjestScheduler:
    """Планировщик задач импорта"""

    def __init__(self):
        self.running = False
        self.thread = None

    def start(self):
        """Запуск планировщика"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        logger.info("Планировщик импорта запущен")

    def stop(self):
        """Остановка планировщика"""
        self.running = False
        if self.thread:
            self.thread.join()
        logger.info("Планировщик импорта остановлен")

    def _run_scheduler(self):
        """Основной цикл планировщика"""
        iteration = 0
        while self.running:
            try:
                iteration += 1
                now = timezone.now()

                # Получаем общее количество задач
                total_jobs = InjestJob.objects.filter(is_active=True).count()

                # Получаем задачи, готовые к выполнению
                ready_jobs = InjestJob.objects.filter(
                    is_active=True,
                    status__in=["pending", "completed"],
                    next_run__lte=now,
                )

                ready_count = ready_jobs.count()

                logger.info(
                    f"[Итерация {iteration}] Активных задач: {total_jobs}, готовых к выполнению: {ready_count}"
                )

                if total_jobs == 0:
                    logger.warning(
                        "В базе данных нет активных задач импорта. Создайте задачи в админ панели (/admin/injest/injestjob/)"
                    )
                elif ready_count == 0:
                    logger.info(
                        "Нет задач готовых к выполнению. Следующая проверка через 60 секунд."
                    )

                for job in ready_jobs:
                    try:
                        logger.info(
                            f"Запуск задачи импорта {job.id} ({job.server.name})"
                        )
                        service = FileImportService(job)
                        stats = service.process_files()
                        logger.info(f"Задача {job.id} завершена: {stats}")
                    except Exception as e:
                        logger.error(f"Ошибка при выполнении задачи {job.id}: {e}")

                # Спим 60 секунд перед следующей проверкой
                time.sleep(60)

            except Exception as e:
                logger.error(f"Ошибка в планировщике: {e}")
                time.sleep(60)


# Глобальный экземпляр планировщика
scheduler = InjestScheduler()
