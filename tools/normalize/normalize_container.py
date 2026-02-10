import os
from pathlib import Path
import subprocess
import json
from utils import is_file_in_use, is_file_being_modified


class ContainerNormalizer:
    def __init__(self, file_path, debug=False):
        self.file_path = Path(file_path)
        self.debug = debug

    def normalize_container(self):
        """Нормализует любой видеофайл в MKV с сохранением оригинальных потоков"""
        try:
            if not self.file_path.exists():
                print(f"Файл не найден: {self.file_path}")
                return False

            # Проверяем не используется ли файл
            if is_file_in_use(self.file_path):
                print(f"Файл используется другим процессом: {self.file_path}")
                return False

            # Проверяем не изменяется ли файл
            if is_file_being_modified(self.file_path):
                print(f"Файл в процессе изменения: {self.file_path}")
                return False

            # Пропускаем если файл уже в формате MKV
            if self.file_path.suffix.lower() == ".mkv":
                print(f"Файл уже в формате MKV, пропускаем: {self.file_path}")
                return True

            # Получаем информацию о файле
            probe_cmd = [
                "ffprobe",
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
                str(self.file_path),
            ]

            result = subprocess.run(probe_cmd, capture_output=True, text=True)
            data = json.loads(result.stdout)

            # Определяем выходной файл
            output_path = self.file_path.with_suffix(".mkv")

            # Базовые параметры для ffmpeg - копируем все потоки без перекодирования
            ffmpeg_cmd = [
                "ffmpeg",
                "-i",
                str(self.file_path),
                "-map",
                "0",  # Копируем все потоки
                "-c",
                "copy",  # Копируем все потоки без изменений
            ]

            # Анализируем видеопотоки для правильной обработки SAR/DAR
            for stream in data["streams"]:
                if stream["codec_type"] == "video":
                    # Получаем параметры исходного видео
                    width = int(stream.get("width", 0))
                    height = int(stream.get("height", 0))

                    # Получаем SAR (Sample Aspect Ratio)
                    sar_str = stream.get("sample_aspect_ratio", "1:1")
                    if sar_str != "1:1":
                        # Добавляем коррекцию SAR
                        ffmpeg_cmd.extend(
                            ["-aspect", stream.get("display_aspect_ratio", "16:9")]
                        )

                    if self.debug:
                        print(f"Размер кадра: {width}x{height}")
                        print(f"SAR: {sar_str}")
                        print(f"DAR: {stream.get('display_aspect_ratio', 'N/A')}")

            # Добавляем выходной файл в команду
            ffmpeg_cmd.append(str(output_path))

            if self.debug:
                print("Команда FFmpeg:", " ".join(ffmpeg_cmd))

            # Запускаем конвертацию
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)

            if result.returncode == 0:
                print(f"Файл успешно сконвертирован в MKV: {output_path}")
                # Удаляем оригинальный файл после успешной конвертации
                os.remove(self.file_path)
                print(f"Оригинальный файл удален: {self.file_path}")
                return True
            else:
                print(f"Ошибка при конвертации: {result.stderr}")
                return False

        except Exception as e:
            print(f"Ошибка при нормализации контейнера: {str(e)}")
            return False


# Пример использования:
# normalizer = ContainerNormalizer(r"C:\Users\sakentukenov\Videos\uzdik_hitter_2024\alemband.mp4", debug=True)
# normalizer.normalize_container()
