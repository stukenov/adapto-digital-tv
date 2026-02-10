#!/bin/bash

# Быстрый скрипт для получения данных администратора Adapto Digital TV

echo "🔐 Adapto Digital TV - Получение данных администратора"
echo "=========================================="

# Показываем переменные окружения если они есть
echo "📝 Проверяем переменные окружения:"
if [ -f ".env" ]; then
    echo "   DJANGO_SUPERUSER_USERNAME: $(grep DJANGO_SUPERUSER_USERNAME .env | cut -d'=' -f2 || echo 'не задан')"
    echo "   DJANGO_SUPERUSER_EMAIL: $(grep DJANGO_SUPERUSER_EMAIL .env | cut -d'=' -f2 || echo 'не задан')"
    echo "   DJANGO_SUPERUSER_PASSWORD: $(if grep -q DJANGO_SUPERUSER_PASSWORD .env; then echo '***задан***'; else echo 'не задан (будет сгенерирован)'; fi)"
else
    echo "   Файл .env не найден - используются значения по умолчанию"
fi
echo ""

# Проверяем, запущен ли контейнер
if ! docker ps | grep -q "adapto-backend"; then
    echo "❌ Контейнер adapto-backend не запущен!"
    echo "Запустите проект командой:"
    echo "docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
    exit 1
fi

echo "✅ Контейнер найден. Получаем данные администратора..."
echo ""

# Способ 1: Проверить файл с данными
echo "📁 Проверяем файл с данными админа:"
if docker exec adapto-backend test -f /tmp/adapto_admin_info.txt 2>/dev/null; then
    docker exec adapto-backend cat /tmp/adapto_admin_info.txt
    echo ""
else
    echo "📝 Файл не найден. Создаем нового админа..."
    echo ""
    
    # Способ 2: Создать нового админа
    docker exec adapto-backend python manage.py create_superuser_auto --force
fi

echo ""
echo "🌐 Админ-панель доступна по адресу:"
echo "   https://dash.example.com/admin/"
echo ""
echo "⚠️  ВАЖНО: Смените пароль после первого входа!"
echo ""
echo "🗑️  Для удаления файла с данными выполните:"
echo "   docker exec adapto-backend rm /tmp/adapto_admin_info.txt"