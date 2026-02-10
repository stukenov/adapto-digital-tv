import os
from pathlib import Path
import time
from utils import is_file_in_use, is_file_being_modified, is_folder_in_use

# Словарь для транслитерации русских букв
RUSSIAN_TRANSLIT = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "yo",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}

# Словарь для транслитерации казахских букв
KAZAKH_TRANSLIT = {
    "ә": "a",
    "і": "i",
    "ң": "n",
    "ғ": "g",
    "ү": "u",
    "ұ": "u",
    "қ": "k",
    "ө": "o",
    "һ": "h",
    "ы": "y",
}


class NameNormalizer:
    def __init__(self, path):
        self.path = Path(path)

    def _transliterate(self, text):
        """Транслитерация текста с учетом русских и казахских букв"""
        result = ""
        for char in text.lower():
            if char in RUSSIAN_TRANSLIT:
                result += RUSSIAN_TRANSLIT[char]
            elif char in KAZAKH_TRANSLIT:
                result += KAZAKH_TRANSLIT[char]
            else:
                result += char
        return result

    def normalize_file(self):
        """Нормализует имя файла и переименовывает его"""
        try:
            # Проверяем не используется ли файл
            if is_file_in_use(self.path):
                raise PermissionError("Файл используется другим процессом")

            # Проверяем не изменяется ли файл
            if is_file_being_modified(self.path):
                raise PermissionError("Файл в процессе изменения")

            original_name = self.path.stem
            extension = self.path.suffix

            # Транслитерация имени
            transliterated = self._transliterate(original_name)

            # Нормализация имени
            normalized = transliterated.replace(" ", "_")
            normalized = "".join(
                c if c.isalnum() or c in "_-" else "-" for c in normalized
            )

            # Формируем новое имя файла
            new_name = normalized + extension
            new_path = self.path.parent / new_name

            # Переименовываем файл
            self.path.rename(new_path)
            return str(new_path)

        except Exception as e:
            print(f"Ошибка при нормализации имени файла: {str(e)}")
            return str(self.path)

    def normalize_folder(self):
        """Нормализует имя папки и переименовывает её"""
        try:
            # Проверяем не используется ли папка
            if is_folder_in_use(self.path):
                raise PermissionError("Папка используется другим процессом")

            original_name = self.path.name

            # Транслитерация имени
            transliterated = self._transliterate(original_name)

            # Нормализация имени
            normalized = transliterated.replace(" ", "_")
            normalized = "".join(
                c if c.isalnum() or c in "_-" else "-" for c in normalized
            )

            # Формируем новый путь
            new_path = self.path.parent / normalized

            # Переименовываем папку
            self.path.rename(new_path)
            return str(new_path)

        except Exception as e:
            print(f"Ошибка при нормализации имени папки: {str(e)}")
            return str(self.path)


# Пример использования:
# file_normalizer = NameNormalizer("путь/к/файлу/привет мир.txt")
# new_file_path = file_normalizer.normalize_file()
# print(f"Файл переименован: {new_file_path}")
#
# folder_normalizer = NameNormalizer("путь/к/папке/привет мир")
# new_folder_path = folder_normalizer.normalize_folder()
# print(f"Папка переименована: {new_folder_path}")
