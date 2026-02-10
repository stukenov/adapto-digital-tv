import json
import os
from pathlib import Path


class FastDB:
    """Простая и быстрая база данных для табличных данных"""

    def __init__(self, db_name="fast_db.json"):
        """
        Инициализация базы данных
        :param db_name: имя файла базы данных
        """
        # Создаем папку db если её нет
        self.db_folder = Path("db")
        self.db_folder.mkdir(exist_ok=True)

        # Путь к файлу БД внутри папки db
        self.db_path = self.db_folder / db_name
        self.data = self._load_db()

    def _load_db(self):
        """Загрузка данных из файла"""
        if self.db_path.exists():
            try:
                with open(self.db_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except json.JSONDecodeError:
                return {"tables": {}}
        return {"tables": {}}

    def _save_db(self):
        """Сохранение данных в файл"""
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)

    def create_table(self, table_name, columns):
        """
        Создание новой таблицы
        :param table_name: имя таблицы
        :param columns: список колонок
        """
        if table_name not in self.data["tables"]:
            self.data["tables"][table_name] = {"columns": columns, "rows": []}
            self._save_db()
            print(f"Создана таблица '{table_name}' с колонками: {columns}")
        else:
            print(f"Таблица '{table_name}' уже существует")

    def table_exists(self, table_name):
        """
        Проверка существования таблицы
        :param table_name: имя таблицы
        :return: True если таблица существует, False если нет
        """
        return table_name in self.data["tables"]

    def insert(self, table_name, row_data):
        """
        Вставка данных в таблицу
        :param table_name: имя таблицы
        :param row_data: словарь с данными строки
        """
        if table_name in self.data["tables"]:
            table = self.data["tables"][table_name]
            if all(col in row_data for col in table["columns"]):
                table["rows"].append(row_data)
                self._save_db()
                print(f"Данные успешно добавлены в таблицу '{table_name}'")
            else:
                print("Ошибка: не все колонки заполнены")
        else:
            print(f"Таблица '{table_name}' не существует")

    def search(self, table_name, conditions):
        """
        Поиск данных в таблице
        :param table_name: имя таблицы
        :param conditions: словарь с условиями поиска
        :return: список найденных строк
        """
        if table_name in self.data["tables"]:
            results = []
            for row in self.data["tables"][table_name]["rows"]:
                if all(row.get(key) == value for key, value in conditions.items()):
                    results.append(row)
            return results
        return []

    def display_table(self, table_name):
        """
        Вывод содержимого таблицы
        :param table_name: имя таблицы
        """
        if table_name in self.data["tables"]:
            table = self.data["tables"][table_name]
            print(f"\nТаблица: {table_name}")
            print("Колонки:", table["columns"])
            print("\nДанные:")
            for row in table["rows"]:
                print(row)
        else:
            print(f"Таблица '{table_name}' не существует")
