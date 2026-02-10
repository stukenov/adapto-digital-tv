import os
from pathlib import Path
import subprocess
import json
import platform
import sys


class VideoNormalizer:
    def __init__(self, file_path, debug=False):
        self.file_path = Path(file_path)
        self.debug = debug
        self.target_codec = "h264"
        self.target_bitrate = "6M"
        self.has_nvidia = self._check_nvidia()

    def _check_nvidia(self):
        """Проверяет наличие поддержки NVIDIA NVENC"""
        try:
            # Проверяем наличие NVIDIA на Windows
            if platform.system() == "Windows":
                result = subprocess.run(["nvidia-smi"], capture_output=True)
                return result.returncode == 0

            # Проверяем наличие NVIDIA на Linux
            elif platform.system() == "Linux":
                # Проверяем наличие драйвера NVIDIA
                return os.path.exists("/dev/nvidia0")

            return False
        except:
            return False

    def normalize_video(self):
        """Нормализует видеопоток в файле под заданные параметры"""
        try:
            if not self.file_path.exists():
                print(f"Файл не найден: {self.file_path}")
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

            # Находим первый видеопоток
            video_stream = None
            for stream in data["streams"]:
                if stream["codec_type"] == "video":
                    video_stream = stream
                    break

            if not video_stream:
                print("Видеопоток не найден")
                return False

            # Проверяем текущие параметры
            current_codec = video_stream.get("codec_name", "")

            # Получаем битрейт в бит/с
            bitrate = int(data["format"].get("bit_rate", 0))
            bitrate_mbps = bitrate / 1_000_000  # Конвертируем в Мбит/с

            if self.debug:
                print(f"Текущий кодек: {current_codec}")
                print(f"Текущий битрейт: {bitrate_mbps:.2f} Мбит/с")
                print(f"NVIDIA NVENC доступен: {self.has_nvidia}")

            # Проверяем необходимость транскодирования
            if current_codec == self.target_codec and bitrate_mbps <= 10:
                print("Видео уже соответствует требованиям")
                return True

            # Создаем временный файл
            temp_output = self.file_path.with_name(f"temp_{self.file_path.name}")

            # Формируем базовую команду FFmpeg
            ffmpeg_cmd = ["ffmpeg"]

            # Добавляем параметры аппаратного ускорения в зависимости от платформы
            if self.has_nvidia:  # NVIDIA GPU
                ffmpeg_cmd.extend(
                    ["-hwaccel", "cuda", "-hwaccel_output_format", "cuda"]
                )
            elif sys.platform == "darwin":  # macOS - VideoToolbox
                ffmpeg_cmd.extend(["-hwaccel", "videotoolbox"])
            elif sys.platform == "linux":  # Linux - VAAPI
                ffmpeg_cmd.extend(
                    [
                        "-hwaccel",
                        "vaapi",
                        "-hwaccel_device",
                        "/dev/dri/renderD128",
                        "-hwaccel_output_format",
                        "vaapi",
                    ]
                )

            # Добавляем остальные параметры
            ffmpeg_cmd.extend(["-i", str(self.file_path), "-c:v"])

            # Выбираем видеокодек в зависимости от платформы
            if self.has_nvidia:
                ffmpeg_cmd.append("h264_nvenc")
            elif sys.platform == "darwin":
                ffmpeg_cmd.append("h264_videotoolbox")
            elif sys.platform == "linux":
                ffmpeg_cmd.append("h264_vaapi")
            else:
                ffmpeg_cmd.append("libx264")

            # Добавляем общие параметры кодирования
            ffmpeg_cmd.extend(
                [
                    "-b:v",
                    self.target_bitrate,
                    "-maxrate",
                    self.target_bitrate,
                    "-bufsize",
                    "16M",
                    "-preset",
                    "p4" if self.has_nvidia else "medium",
                    "-c:a",
                    "copy",
                    "-map_metadata",
                    "0",
                    str(temp_output),
                ]
            )

            if self.debug:
                print("Команда FFmpeg:", " ".join(ffmpeg_cmd))

            # Запускаем конвертацию
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)

            if result.returncode == 0:
                # Заменяем оригинальный файл
                os.remove(self.file_path)
                os.rename(temp_output, self.file_path)
                print(f"Видео успешно нормализовано: {self.file_path}")
                return True
            else:
                print(f"Ошибка при нормализации: {result.stderr}")
                if temp_output.exists():
                    os.remove(temp_output)
                return False

        except Exception as e:
            print(f"Ошибка при нормализации видео: {str(e)}")
            return False


# Пример использования:
# normalizer = VideoNormalizer(r"C:\Users\sakentukenov\Videos\uzdik_hitter_2024\kui.mp4", debug=True)
# normalizer.normalize_video()
