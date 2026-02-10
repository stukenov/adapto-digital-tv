from pathlib import Path
import walk_folders
import normalize_name
import fast_database
import normalize_container
import normalize_audio
import normalize_video

# Список папок для обработки
folders_to_process = [
    # "/srv/ffplayout-media"
    # "C:/Users/sakentukenov/Videos/",
    # Добавьте сюда другие папки для обработки
    # "C:/Users/sakentukenov/Documents/",
    # "D:/Photos/",
]


def process_folder(folder_path):
    print(f"\nОбработка папки: {folder_path}")

    # Инициализация базы данных
    db = fast_database.FastDB("normalized_paths.json")

    # Создаем таблицы только если их нет
    if not db.table_exists("files"):
        db.create_table("files", ["original_path", "new_path"])
    if not db.table_exists("folders"):
        db.create_table("folders", ["original_path", "new_path"])
    if not db.table_exists("containers"):
        db.create_table("containers", ["original_path", "new_path", "status"])
    if not db.table_exists("audio"):
        db.create_table("audio", ["original_path", "new_path", "status"])
    if not db.table_exists("video"):
        db.create_table("video", ["original_path", "new_path", "status"])

    # Сначала обрабатываем все подпапки
    folders = walk_folders.FolderWalker(folder_path).get_all_folders()
    # Сортируем папки по глубине (сначала самые глубокие)
    folders.sort(key=lambda x: x.count("\\"), reverse=True)

    for folder in folders:
        # Проверяем, была ли папка уже обработана
        results = db.search("folders", {"original_path": folder})
        if results:
            print(f"Папка уже была обработана ранее: {results[0]['new_path']}")
            continue

        normalizer = normalize_name.NameNormalizer(folder)
        new_path = normalizer.normalize_folder()

        # Сохраняем информацию в базу данных
        db.insert("folders", {"original_path": folder, "new_path": new_path})
        print(f"Папка переименована: {new_path}")

    # После переименования всех папок обрабатываем файлы
    files = walk_folders.FolderWalker(folder_path).get_all_files()
    for file in files:
        # Проверяем, был ли файл уже обработан
        results = db.search("files", {"original_path": file})
        if results:
            print(f"Файл уже был обработан ранее: {results[0]['new_path']}")
            continue

        normalizer = normalize_name.NameNormalizer(file)
        new_path = normalizer.normalize_file()

        # Сохраняем информацию в базу данных
        db.insert("files", {"original_path": file, "new_path": new_path})
        print(f"Файл переименован: {new_path}")

    # После переименования нормализуем контейнеры видео
    files = walk_folders.FolderWalker(folder_path).get_all_files()
    for file in files:
        # Проверяем расширение файла (видео форматы)
        if file.lower().endswith(
            (".mp4", ".avi", ".mov", ".wmv", ".flv", ".mxf", ".mpeg", ".mpg", ".mkv")
        ):
            # Проверяем, был ли контейнер уже обработан
            results = db.search("containers", {"original_path": file})
            if results:
                print(f"Контейнер уже был обработан ранее: {results[0]['new_path']}")
                continue

            # Включаем режим отладки для отображения дополнительной информации
            container_normalizer = normalize_container.ContainerNormalizer(
                file, debug=True
            )
            success = container_normalizer.normalize_container()

            # Формируем новый путь с учетом оригинального расширения
            new_path = str(Path(file).with_suffix(".mkv"))

            # Сохраняем информацию в базу данных
            db.insert(
                "containers",
                {
                    "original_path": file,
                    "new_path": new_path,
                    "status": "success" if success else "failed",
                },
            )

            if success:
                print(f"Контейнер успешно нормализован: {new_path}")
            else:
                print(f"Ошибка при нормализации контейнера: {file}")

    # После нормализации видео обрабатываем аудио
    files = walk_folders.FolderWalker(folder_path).get_all_files()
    for file in files:
        # Проверяем расширение файла (видео и аудио форматы)
        if file.lower().endswith(
            (
                ".mp4",
                ".avi",
                ".mov",
                ".wmv",
                ".flv",
                ".mxf",
                ".mpeg",
                ".mpg",
                ".mkv",
                ".mp3",
                ".wav",
                ".aac",
                ".m4a",
                ".wma",
                ".ogg",
            )
        ):
            # Проверяем, было ли аудио уже обработано
            results = db.search("audio", {"original_path": file})
            if results:
                print(f"Аудио уже было обработано ранее: {results[0]['new_path']}")
                continue

            # Включаем режим отладки для отображения дополнительной информации
            audio_normalizer = normalize_audio.AudioNormalizer(file, debug=True)
            success = audio_normalizer.normalize_audio()

            # Сохраняем информацию в базу данных
            db.insert(
                "audio",
                {
                    "original_path": file,
                    "new_path": file,  # путь тот же, т.к. файл перезаписывается на месте
                    "status": "success" if success else "failed",
                },
            )

            if success:
                print(f"Аудио успешно нормализовано: {file}")
            else:
                print(f"Ошибка при нормализации аудио: {file}")

    # После нормализации контейнеров нормализуем видео
    files = walk_folders.FolderWalker(folder_path).get_all_files()
    for file in files:
        # Проверяем расширение файла (видео форматы)
        if file.lower().endswith(
            (".mp4", ".avi", ".mov", ".wmv", ".flv", ".mxf", ".mpeg", ".mpg", ".mkv")
        ):
            # Проверяем, было ли видео уже обработано
            results = db.search("video", {"original_path": file})
            if results:
                print(f"Видео уже было обработано ранее: {results[0]['new_path']}")
                continue

            # Включаем режим отладки для отображения дополнительной информации
            video_normalizer = normalize_video.VideoNormalizer(file, debug=True)
            success = video_normalizer.normalize_video()

            # Сохраняем информацию в базу данных
            db.insert(
                "video",
                {
                    "original_path": file,
                    "new_path": file,  # путь тот же, т.к. файл перезаписывается на месте
                    "status": "success" if success else "failed",
                },
            )

            if success:
                print(f"Видео успешно нормализовано: {file}")
            else:
                print(f"Ошибка при нормализации видео: {file}")


# Обработка всех указанных папок
for folder in folders_to_process:
    process_folder(folder)
