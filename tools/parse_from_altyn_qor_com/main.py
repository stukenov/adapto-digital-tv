import os
import sqlite3
import paramiko
from transliterate import translit
from bs4 import BeautifulSoup
import requests
import logging
from tqdm import tqdm

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("parser.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def kaz_translit(text):
    # Казахский алфавит транслитерация
    kaz_letters = {
        "ә": "a",
        "і": "i",
        "ң": "n",
        "ғ": "g",
        "ү": "u",
        "ұ": "u",
        "қ": "q",
        "ө": "o",
        "һ": "h",
        "ї": "i",
        "ў": "u",
        "ґ": "g",
        "Ә": "A",
        "І": "I",
        "Ң": "N",
        "Ғ": "G",
        "Ү": "U",
        "Ұ": "U",
        "Қ": "Q",
        "Ө": "O",
        "Һ": "H",
        "Ї": "I",
        "Ў": "U",
        "Ґ": "G",
    }

    logger.debug(f"Начало транслитерации текста: {text}")
    # Сначала заменяем казахские буквы
    for kaz, lat in kaz_letters.items():
        text = text.replace(kaz, lat)

    # Затем транслитерируем оставшиеся русские буквы
    text = translit(text, "ru", reversed=True)
    logger.debug(f"Результат транслитерации: {text}")

    return text


def process_links():
    logger.info("Начало обработки ссылок")

    try:
        # Определяем директорию для сохранения файлов
        output_dir = os.path.join(os.getcwd(), "downloads")
        # Проверяем реальный путь с учетом возможных симлинков
        real_output_dir = os.path.realpath(output_dir)

        # Создаем директорию, если она не существует
        if not os.path.exists(real_output_dir):
            os.makedirs(real_output_dir)
        logger.info(f"Директория для сохранения файлов: {real_output_dir}")

        # Чтение файла со ссылками
        with open("links.txt", "r", encoding="utf-8") as file:
            links = file.readlines()
        logger.info(f"Загружено {len(links)} ссылок из файла")

        # Подключение к базе данных
        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()
        logger.info("Успешное подключение к базе данных")

        # Настройка SSH подключения
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("your-host", username="dl", password="your-password")
        sftp = ssh.open_sftp()
        logger.info("Успешное подключение по SSH")

        # Добавляем прогресс-бар
        for link in tqdm(links, desc="Обработка ссылок", unit="ссылка"):
            link = link.strip()
            logger.info(f"Обработка ссылки: {link}")

            # Проверяем, содержит ли строка маркер DONE
            if "|DONE" not in link:
                try:
                    # Получаем ID из ссылки
                    video_id = link.split("/")[-1]
                    logger.debug(f"ID видео: {video_id}")

                    # Получаем HTML страницы для названия
                    response = requests.get(link)
                    soup = BeautifulSoup(response.text, "html.parser")
                    logger.debug("HTML страница успешно загружена")

                    # Получаем текст из h1
                    h1_text = soup.find("h1").text.strip()
                    logger.debug(f"Найден заголовок: {h1_text}")

                    # Транслитерация текста с поддержкой казахских букв
                    new_file_name = kaz_translit(h1_text)

                    # Очистка имени файла от недопустимых символов
                    new_file_name = "".join(
                        c for c in new_file_name if c.isalnum() or c in (" ", "-", "_")
                    ).strip()
                    new_file_name = new_file_name.replace(" ", "_") + ".mp4"
                    # Формируем полный путь для нового файла
                    new_file_path = os.path.join(real_output_dir, new_file_name)
                    logger.debug(
                        f"Сформирован полный путь нового файла: {new_file_path}"
                    )

                    # Получаем source_file из базы данных
                    cursor.execute(
                        "SELECT source_file FROM videos WHERE id = ?", (video_id,)
                    )
                    result = cursor.fetchone()

                    if result:
                        source_file = result[0]
                        remote_path = f"/mnt/sdb/your-host/storage/app/videos/{source_file}"
                        logger.debug(f"Найден исходный файл: {source_file}")

                        # Создаем временную директорию для загрузки
                        temp_download_path = os.path.join(
                            real_output_dir, f"temp_{video_id}.mp4"
                        )

                        # Скачиваем файл с прогресс-баром
                        logger.info(f"Начало загрузки файла: {remote_path}")

                        # Получаем размер файла
                        file_size = sftp.stat(remote_path).st_size
                        with tqdm(
                            total=file_size,
                            desc="Загрузка файла",
                            unit="B",
                            unit_scale=True,
                        ) as pbar:

                            def callback(bytes_transferred, _):
                                pbar.update(bytes_transferred - pbar.n)

                            sftp.get(remote_path, temp_download_path, callback=callback)

                        logger.info("Файл успешно загружен")

                        # Переименовываем файл
                        os.rename(temp_download_path, new_file_path)
                        logger.info(f"Файл сохранен как: {new_file_path}")

                        # Обновляем файл links.txt, добавляя маркер DONE
                        with open("links.txt", "r", encoding="utf-8") as file:
                            lines = file.readlines()

                        with open("links.txt", "w", encoding="utf-8") as file:
                            for l in lines:
                                if l.strip() == link:
                                    file.write(f"{link}|DONE\n")
                                else:
                                    file.write(l)
                        logger.info("Файл links.txt обновлен")

                        logger.info(f"Обработана ссылка: {link}")
                        logger.info(f"Создан файл: {new_file_path}")
                    else:
                        logger.warning(
                            f"Не найдена запись в базе данных для ID: {video_id}"
                        )

                except Exception as e:
                    logger.error(
                        f"Ошибка при обработке ссылки {link}: {str(e)}", exc_info=True
                    )
                    continue

        # Закрываем соединения
        cursor.close()
        conn.close()
        sftp.close()
        ssh.close()
        logger.info("Все соединения закрыты")

    except Exception as e:
        logger.critical(f"Критическая ошибка: {str(e)}", exc_info=True)
        raise


if __name__ == "__main__":
    process_links()
