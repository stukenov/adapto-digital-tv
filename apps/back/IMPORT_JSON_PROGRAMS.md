# Импорт программ из JSON файлов через SSH

## Обзор

Создана новая Django management команда `import_json_programs` для автоматического импорта телевизионных программ из JSON файлов, расположенных на удаленном сервере.

## Новые файлы

1. **`tvchannels/management/commands/import_json_programs.py`** - Основная команда импорта
2. **`tvchannels/management/commands/test_ssh_connection.py`** - Вспомогательная команда для тестирования SSH
3. **`tvchannels/management/commands/test_import_example.py`** - Пример тестовых данных
4. **`tvchannels/management/commands/README_import_json_programs.md`** - Подробная документация

## Обновленные файлы

- **`requirements.txt`** - Добавлена библиотека `pytz` для работы с часовыми поясами

## Быстрый старт

### 1. Установка зависимостей
```bash
cd apps/back
pip install -r requirements.txt
```

### 2. Тестирование SSH подключения
```bash
python manage.py test_ssh_connection \
    --ssh-host your-server.com \
    --ssh-user username \
    --ssh-password password \
    --test-path /path/to/json/files
```

### 3. Проверочный импорт (без сохранения)
```bash
python manage.py import_json_programs \
    --ssh-host your-server.com \
    --ssh-user username \
    --ssh-password password \
    --remote-path /path/to/json/files \
    --channel-id 1 \
    --dry-run
```

### 4. Реальный импорт
```bash
python manage.py import_json_programs \
    --ssh-host your-server.com \
    --ssh-user username \
    --ssh-password password \
    --remote-path /path/to/json/files \
    --channel-id 1 \
    --batch-size 100 \
    --max-records 1000
```

## Основные возможности

✅ **SSH подключение** - Безопасное подключение к удаленному серверу  
✅ **Поиск файлов** - Рекурсивный поиск JSON файлов в папках  
✅ **Гибкий парсинг** - Настраиваемые поля для извлечения данных  
✅ **Часовые пояса** - Автоматическое преобразование времени для часового пояса Aktau  
✅ **Вычисление времени окончания** - Автоматическое определение по следующей программе  
✅ **Пакетный импорт** - Оптимизированное создание записей в БД  
✅ **Ограничения** - Контроль количества импортируемых записей  
✅ **Проверочный режим** - Тестирование без сохранения данных  
✅ **Обработка дубликатов** - Пропуск существующих программ  

## Параметры команды

### Обязательные параметры
- `--ssh-host` - SSH сервер
- `--ssh-user` - Пользователь SSH  
- `--ssh-password` - Пароль SSH
- `--remote-path` - Путь к файлам на сервере
- `--channel-id` или `--channel-slug` - Телеканал для импорта

### Опциональные параметры
- `--ssh-port` - Порт SSH (по умолчанию: 22)
- `--recursive` - Рекурсивный поиск в подпапках
- `--title-field` - Поле названия (по умолчанию: "title")
- `--start-time-field` - Поле времени (по умолчанию: "start_minute_pretty")
- `--programs-array-field` - Поле массива программ (по умолчанию: "program")
- `--batch-size` - Размер пакета (по умолчанию: 100)
- `--max-records` - Максимум записей
- `--dry-run` - Проверочный режим

## Формат JSON

### Основной формат (ffplayout schedule)
```json
{
  "channel": "Channel Name",
  "date": "2025-01-20", 
  "program": [
    {
      "duration": 2476.053333,
      "source": "/path/to/video.mp4",
      "start_minute_pretty": "2025-01-20 06:00",
      "title": "Мергендер мекені - 8 бағдарлама"
    },
    {
      "duration": 2508.8,
      "source": "/path/to/video2.mkv", 
      "start_minute_pretty": "2025-01-20 06:40",
      "title": "Өнерлі өлке Нысана"
    }
  ]
}
```

**Примечание:** Используются только поля `title` и `start_minute_pretty` из массива `program`. Поля `channel`, `date`, `duration`, `source` игнорируются.

## Обработка времени

- **Формат входящего времени**: `YYYY-MM-DD HH:MM` (например: "2025-01-20 06:00")
- **Часовой пояс**: Asia/Aqtau (Актау)
- **Время окончания**: Вычисляется как время начала следующей программы
- **Последняя программа**: Получает +1 час к времени начала

## Примеры использования

### Импорт из одного файла
```bash
python manage.py import_json_programs \
    --ssh-host 192.168.1.100 \
    --ssh-user admin \
    --ssh-password secret123 \
    --remote-path /data/today_schedule.json \
    --channel-id 1
```

### Рекурсивный импорт из папки
```bash
python manage.py import_json_programs \
    --ssh-host tv-server.local \
    --ssh-user operator \
    --ssh-password mypass \
    --remote-path /var/tv-data/schedules/ \
    --recursive \
    --channel-slug "first-channel" \
    --batch-size 50 \
    --max-records 500
```

### Импорт с новым форматом (по умолчанию)
```bash
python manage.py import_json_programs \
    --ssh-host server.tv \
    --ssh-user user \
    --ssh-password pass \
    --remote-path /ffplayout/schedules/ \
    --channel-id 2 \
    --recursive
```

### Импорт с кастомными полями (старый формат)
```bash
python manage.py import_json_programs \
    --ssh-host server.tv \
    --ssh-user user \
    --ssh-password pass \
    --remote-path /exports/ \
    --channel-id 2 \
    --title-field "show.name" \
    --start-time-field "schedule.start_time" \
    --programs-array-field "episodes" \
    --recursive
```

## Безопасность

⚠️ **Важно**: Не храните пароли в истории команд или скриптах. Рекомендуется:
- Использовать переменные окружения
- SSH-ключи вместо паролей (если возможно)
- Ограниченные права доступа для SSH пользователя

## Мониторинг и логи

Команда выводит подробную информацию:
- Статус SSH подключения
- Количество найденных файлов  
- Прогресс обработки
- Ошибки парсинга
- Статистика импорта

## Автоматизация

Команду можно запускать через cron для регулярного импорта:

```bash
# Каждый день в 2:00 утра
0 2 * * * cd /path/to/project && python manage.py import_json_programs --ssh-host server --ssh-user user --ssh-password pass --remote-path /data --channel-id 1 >> /var/log/import.log 2>&1
```

## Поддержка

При возникновении проблем:
1. Используйте `test_ssh_connection` для проверки подключения
2. Запустите с `--dry-run` для тестирования
3. Проверьте формат JSON файлов
4. Убедитесь в существовании телеканала в БД
