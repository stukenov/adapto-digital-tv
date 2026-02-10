import os
from pathlib import Path
import subprocess
import json
from utils import is_file_in_use, is_file_being_modified


class AudioNormalizer:
    def __init__(self, file_path, debug=False):
        self.file_path = Path(file_path)
        self.debug = debug
        self.target_codec = "aac"
        self.target_channels = 2

    def normalize_audio(self):
        """Нормализует аудиопоток в файле под заданные параметры"""
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

            # Находим первый аудиопоток
            audio_stream = None
            for stream in data["streams"]:
                if stream["codec_type"] == "audio":
                    audio_stream = stream
                    break

            if not audio_stream:
                print("Аудиопоток не найден")
                return False

            # Проверяем текущие параметры
            current_codec = audio_stream.get("codec_name", "")
            current_channels = int(audio_stream.get("channels", 0))

            if self.debug:
                print(f"Текущий кодек: {current_codec}")
                print(f"Текущие каналы: {current_channels}")

            # Если все параметры соответствуют требуемым, пропускаем обработку
            if (
                current_codec == self.target_codec
                and current_channels == self.target_channels
            ):
                print("Аудио уже соответствует требованиям")
                return True

            # Формируем временный выходной файл
            temp_output = self.file_path.with_name(f"temp_{self.file_path.name}")

            # Формируем команду ffmpeg
            ffmpeg_cmd = [
                "ffmpeg",
                "-i",
                str(self.file_path),
                "-map",
                "0",  # Копируем все потоки
                "-c:v",
                "copy",  # Копируем видео без изменений
                "-c:a",
                self.target_codec,  # Устанавливаем кодек
                "-ac",
                str(self.target_channels),  # Устанавливаем количество каналов
                "-map_metadata",
                "0",  # Копируем метаданные
                "-strict",
                "-2",  # Разрешаем экспериментальные кодеки
                str(temp_output),
            ]

            if self.debug:
                print("Команда FFmpeg:", " ".join(ffmpeg_cmd))

            # Запускаем конвертацию
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)

            if result.returncode == 0:
                # Заменяем оригинальный файл
                os.remove(self.file_path)
                os.rename(temp_output, self.file_path)
                print(f"Аудио успешно нормализовано: {self.file_path}")
                return True
            else:
                print(f"Ошибка при нормализации: {result.stderr}")
                if temp_output.exists():
                    os.remove(temp_output)
                return False

        except Exception as e:
            print(f"Ошибка при нормализации аудио: {str(e)}")
            return False


# Пример использования:
# normalizer = AudioNormalizer(r"C:\Users\sakentukenov\Videos\uzdik_hitter_2024\ringo.mkv", debug=True)
# normalizer.normalize_audio()
