#!/bin/bash

# Скрипт для создания суперпользователя в Adapto
# Этот скрипт можно использовать для ручного создания админа

echo "Adapto - Создание суперпользователя"
echo "=================================="

# Переходим в директорию с Django приложением
cd /app

# Запускаем команду создания суперпользователя
python manage.py create_superuser_auto

# Показываем созданные данные
echo ""
echo "Проверка созданного файла с данными админа:"
if [ -f "/tmp/adapto_admin_info.txt" ]; then
    cat /tmp/adapto_admin_info.txt
else
    echo "Файл с данными админа не найден."
fi

echo ""
echo "Готово! Админ-панель доступна по адресу: https://dash.example.com/admin/"