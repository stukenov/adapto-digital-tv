import os
import time
from ftplib import FTP
import logging
from datetime import datetime
from tqdm import tqdm

# Создаем папку для логов если её нет
LOG_DIR = "logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# Настройка логирования
log_filename = os.path.join(
    LOG_DIR, f'ftp_sync_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_filename, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# Параметры FTP подключения
FTP_HOST = "89.223.4.174"
FTP_USER = "ftpuser"
FTP_PASS = "your-password"
FTP_PORT = 21
DOWNLOAD_PATH = "downloads"  # Папка для скачивания файлов


def connect_ftp():
    """Подключение к FTP серверу"""
    try:
        logger.info(f"Попытка подключения к FTP серверу {FTP_HOST}:{FTP_PORT}")
        ftp = FTP()
        ftp.connect(FTP_HOST, FTP_PORT)
        ftp.login(FTP_USER, FTP_PASS)
        logger.info("Успешное подключение к FTP серверу")
        return ftp
    except Exception as e:
        logger.error(f"Ошибка подключения к FTP: {e}", exc_info=True)
        return None


def get_file_size(ftp, filename):
    """Получение размера файла"""
    try:
        size = ftp.size(filename)
        logger.debug(f"Размер файла {filename}: {size} байт")
        return size
    except Exception as e:
        logger.warning(f"Не удалось получить размер файла {filename}: {e}")
        return 0


def check_file_growth(ftp, filename):
    """Проверка роста файла в течение 20 секунд"""
    logger.info(f"Начало проверки роста файла {filename}")
    initial_size = get_file_size(ftp, filename)
    logger.debug(f"Начальный размер файла {filename}: {initial_size} байт")
    time.sleep(20)
    final_size = get_file_size(ftp, filename)
    logger.debug(f"Конечный размер файла {filename}: {final_size} байт")
    is_growing = final_size > initial_size
    logger.info(f"Файл {filename} {'растет' if is_growing else 'не растет'}")
    return is_growing


def download_file(ftp, filename):
    """Скачивание файла"""
    local_filename = os.path.join(DOWNLOAD_PATH, filename)
    logger.info(f"Начало скачивания файла {filename} в {local_filename}")
    try:
        start_time = time.time()

        # Получаем размер файла для прогресс-бара
        file_size = get_file_size(ftp, filename)

        with open(local_filename, "wb") as f:
            # Создаем прогресс-бар
            with tqdm(
                total=file_size, unit="B", unit_scale=True, desc=filename
            ) as pbar:

                def callback(data):
                    f.write(data)
                    pbar.update(len(data))

                ftp.retrbinary(f"RETR {filename}", callback)

        download_time = time.time() - start_time

        # Проверка корректности скачивания
        local_size = os.path.getsize(local_filename)
        remote_size = get_file_size(ftp, filename)

        logger.info(f"Время скачивания: {download_time:.2f} сек")
        logger.info(f"Размер локального файла: {local_size} байт")
        logger.info(f"Размер удаленного файла: {remote_size} байт")

        if local_size == remote_size:
            logger.info(f"Файл {filename} успешно скачан")
            return True
        else:
            logger.error(f"Ошибка скачивания файла {filename}: размеры не совпадают")
            os.remove(local_filename)
            logger.info(f"Удален некорректно скачанный файл {local_filename}")
            return False
    except Exception as e:
        logger.error(f"Ошибка при скачивании {filename}: {e}", exc_info=True)
        if os.path.exists(local_filename):
            os.remove(local_filename)
            logger.info(f"Удален частично скачанный файл {local_filename}")
        return False


def delete_remote_file(ftp, filename):
    """Удаление файла с FTP сервера"""
    try:
        logger.info(f"Попытка удаления файла {filename} с FTP сервера")
        ftp.delete(filename)
        logger.info(f"Файл {filename} успешно удален с FTP сервера")
        return True
    except Exception as e:
        logger.error(f"Ошибка удаления файла {filename}: {e}", exc_info=True)
        return False


def main():
    """Основной цикл работы"""
    logger.info("Запуск программы")

    # Создаем папку для скачивания если её нет
    if not os.path.exists(DOWNLOAD_PATH):
        logger.info(f"Создание директории {DOWNLOAD_PATH}")
        os.makedirs(DOWNLOAD_PATH)

    while True:
        logger.info("Начало нового цикла")
        ftp = connect_ftp()
        if not ftp:
            logger.error(
                "Не удалось подключиться к FTP. Повторная попытка через 10 секунд"
            )
            time.sleep(10)
            continue

        try:
            # Получаем список файлов
            logger.info("Получение списка файлов")
            files = ftp.nlst()
            logger.info(f"Найдено файлов: {len(files)}")

            for filename in files:
                # Пропускаем директории и системные файлы
                if filename.startswith("."):
                    logger.debug(f"Пропуск системного файла: {filename}")
                    continue

                logger.info(f"Обработка файла {filename}")

                # Проверяем рост файла
                if not check_file_growth(ftp, filename):
                    logger.info(f"Файл {filename} не растет, начинаем скачивание")

                    # Скачиваем файл
                    if download_file(ftp, filename):
                        # Удаляем файл с сервера если скачивание успешно
                        delete_remote_file(ftp, filename)

            logger.info("Ожидание 10 секунд перед следующей итерацией")
            time.sleep(10)

        except Exception as e:
            logger.error(f"Произошла ошибка: {e}", exc_info=True)
            time.sleep(10)
        finally:
            try:
                logger.info("Закрытие FTP соединения")
                ftp.quit()
            except Exception as e:
                logger.error(f"Ошибка при закрытии FTP соединения: {e}")


if __name__ == "__main__":
    main()
