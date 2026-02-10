import json
import logging
import re
from decimal import Decimal
from typing import Any, Dict, Optional

logger = logging.getLogger("injest.ffmpeg")


class FFmpegService:
    """Сервис для извлечения метаданных видео через ffmpeg"""

    def __init__(self, ssh_connection):
        self.ssh_connection = ssh_connection

    def extract_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        Извлечь метаданные видеофайла через ffprobe

        Args:
            file_path: Путь к файлу на удаленном сервере

        Returns:
            Словарь с метаданными видео
        """
        try:
            # Команда ffprobe для получения метаданных в JSON формате
            command = (
                f"ffprobe -v quiet -print_format json -show_format -show_streams "
                f'"{file_path}"'
            )

            stdin, stdout, stderr = self.ssh_connection.exec_command(command)
            exit_code = stdout.channel.recv_exit_status()

            if exit_code != 0:
                error_output = stderr.read().decode("utf-8")
                logger.error(f"Ошибка ffprobe для {file_path}: {error_output}")
                return {}

            # Парсим JSON ответ
            output = stdout.read().decode("utf-8")
            probe_data = json.loads(output)

            # Извлекаем нужные данные
            metadata = self._parse_probe_data(probe_data)
            logger.info(f"Метаданные извлечены для {file_path}: {metadata}")

            return metadata

        except Exception as e:
            logger.error(f"Ошибка при извлечении метаданных для {file_path}: {e}")
            return {}

    def _parse_probe_data(self, probe_data: Dict) -> Dict[str, Any]:
        """Парсинг данных от ffprobe"""
        metadata = {}

        # Общая информация о файле
        if "format" in probe_data:
            format_info = probe_data["format"]

            # Длительность в секундах
            if "duration" in format_info:
                try:
                    metadata["duration_seconds"] = int(float(format_info["duration"]))
                except (ValueError, TypeError):
                    pass

            # Размер файла
            if "size" in format_info:
                try:
                    metadata["file_size"] = int(format_info["size"])
                except (ValueError, TypeError):
                    pass

            # Общий битрейт
            if "bit_rate" in format_info:
                try:
                    metadata["total_bitrate"] = int(format_info["bit_rate"])
                except (ValueError, TypeError):
                    pass

        # Информация о потоках
        if "streams" in probe_data:
            video_stream = None
            audio_stream = None

            # Находим первые видео и аудио потоки
            for stream in probe_data["streams"]:
                if stream.get("codec_type") == "video" and video_stream is None:
                    video_stream = stream
                elif stream.get("codec_type") == "audio" and audio_stream is None:
                    audio_stream = stream

            # Обрабатываем видео поток
            if video_stream:
                video_metadata = self._parse_video_stream(video_stream)
                metadata.update(video_metadata)

            # Обрабатываем аудио поток
            if audio_stream:
                audio_metadata = self._parse_audio_stream(audio_stream)
                metadata.update(audio_metadata)

        return metadata

    def _parse_video_stream(self, stream: Dict) -> Dict[str, Any]:
        """Парсинг видео потока"""
        metadata = {}

        # Видеокодек
        if "codec_name" in stream:
            metadata["video_codec"] = stream["codec_name"]

        # Разрешение
        if "width" in stream:
            try:
                metadata["resolution_width"] = int(stream["width"])
            except (ValueError, TypeError):
                pass

        if "height" in stream:
            try:
                metadata["resolution_height"] = int(stream["height"])
            except (ValueError, TypeError):
                pass

        # Битрейт видео
        if "bit_rate" in stream:
            try:
                metadata["video_bitrate"] = int(stream["bit_rate"]) // 1000  # в kbps
            except (ValueError, TypeError):
                pass

        # Частота кадров
        if "r_frame_rate" in stream:
            try:
                framerate_str = stream["r_frame_rate"]
                if "/" in framerate_str:
                    num, den = framerate_str.split("/")
                    if int(den) != 0:
                        framerate = float(num) / float(den)
                        metadata["framerate"] = round(Decimal(str(framerate)), 3)
                else:
                    metadata["framerate"] = round(Decimal(framerate_str), 3)
            except (ValueError, TypeError, ZeroDivisionError):
                pass

        # Длительность в кадрах
        if "nb_frames" in stream:
            try:
                metadata["duration_frames"] = int(stream["nb_frames"])
            except (ValueError, TypeError):
                pass

        return metadata

    def _parse_audio_stream(self, stream: Dict) -> Dict[str, Any]:
        """Парсинг аудио потока"""
        metadata = {}

        # Аудиокодек
        if "codec_name" in stream:
            metadata["audio_codec"] = stream["codec_name"]

        # Битрейт аудио
        if "bit_rate" in stream:
            try:
                metadata["audio_bitrate"] = int(stream["bit_rate"]) // 1000  # в kbps
            except (ValueError, TypeError):
                pass

        return metadata

    def validate_file(self, file_path: str) -> bool:
        """
        Проверить, является ли файл корректным видеофайлом

        Args:
            file_path: Путь к файлу на удаленном сервере

        Returns:
            True если файл корректный, False иначе
        """
        try:
            # Простая проверка через ffprobe
            command = f'ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "{file_path}"'

            stdin, stdout, stderr = self.ssh_connection.exec_command(command)
            exit_code = stdout.channel.recv_exit_status()

            if exit_code == 0:
                output = stdout.read().decode("utf-8").strip()
                # Если есть видеокодек, файл корректный
                return bool(output)

            return False

        except Exception as e:
            logger.error(f"Ошибка при проверке файла {file_path}: {e}")
            return False
