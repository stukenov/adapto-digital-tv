import os
from pathlib import Path


class FolderWalker:
    def __init__(self, folder_path):
        # Преобразуем путь в объект Path для кроссплатформенности
        self.folder_path = Path(folder_path)

    def get_all_files(self):
        files_list = []

        try:
            for root, dirs, files in os.walk(self.folder_path):
                for file in files:
                    # Используем Path для корректной работы с путями
                    full_path = Path(root) / file
                    # Преобразуем в абсолютный путь
                    abs_path = str(full_path.resolve())
                    files_list.append(abs_path)

        except Exception as e:
            print(f"Ошибка при сканировании папки: {str(e)}")

        return files_list

    def get_all_folders(self):
        folders_list = []

        try:
            for root, dirs, files in os.walk(self.folder_path):
                for dir in dirs:
                    # Используем Path для корректной работы с путями
                    full_path = Path(root) / dir
                    # Преобразуем в абсолютный путь
                    abs_path = str(full_path.resolve())
                    folders_list.append(abs_path)

        except Exception as e:
            print(f"Ошибка при сканировании папок: {str(e)}")

        return folders_list


# Пример использования:
# walker = FolderWalker("C:/Users/sakentukenov/Videos/")  # Используем домашнюю директорию пользователя
# files = walker.get_all_files()
# folders = walker.get_all_folders()
# print(files)
# print(folders)
