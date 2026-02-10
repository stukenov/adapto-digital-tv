import argparse
import json
import os
import shutil
import subprocess
import sys
import platform
import time
from contextlib import contextmanager
import concurrent.futures
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Tuple


# Локализация (RU, KK)
MESSAGES = {
    "ru": {
        "scanning": "Сканирую папку: {path}",
        "found_files": "Найдено видеофайлов: {count}",
        "ffprobe_missing": "Не найден ffprobe. Установите FFmpeg/ffprobe и добавьте в PATH.",
        "ffmpeg_missing": "Не найден ffmpeg. Установите FFmpeg и добавьте в PATH.",
        "collecting_info": "Сбор метаданных...",
        "listing_sorted": "Сортировка по размеру на минуту (MB/мин), по убыванию:",
        "table_header": "MB/мин | Размер (MB) | Длительность (мин) | Разрешение | Битрейт (Мбит/с) | Файл",
        "transcoding": "Транскодирование: {file}",
        "transcoded_ok": "Готово: {file}",
        "transcoded_fail": "Ошибка при транскодировании: {file}",
        "already_ok": "Пропуск (соответствует требованиям): {file}",
        "skipped_growing": "Пропуск (файл растёт): {file}",
        "skipped_locked": "Пропуск (файл заблокирован): {file}",
        "deleted_invalid": "Удалён невалидный видеофайл: {file}",
        "filter_active": "Фильтр: только >= {thr:.2f} MB/мин. К транскодированию: {count}/{total}",
        "elapsed": "Время: {seconds:.1f} сек",
        "done": "Завершено.",
        "added_extensions": "Добавлены дополнительные расширения: {extensions}",
        "extension_conversions": "Настроены конверсии расширений: {conversions}",
        "converting_extension": "Конвертирование {source} в {target}: {file}",
    },
    "kk": {
        "scanning": "Қапшықты сканерлеу: {path}",
        "found_files": "Бейне файлдар табылды: {count}",
        "ffprobe_missing": "ffprobe табылмады. FFmpeg/ffprobe орнатып, PATH-қа қосыңыз.",
        "ffmpeg_missing": "ffmpeg табылмады. FFmpeg орнатып, PATH-қа қосыңыз.",
        "collecting_info": "Метадеректерді жинау...",
        "listing_sorted": "Минутына көлемі бойынша (MB/мин), кему ретімен:",
        "table_header": "MB/мин | Көлемі (MB) | Ұзақтығы (мин) | Ажыратылым | Битрейт (Мбит/с) | Файл",
        "transcoding": "Транскодтау: {file}",
        "transcoded_ok": "Дайын: {file}",
        "transcoded_fail": "Транскодтауда қате: {file}",
        "already_ok": "Өткізу (талаптарға сай): {file}",
        "skipped_growing": "Өткізу (файл өсіп жатыр): {file}",
        "skipped_locked": "Өткізу (файл бұғатталған): {file}",
        "deleted_invalid": "Жарамсыз бейне файл жойылды: {file}",
        "filter_active": "Сүзгі: тек >= {thr:.2f} MB/мин. Транскодтауға: {count}/{total}",
        "elapsed": "Уақыты: {seconds:.1f} сек",
        "done": "Аяқталды.",
        "added_extensions": "Қосымша кеңейтулер қосылды: {extensions}",
        "extension_conversions": "Кеңейту түрлендірулері орнатылды: {conversions}",
        "converting_extension": "{source} форматын {target} форматына түрлендіру: {file}",
    },
}


VIDEO_EXTENSIONS = {
    ".mp4",
    ".mkv",
    ".mov",
    ".avi",
    ".webm",
    ".m4v",
    ".ts",
    ".m2ts",
    ".wmv",
    ".flv",
    ".3gp",
}


@dataclass
class VideoInfo:
    path: Path
    size_bytes: int
    duration_seconds: float
    bitrate_bps: Optional[int]
    width: Optional[int]
    height: Optional[int]

    @property
    def size_mb(self) -> float:
        return self.size_bytes / (1024 * 1024)

    @property
    def duration_minutes(self) -> float:
        return self.duration_seconds / 60 if self.duration_seconds else 0.0

    @property
    def mb_per_minute(self) -> float:
        if self.duration_minutes <= 0:
            return float("inf")
        return self.size_mb / self.duration_minutes

    @property
    def bitrate_mbps(self) -> Optional[float]:
        if self.bitrate_bps is None:
            return None
        return self.bitrate_bps / 1_000_000

    @property
    def resolution_str(self) -> str:
        if self.width and self.height:
            return f"{self.width}x{self.height}"
        return "-"


