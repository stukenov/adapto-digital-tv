import tkinter as tk
from tkinter import ttk, filedialog
import os
import shutil
import time
import logging
from datetime import datetime
import json
import sys
import threading
import atexit


# Настройка логирования
logging.basicConfig(
    filename="sync_folders.log", level=logging.INFO, format="%(asctime)s - %(message)s"
)


class FolderSyncGUI:
    def __init__(self):
        self.window = tk.Tk()
        self.window.title("Синхронизация папок")
        self.window.geometry("600x500")
        self.window.protocol("WM_DELETE_WINDOW", self.quit_app)

        # Загрузка сохраненных путей или использование путей по умолчанию
        self.config_file = "sync_config.json"
        self.load_paths()

        # Создание элементов интерфейса
        self.create_widgets()

        # Флаг для работы
        self.running = False

        # Регистрируем функцию очистки при выходе
        atexit.register(self.cleanup)

    def cleanup(self):
        """Очистка ресурсов перед выходом"""
        if hasattr(self, "window"):
            try:
                self.window.quit()
            except:
                pass

    def quit_app(self):
        """Плавное завершение работы приложения"""
        try:
            # Останавливаем синхронизацию
            self.running = False
            if hasattr(self, "sync_thread") and self.sync_thread.is_alive():
                self.sync_thread.join(
                    timeout=5
                )  # Ждем завершения потока не более 5 секунд

            # Закрываем главное окно
            if hasattr(self, "window"):
                self.window.quit()

        except Exception as e:
            logging.error(f"Ошибка при завершении работы: {str(e)}")
        finally:
            sys.exit(0)

    def load_paths(self):
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, "r") as f:
                    paths = json.load(f)
                    self.source_path = paths.get("source", r"\\server\input")
                    self.dest_path = paths.get("dest", r"\\server\output")
            else:
                self.source_path = r"\\server\input"
                self.dest_path = r"\\server\output"
        except Exception as e:
            logging.error(f"Ошибка при загрузке путей: {str(e)}")
            self.source_path = r"\\server\input"
            self.dest_path = r"\\server\output"

    def save_paths(self):
        try:
            paths = {"source": self.source_entry.get(), "dest": self.dest_entry.get()}
            with open(self.config_file, "w") as f:
                json.dump(paths, f)
        except Exception as e:
            logging.error(f"Ошибка при сохранении путей: {str(e)}")

    def browse_folder(self, entry):
        folder_path = filedialog.askdirectory()
        if folder_path:
            entry.delete(0, tk.END)
            entry.insert(0, folder_path)
            self.save_paths()  # Сохраняем пути при изменении

    def create_widgets(self):
        # Фрейм для ввода путей
        path_frame = ttk.LabelFrame(self.window, text="Настройки путей", padding=10)
        path_frame.pack(fill="x", padx=10, pady=5)

        # Поля ввода для путей с кнопками выбора
        source_frame = ttk.Frame(path_frame)
        source_frame.pack(fill="x", pady=2)
        ttk.Label(source_frame, text="Путь источника:").pack(side="left")
        self.source_entry = ttk.Entry(source_frame, width=45)
        self.source_entry.insert(0, self.source_path)
        self.source_entry.pack(side="left", padx=5)
        ttk.Button(
            source_frame,
            text="Обзор",
            command=lambda: self.browse_folder(self.source_entry),
        ).pack(side="left")

        dest_frame = ttk.Frame(path_frame)
        dest_frame.pack(fill="x", pady=2)
        ttk.Label(dest_frame, text="Путь назначения:").pack(side="left")
        self.dest_entry = ttk.Entry(dest_frame, width=45)
        self.dest_entry.insert(0, self.dest_path)
        self.dest_entry.pack(side="left", padx=5)
        ttk.Button(
            dest_frame,
            text="Обзор",
            command=lambda: self.browse_folder(self.dest_entry),
        ).pack(side="left")

        # Привязываем событие изменения текста к сохранению путей
        self.source_entry.bind("<KeyRelease>", lambda e: self.save_paths())
        self.dest_entry.bind("<KeyRelease>", lambda e: self.save_paths())

        # Прогресс бар
        progress_frame = ttk.LabelFrame(
            self.window, text="Прогресс копирования", padding=10
        )
        progress_frame.pack(fill="x", padx=10, pady=5)

        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(
            progress_frame, variable=self.progress_var, maximum=100
        )
        self.progress_bar.pack(fill="x", pady=5)

        self.progress_label = ttk.Label(progress_frame, text="")
        self.progress_label.pack()

        # Кнопки управления
        control_frame = ttk.Frame(self.window)
        control_frame.pack(pady=10)

        self.start_button = ttk.Button(
            control_frame, text="Старт", command=self.start_sync
        )
        self.start_button.pack(side="left", padx=5)

        self.stop_button = ttk.Button(
            control_frame, text="Стоп", command=self.stop_sync
        )
        self.stop_button.pack(side="left", padx=5)

        # Лог операций
        log_frame = ttk.LabelFrame(self.window, text="Лог операций", padding=10)
        log_frame.pack(fill="both", expand=True, padx=10, pady=5)

        self.log_text = tk.Text(log_frame, height=10, wrap="word")
        self.log_text.pack(fill="both", expand=True)

        scrollbar = ttk.Scrollbar(
            log_frame, orient="vertical", command=self.log_text.yview
        )
        scrollbar.pack(side="right", fill="y")
        self.log_text.configure(yscrollcommand=scrollbar.set)

    def log_message(self, message):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.log_text.insert("end", f"{timestamp} - {message}\n")
        self.log_text.see("end")
        logging.info(message)

    def get_relative_path(self, full_path, base_path):
        return os.path.relpath(full_path, base_path)

    def process_file(self, source_file, dest_file):
        try:
            # Проверка размера файла
            initial_size = os.path.getsize(source_file)
            time.sleep(1)  # Ждем секунду
            current_size = os.path.getsize(source_file)

            # Если размер не изменился и файл не пустой
            if initial_size == current_size and initial_size > 0:
                # Создаем структуру папок в назначении
                os.makedirs(os.path.dirname(dest_file), exist_ok=True)

                # Получаем относительные пути для лога
                source_rel = self.get_relative_path(
                    source_file, self.source_entry.get()
                )
                dest_rel = self.get_relative_path(dest_file, self.dest_entry.get())

                # Копируем файл с прогресс баром
                self.copy_with_progress(source_file, dest_file, initial_size)
                self.log_message(
                    f"✅ Копирование завершено\n   📁 Из: ./{source_rel}\n   📁 В: ./{dest_rel}\n   📊 Размер: {initial_size/1024:.1f} КБ"
                )

                # Создаем пустой файл на месте оригинала
                with open(source_file, "w") as f:
                    pass
                self.log_message(f"🗑️ Очищен исходный файл: ./{source_rel}")

                return True
            return False
        except Exception as e:
            self.log_message(
                f"❌ Ошибка при обработке ./{self.get_relative_path(source_file, self.source_entry.get())}: {str(e)}"
            )
            return False

    def copy_with_progress(self, source, dest, total_size):
        with open(source, "rb") as fsrc:
            with open(dest, "wb") as fdst:
                copied = 0
                while True:
                    buf = fsrc.read(1024 * 1024)  # Читаем по 1 МБ
                    if not buf:
                        break
                    fdst.write(buf)
                    copied += len(buf)
                    progress = (copied / total_size) * 100

                    # Обновляем прогресс бар и метку
                    self.progress_var.set(progress)
                    self.progress_label.config(
                        text=f"Скопировано: {copied/1024:.1f} КБ из {total_size/1024:.1f} КБ ({progress:.1f}%)"
                    )
                    self.window.update()

    def sync_folders(self):
        while self.running:
            try:
                source_path = self.source_entry.get()
                dest_path = self.dest_entry.get()

                if not os.path.exists(source_path):
                    self.log_message(
                        f"⚠️ Путь источника не существует: ./{self.get_relative_path(source_path, os.getcwd())}"
                    )
                    time.sleep(5)
                    continue

                for root, dirs, files in os.walk(source_path):
                    if not self.running:
                        break

                    for file in files:
                        if not self.running:
                            break

                        source_file = os.path.join(root, file)
                        relative_path = os.path.relpath(source_file, source_path)
                        dest_file = os.path.join(dest_path, relative_path)

                        self.process_file(source_file, dest_file)

                # Сбрасываем прогресс бар после каждого цикла
                self.progress_var.set(0)
                self.progress_label.config(text="")
                time.sleep(5)  # Пауза между циклами

            except Exception as e:
                self.log_message(f"❌ Ошибка: {str(e)}")
                time.sleep(5)

    def start_sync(self):
        if not self.running:
            self.running = True
            self.start_button.state(["disabled"])
            self.stop_button.state(["!disabled"])
            self.log_message("🚀 Синхронизация запущена")

            # Запускаем процесс синхронизации в отдельном потоке
            self.sync_thread = threading.Thread(target=self.sync_folders, daemon=True)
            self.sync_thread.start()

    def stop_sync(self):
        if self.running:
            self.running = False
            self.start_button.state(["!disabled"])
            self.stop_button.state(["disabled"])
            self.log_message("🛑 Синхронизация остановлена")

    def run(self):
        try:
            # Автоматически запускаем синхронизацию при старте
            self.start_sync()
            self.window.mainloop()
        except Exception as e:
            logging.error(f"Критическая ошибка в главном цикле: {str(e)}")
        finally:
            self.cleanup()


if __name__ == "__main__":
    app = FolderSyncGUI()
    app.run()
