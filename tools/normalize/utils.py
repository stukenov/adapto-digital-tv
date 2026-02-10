import os
import time
from pathlib import Path


def is_file_in_use(path):
    """
    Проверяет используется ли файл в данный момент

    Args:
        path: путь к файлу

    Returns:
        bool: True если файл используется, False если свободен
    """
    try:
        with open(path, "rb+") as f:
            return False
    except (IOError, PermissionError):
        return True


def is_file_being_modified(path):
    """
    Проверяет не изменяется ли файл в данный момент

    Args:
        path: путь к файлу

    Returns:
        bool: True если файл изменяется, False если нет
    """
    try:
        size1 = os.path.getsize(path)
        time.sleep(1)
        size2 = os.path.getsize(path)
        return size1 != size2
    except (OSError, FileNotFoundError):
        return False


def is_folder_in_use(path):
    """
    Проверяет используется ли папка в данный момент

    Args:
        path: путь к папке

    Returns:
        bool: True если папка используется, False если свободна
    """
    try:
        test_file = path / ".test_access"
        test_file.touch()
        test_file.unlink()
        return False
    except (IOError, PermissionError):
        return True