def which(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def is_video_file(path: Path, additional_extensions: set = None) -> bool:
    extensions = VIDEO_EXTENSIONS
    if additional_extensions:
        extensions = VIDEO_EXTENSIONS | additional_extensions
    return path.is_file() and path.suffix.lower() in extensions


def iter_video_files(root: Path, recursive: bool = True, additional_extensions: set = None) -> Iterable[Path]:
    if recursive:
        for dirpath, _dirnames, filenames in os.walk(root):
            for name in filenames:
                p = Path(dirpath) / name
                if is_video_file(p, additional_extensions):
                    yield p
    else:
        for p in root.iterdir():
            if is_video_file(p, additional_extensions):
                yield p


def run_ffprobe(file_path: Path) -> Tuple[Optional[dict], Optional[str]]:
    cmd = [
        "ffprobe",
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        str(file_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        return None, proc.stderr
    try:
        return json.loads(proc.stdout), None
    except json.JSONDecodeError as e:
        return None, str(e)


def collect_video_info(path: Path, debug: bool = False) -> Optional[VideoInfo]:
    stat = path.stat()
    data, err = run_ffprobe(path)
    if data is None:
        if debug:
            print(f"ffprobe error for {path}: {err}")
        return None

    duration_seconds: float = 0.0
    bitrate_bps: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None

    fmt = data.get("format", {})
    dur_str = fmt.get("duration")
    if dur_str:
        try:
            duration_seconds = float(dur_str)
        except ValueError:
            duration_seconds = 0.0
    br_str = fmt.get("bit_rate")
    if br_str:
        try:
            bitrate_bps = int(br_str)
        except ValueError:
            bitrate_bps = None

    for stream in data.get("streams", []):
        if stream.get("codec_type") == "video":
            width = stream.get("width")
            height = stream.get("height")
            break

    # Если битрейт не удалось получить, вычислим средний из размера файла
    if bitrate_bps is None and duration_seconds > 0:
        bitrate_bps = int((stat.st_size * 8) / duration_seconds)

    return VideoInfo(
        path=path,
        size_bytes=stat.st_size,
        duration_seconds=duration_seconds,
        bitrate_bps=bitrate_bps,
        width=width,
        height=height,
    )


def print_sorted_table(videos: List[VideoInfo], lang: str) -> None:
    texts = MESSAGES[lang]
    print(texts["listing_sorted"])
    print(texts["table_header"])
    for v in videos:
        mb_per_min = v.mb_per_minute
        size_mb = v.size_mb
        dur_min = v.duration_minutes
        br = v.bitrate_mbps
        br_str = f"{br:.2f}" if br is not None else "-"
        print(
            f"{mb_per_min:6.2f} | {size_mb:10.2f} | {dur_min:14.2f} | {v.resolution_str:10} | {br_str:14} | {v.path}"
        )


TARGET_CODEC = "h264"
TARGET_BITRATE = "6M"


def has_ffmpeg_encoder(name: str) -> bool:
    try:
        out = subprocess.run(
            ["ffmpeg", "-hide_banner", "-encoders"], capture_output=True, text=True
        )
        if out.returncode != 0:
            return False
        return name in out.stdout
    except Exception:
        return False


def build_ffmpeg_cmd(input_path: Path, output_path: Path, encoder: str) -> List[str]:
    cmd: List[str] = [
        "ffmpeg",
        "-hide_banner",
        "-y",
        "-i",
        str(input_path),
        "-c:v",
        encoder,
        "-b:v",
        TARGET_BITRATE,
        "-maxrate",
        TARGET_BITRATE,
        "-bufsize",
        "16M",
        "-preset",
        "p4" if encoder == "h264_nvenc" else "medium",
        "-c:a",
        "copy",
        "-map_metadata",
        "0",
        str(output_path),
    ]
    return cmd


def choose_encoder(explicit_codec: Optional[str] = None) -> str:
    if explicit_codec:
        return explicit_codec
    if sys.platform == "darwin" and has_ffmpeg_encoder("h264_videotoolbox"):
        return "h264_videotoolbox"
    if has_ffmpeg_encoder("h264_nvenc"):
        return "h264_nvenc"
    return "libx264"


# Кроссплатформенная проверка стабильности/блокировки файла
def is_file_growing(path: Path, interval_sec: float = 1.0, repeats: int = 2) -> bool:
    try:
        prev_size = path.stat().st_size
        for _ in range(repeats):
            time.sleep(interval_sec)
            cur_size = path.stat().st_size
            if cur_size != prev_size:
                return True
            prev_size = cur_size
        return False
    except FileNotFoundError:
        return False


@contextmanager
def _maybe_locked_file(path: Path):
    f = open(path, "rb")
    try:
        try:
            # Unix
            import fcntl  # type: ignore

            fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            yield f
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            return
        except Exception:
            pass
        try:
            # Windows
            import msvcrt  # type: ignore

            msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
            yield f
            msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
            return
        except Exception:
            pass
        # Если не удалось применить механизм блокировки — просто читаем
        yield f
    finally:
        try:
            f.close()
        except Exception:
            pass


def can_acquire_exclusive_lock(path: Path) -> bool:
    try:
        with _maybe_locked_file(path):
            return True
    except Exception:
        return False


def transcode_video(
    file_path: Path,
    debug: bool = False,
    force: bool = False,
    lang: str = "ru",
    codec: Optional[str] = None,
    extension_conversions: dict = None,
) -> Tuple[bool, bool]:
    # Returns (ok, skipped)
    texts = MESSAGES[lang]
    data, _ = run_ffprobe(file_path)
    if not data:
        # Невалидный файл: если стабилен и не заблокирован — удалить
        if not is_file_growing(file_path) and can_acquire_exclusive_lock(file_path):
            try:
                os.remove(file_path)
                print(texts["deleted_invalid"].format(file=file_path))
            except Exception:
                pass
        return False, False

    video_stream = None
    for stream in data.get("streams", []):
        if stream.get("codec_type") == "video":
            video_stream = stream
            break
    if not video_stream:
        if not is_file_growing(file_path) and can_acquire_exclusive_lock(file_path):
            try:
                os.remove(file_path)
                print(texts["deleted_invalid"].format(file=file_path))
            except Exception:
                pass
        return False, False

    current_codec = video_stream.get("codec_name", "")
    bitrate_bps = None
    fmt = data.get("format", {})
    br_str = fmt.get("bit_rate")
    if br_str:
        try:
            bitrate_bps = int(br_str)
        except ValueError:
            bitrate_bps = None
    bitrate_mbps = (bitrate_bps / 1_000_000) if bitrate_bps else 0

    if debug:
        print(f"Текущий кодек: {current_codec}")
        print(f"Текущий битрейт: {bitrate_mbps:.2f} Мбит/с")

    # Проверяем нужна ли конверсия расширения
    current_ext = file_path.suffix.lower()
    needs_extension_conversion = extension_conversions and current_ext in extension_conversions
    
    if not force and not needs_extension_conversion and current_codec == TARGET_CODEC and bitrate_mbps <= 10:
        print(texts["already_ok"].format(file=file_path))
        return True, True

    # Проверяем стабильность/блокировку перед транскодом
    if is_file_growing(file_path):
        print(texts["skipped_growing"].format(file=file_path))
        return True, True
    if not can_acquire_exclusive_lock(file_path):
        print(texts["skipped_locked"].format(file=file_path))
        return True, True

    # Определяем выходное расширение
    target_ext = current_ext
    if extension_conversions and current_ext in extension_conversions:
        target_ext = extension_conversions[current_ext]
        print(texts["converting_extension"].format(
            source=current_ext, 
            target=target_ext, 
            file=file_path
        ))

    # Создаём временный файл с правильным расширением
    if target_ext != current_ext:
        temp_output = file_path.with_name(f"temp_{file_path.stem}{target_ext}")
    else:
        temp_output = file_path.with_name(f"temp_{file_path.name}")
    
    if temp_output.exists():
        try:
            os.remove(temp_output)
        except Exception:
            # ffmpeg запишет поверх с -y
            pass
    encoder = choose_encoder(explicit_codec=codec)
    cmd = build_ffmpeg_cmd(file_path, temp_output, encoder)

    if debug:
        print("Команда FFmpeg:", " ".join(cmd))

    start_ts = time.time()
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode == 0:
        try:
            os.remove(file_path)
        except Exception:
            pass
        
        # Определяем финальное имя файла
        if target_ext != current_ext:
            final_output = file_path.with_suffix(target_ext)
        else:
            final_output = file_path
            
        os.rename(temp_output, final_output)
        elapsed = time.time() - start_ts
        print(MESSAGES[lang]["elapsed"].format(seconds=elapsed))
        return True, False
    else:
        if debug:
            print(proc.stderr)
        # Попытка отката на libx264, если не он использовался
        if encoder != "libx264":
            if temp_output.exists():
                try:
                    os.remove(temp_output)
                except Exception:
                    pass
            fallback = build_ffmpeg_cmd(file_path, temp_output, "libx264")
            if debug:
                print("Retry with libx264:", " ".join(fallback))
            start_ts2 = time.time()
            proc2 = subprocess.run(fallback, capture_output=True, text=True)
            if proc2.returncode == 0:
                try:
                    os.remove(file_path)
                except Exception:
                    pass
                
                # Определяем финальное имя файла для fallback
                if target_ext != current_ext:
                    final_output = file_path.with_suffix(target_ext)
                else:
                    final_output = file_path
                    
                os.rename(temp_output, final_output)
                elapsed2 = time.time() - start_ts2
                print(MESSAGES[lang]["elapsed"].format(seconds=elapsed2))
                return True, False
            else:
                if debug:
                    print(proc2.stderr)
        if temp_output.exists():
            try:
                os.remove(temp_output)
            except Exception:
                pass
        return False, False


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Сканирует каталог, выводит видео по MB/мин (по убыванию) и транскодирует их с заменой оригинала"
        )
    )
    parser.add_argument(
        "-dir",
        dest="directory",
        type=str,
        default=str(Path.cwd()),
        help="Каталог для сканирования (по умолчанию текущий)",
    )
    parser.add_argument(
        "-dryrun",
        action="store_true",
        help="Только показать список без транскодирования",
    )
    parser.add_argument(
        "-limit",
        type=int,
        default=0,
        help="Ограничить количество файлов для транскодирования (0 = без ограничений)",
    )
    parser.add_argument(
        "-lang",
        choices=["ru", "kk"],
        default="ru",
        help="Язык сообщений (ru/kk)",
    )
    parser.add_argument(
        "-debug",
        action="store_true",
        help="Подробные сообщения",
    )
    parser.add_argument(
        "-force",
        action="store_true",
        help="Принудительно транскодировать даже если файл уже соответствует требованиям",
    )
    parser.add_argument(
        "-codec",
        type=str,
        default=None,
        help="Явно указать видеокодек (например, libx264, h264_nvenc, h264_videotoolbox)",
    )
    parser.add_argument(
        "-min-mb-per-min",
        type=float,
        default=0.0,
        help="Фильтр: транскодировать только файлы с MB/мин >= указанного порога",
    )
    parser.add_argument(
        "-loop",
        action="store_true",
        help="Бесконечный режим: после завершения ждет и снова сканирует каталог",
    )
    parser.add_argument(
        "-loop-sleep",
        type=int,
        default=60,
        help="Пауза между итерациями в секундах при режиме -loop",
    )
    parser.add_argument(
        "-recursive",
        action="store_true",
        help="Сканировать рекурсивно все подкаталоги (по умолчанию только текущий каталог)",
    )
    parser.add_argument(
        "-jobs",
        type=int,
        default=1,
        help="Количество одновременных процессов ffmpeg (параллельное транскодирование)",
    )
    parser.add_argument(
        "--add-extensions",
        "-add-ext",
        action="append",
        dest="additional_extensions",
        help="Добавить дополнительные расширения видео файлов (например: --add-ext .mxf --add-ext .dv)",
    )
    parser.add_argument(
        "--convert-extension",
        "-convert-ext",
        action="append",
        dest="extension_conversions",
        help="Конвертировать конкретные расширения в другие (формат: источник:цель, например: --convert-ext .mxf:.mp4 --convert-ext .dv:.mov)",
    )
    args = parser.parse_args()

    lang = args.lang
    texts = MESSAGES[lang]

    if not which("ffprobe"):
        print(texts["ffprobe_missing"])
        return 1
    if not which("ffmpeg"):
        print(texts["ffmpeg_missing"])
        return 1

    root = Path(args.directory).resolve()
    
    # Обработка дополнительных расширений
    additional_extensions = set()
    if args.additional_extensions:
        for ext in args.additional_extensions:
            # Убеждаемся, что расширение начинается с точки
            if not ext.startswith('.'):
                ext = '.' + ext
            additional_extensions.add(ext.lower())
        print(texts["added_extensions"].format(extensions=", ".join(sorted(additional_extensions))))
    
    # Обработка конверсий расширений
    extension_conversions = {}
    if args.extension_conversions:
        for conversion in args.extension_conversions:
            if ':' not in conversion:
                print(f"Ошибка: неверный формат конверсии '{conversion}'. Используйте формат 'источник:цель'")
                continue
            source_ext, target_ext = conversion.split(':', 1)
            # Убеждаемся, что расширения начинаются с точки
            if not source_ext.startswith('.'):
                source_ext = '.' + source_ext
            if not target_ext.startswith('.'):
                target_ext = '.' + target_ext
            extension_conversions[source_ext.lower()] = target_ext.lower()
        if extension_conversions:
            conversions_str = ", ".join([f"{src}→{tgt}" for src, tgt in sorted(extension_conversions.items())])
            print(texts["extension_conversions"].format(conversions=conversions_str))

    try:
        while True:
            print(texts["scanning"].format(path=root))

            all_files = list(iter_video_files(root, recursive=args.recursive, additional_extensions=additional_extensions))
            print(texts["found_files"].format(count=len(all_files)))

            print(texts["collecting_info"])
            videos: List[VideoInfo] = []
            for p in all_files:
                info = collect_video_info(p, debug=args.debug)
                if info is not None:
                    videos.append(info)

            # Сортируем по MB/мин (убывание), при равенстве — короче по длительности
            videos.sort(key=lambda v: (-round(v.mb_per_minute, 2), v.duration_minutes))

            if videos:
                print_sorted_table(videos, lang=lang)

            # Применяем фильтр по MB/мин, если задан
            threshold = float(args.min_mb_per_min)
            filtered = [v for v in videos if v.mb_per_minute >= threshold]
            if threshold > 0:
                print(texts["filter_active"].format(thr=threshold, count=len(filtered), total=len(videos)))
            else:
                filtered = videos

            if args.dryrun:
                print(texts["done"])
                if not args.loop:
                    return 0
                time.sleep(max(1, int(args.loop_sleep)))
                continue

            to_process = filtered if not args.limit else filtered[: args.limit]

            if args.jobs <= 1:
                for v in to_process:
                    print(texts["transcoding"].format(file=v.path))
                    ok, skipped = transcode_video(
                        v.path,
                        debug=args.debug,
                        force=args.force,
                        lang=lang,
                        codec=args.codec,
                        extension_conversions=extension_conversions,
                    )
                    if ok and not skipped:
                        print(texts["transcoded_ok"].format(file=v.path))
                    elif not ok:
                        print(texts["transcoded_fail"].format(file=v.path))
            else:
                with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, int(args.jobs))) as executor:
                    future_to_video = {}
                    for v in to_process:
                        print(texts["transcoding"].format(file=v.path))
                        fut = executor.submit(
                            transcode_video,
                            v.path,
                            args.debug,
                            args.force,
                            lang,
                            args.codec,
                            extension_conversions,
                        )
                        future_to_video[fut] = v

                    for fut in concurrent.futures.as_completed(future_to_video):
                        v = future_to_video[fut]
                        try:
                            ok, skipped = fut.result()
                        except Exception:
                            ok, skipped = False, False
                        if ok and not skipped:
                            print(texts["transcoded_ok"].format(file=v.path))
                        elif not ok:
                            print(texts["transcoded_fail"].format(file=v.path))

            print(texts["done"])
            if not args.loop:
                return 0
            time.sleep(max(1, int(args.loop_sleep)))
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
