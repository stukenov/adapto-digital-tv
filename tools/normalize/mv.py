import os
import time
import shutil
from pathlib import Path
from utils import is_file_in_use, is_folder_in_use
from walk_folders import FolderWalker
import logging
import sys
from urllib.parse import unquote, urlparse

# Настройка логирования в stdout
logging.basicConfig(
    level=logging.DEBUG,  # Изменено на DEBUG для более детального логирования
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],  # Явно указываем вывод в stdout
)
logger = logging.getLogger(__name__)


def normalize_path(path_str):
    """
    Нормализует путь, конвертируя URL в локальный путь если нужно
    """
    try:
        # Декодируем URL-encoded символы
        path_str = unquote(path_str)

        # Проверяем является ли путь URL
        if path_str.startswith(("http://", "https://")):
            parsed = urlparse(path_str)
            # Извлекаем путь из URL и конвертируем в локальный
            path_parts = parsed.path.split("/")
            if "files" in path_parts:
                # Убираем 'files' и все что до него
                idx = path_parts.index("files")
                path_parts = path_parts[idx + 1 :]
            # Собираем локальный путь
            local_path = "/srv/" + "/".join(filter(None, path_parts))
            return local_path
        return path_str
    except Exception as e:
        logger.error(f"Ошибка при нормализации пути {path_str}: {str(e)}")
        return path_str


def get_folder_pairs():
    """
    Читает все .txt файлы из папки sources и возвращает список пар [исходник, назначение]
    """
    sources_dir = Path("sources")
    pairs = []

    logger.debug(f"Чтение файлов из директории: {sources_dir}")

    if not sources_dir.exists():
        logger.error("Директория sources не существует")
        return pairs

    for txt_file in sources_dir.glob("*.txt"):
        try:
            logger.debug(f"Чтение файла: {txt_file}")
            with open(txt_file, "r") as f:
                lines = f.readlines()
                if len(lines) >= 2:
                    src = normalize_path(lines[0].strip())
                    dst = normalize_path(lines[1].strip())
                    # Проверяем валидность путей
                    try:
                        Path(src)
                        Path(dst)
                        pairs.append([src, dst])
                        logger.debug(f"Добавлена пара путей: {src} -> {dst}")
                    except Exception as e:
                        logger.warning(
                            f"Некорректный формат пути в файле {txt_file}: {str(e)}"
                        )
                        continue
                else:
                    logger.warning(f"Файл {txt_file} имеет неверный формат")
        except Exception as e:
            logger.error(f"Ошибка при чтении файла {txt_file}: {str(e)}")

    return pairs


def move_item(src, dst):
    """
    Перемещает файл или папку из src в dst
    """
    try:
        logger.debug(f"Начало операции перемещения из {src} в {dst}")
        try:
            src_path = Path(normalize_path(src))
            dst_path = Path(normalize_path(dst))
        except Exception as e:
            logger.error(f"Некорректный формат пути: {str(e)}")
            return False

        # Проверяем существование исходного пути
        logger.debug(f"Проверка существования пути: {src}")
        if not src_path.exists():
            logger.error(f"Путь не существует: {src}")
            return False

        # Создаем папку назначения если её нет
        try:
            logger.debug(f"Создание родительской директории: {dst_path.parent}")
            dst_path.parent.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.error(f"Не удалось создать директорию назначения: {str(e)}")
            return False

        # Если это папка
        if src_path.is_dir():
            logger.debug(f"Обнаружена папка: {src}")
            logger.debug(f"Проверка использования папки: {src}")
            if is_folder_in_use(src_path):
                logger.warning(f"Папка используется: {src}")
                return False
            logger.debug(f"Начало перемещения папки: {src} -> {dst}")
            shutil.move(str(src_path), str(dst_path))
            logger.info(f"Перемещена папка: {src} -> {dst}")

        # Если это файл
        else:
            logger.debug(f"Обнаружен файл: {src}")
            logger.debug(f"Проверка использования файла: {src}")
            if is_file_in_use(src_path):
                logger.warning(f"Файл используется: {src}")
                return False
            logger.debug(f"Начало перемещения файла: {src} -> {dst}")
            shutil.move(str(src_path), str(dst_path))
            logger.info(f"Перемещен файл: {src} -> {dst}")

        logger.debug(f"Операция перемещения успешно завершена: {src} -> {dst}")
        return True

    except Exception as e:
        logger.error(f"Ошибка при перемещении {src}: {str(e)}")
        logger.debug(f"Стек ошибки:", exc_info=True)
        return False


def process_folders():
    """
    Основной цикл обработки папок
    """
    logger.info("Запуск процесса обработки папок")
    while True:
        try:
            logger.debug("Начало нового цикла обработки")

            # Получаем актуальный список папок для перемещения
            folder_pairs = get_folder_pairs()
            logger.debug(f"Получено пар папок для обработки: {len(folder_pairs)}")

            for src_folder, dst_folder in folder_pairs:
                try:
                    logger.debug(f"Обработка пары папок: {src_folder} -> {dst_folder}")
                    src_path = Path(normalize_path(src_folder))
                    dst_path = Path(normalize_path(dst_folder))
                except Exception as e:
                    logger.error(f"Некорректный формат пути: {str(e)}")
                    continue

                logger.debug(f"Проверка существования исходной папки: {src_folder}")
                if not src_path.exists():
                    logger.error(f"Исходная папка не существует: {src_folder}")
                    continue

                # Получаем список всех файлов и папок
                try:
                    logger.debug(f"Сканирование папки: {src_folder}")
                    walker = FolderWalker(src_folder)
                    all_files = walker.get_all_files()
                    all_folders = walker.get_all_folders()
                    logger.debug(
                        f"Найдено файлов: {len(all_files)}, папок: {len(all_folders)}"
                    )
                except Exception as e:
                    logger.error(
                        f"Ошибка при сканировании папки {src_folder}: {str(e)}"
                    )
                    continue

                # Сначала обрабатываем отдельные файлы в корне
                logger.debug("Начало обработки корневых файлов")
                root_files = [
                    f for f in all_files if Path(normalize_path(f)).parent == src_path
                ]
                logger.debug(f"Найдено файлов в корне: {len(root_files)}")
                for file_path in root_files:
                    try:
                        logger.debug(f"Обработка файла: {file_path}")
                        rel_path = Path(normalize_path(file_path)).relative_to(src_path)
                        dst_file = dst_path / rel_path
                        move_item(file_path, dst_file)
                    except Exception as e:
                        logger.error(
                            f"Ошибка при обработке файла {file_path}: {str(e)}"
                        )
                        continue

                # Затем обрабатываем папки
                logger.debug("Начало обработки корневых папок")
                root_folders = [
                    f for f in all_folders if Path(normalize_path(f)).parent == src_path
                ]
                logger.debug(f"Найдено папок в корне: {len(root_folders)}")
                for folder_path in root_folders:
                    try:
                        logger.debug(f"Обработка папки: {folder_path}")
                        rel_path = Path(normalize_path(folder_path)).relative_to(
                            src_path
                        )
                        dst_folder_path = dst_path / rel_path
                        move_item(folder_path, dst_folder_path)
                    except Exception as e:
                        logger.error(
                            f"Ошибка при обработке папки {folder_path}: {str(e)}"
                        )
                        continue

            logger.info("Цикл обработки завершен, пауза 10 секунд")
            time.sleep(10)

        except Exception as e:
            logger.error(f"Ошибка в процессе работы: {str(e)}")
            logger.debug("Стек ошибки:", exc_info=True)
            time.sleep(10)


if __name__ == "__main__":
    logger.info("Запуск программы")
    process_folders()
