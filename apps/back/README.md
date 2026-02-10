# Adapto Digital TV Backend - AI Metadata Generator

Django приложение для автоматической генерации названий видеофайлов с помощью ChatGPT.

## Установка зависимостей


```bash
pip install -r requirements.txt
```

## Настройка

### 1. Миграции базы данных

```bash
# В виртуальном окружении
.venv\Scripts\activate

# Создание и применение миграций
python manage.py makemigrations tvchannels
python manage.py makemigrations ai_metadata
python manage.py migrate
```

### 2. Быстрая настройка (рекомендуется)

```bash
# Автоматическая настройка провайдеров и задач с API ключом
python manage.py setup_ai_defaults --openai-key "your-api-key-here"

# Или через переменную окружения
export OPENAI_API_KEY="your-api-key-here"
python manage.py setup_ai_defaults
```

### 3. Ручная настройка через админ панель

#### Настройка провайдера AI:
1. Зайдите в админ панель
2. Перейдите в "AI Метаданные" → "AI Провайдеры" → "Добавить"
3. Заполните поля:
   - **Название**: OpenAI GPT
   - **Тип провайдера**: OpenAI
   - **API ключ**: ваш ключ OpenAI
   - **Модель по умолчанию**: gpt-3.5-turbo
   - **Максимум токенов**: 4000
   - **Температура**: 0.7
   - **Активен**: ✓
   - **По умолчанию**: ✓

#### Настройка задач AI:
1. Перейдите в "AI Задачи" → "Добавить"
2. Создайте задачу для генерации названий:
   - **Название задачи**: Генерация названия видео
   - **Тип задачи**: Генерация названия
   - **Провайдер**: выберите созданного провайдера
   - **Системный промпт**: инструкции для AI
   - **Шаблон пользовательского промпта**: шаблон с переменными
   - **По умолчанию для типа**: ✓

### 4. Создание суперпользователя (если нужно)

```bash
python manage.py createsuperuser
```

## Использование

### Обработка видеофайлов через management команды

**Первоначальная настройка системы:**
```bash
# Быстрая настройка с API ключом
python manage.py setup_ai_defaults --openai-key "your-key"

# Перезаписать существующие настройки
python manage.py setup_ai_defaults --openai-key "your-key" --force
```

**Проверка статуса видео:**
```bash
# Общая статистика по всем видео
python manage.py video_status

# Детали для конкретного статуса
python manage.py video_status --status need_add_meta_with_ai
python manage.py video_status --status error

# Ограничить количество показываемых видео
python manage.py video_status --status error --limit 5
```

**Тестирование AI подключения:**
```bash
# Тестирование провайдера по умолчанию
python manage.py test_ai_connection

# Тестирование конкретного провайдера
python manage.py test_ai_connection --provider "OpenAI GPT"

# Тестирование всех активных провайдеров
python manage.py test_ai_connection --all
```

**Тестирование админки:**
```bash
# Проверка admin actions (действий в админке)
python manage.py test_admin_actions
```

**Обработка видео:**
```bash
# Основная обработка (генерация названий)
python manage.py process_ai_metadata

# Обработка с ограничением количества
python manage.py process_ai_metadata --limit 5

# Обработка определенного типа задач
python manage.py process_ai_metadata --task-type generate_description

# Использование конкретной задачи
python manage.py process_ai_metadata --task-name "Генерация описания видео"

# Режим цикла (автоматическая обработка)
python manage.py process_ai_metadata --loop --interval 60

# Тестовый режим
python manage.py process_ai_metadata --dry-run
```

### Как это работает

#### 1. Архитектура системы

**AI Провайдеры** (`AIProvider`):
- Настройки для разных AI сервисов (OpenAI, Anthropic, Yandex GPT)
- API ключи, модели, параметры (токены, температура)
- Можно настроить несколько провайдеров и переключаться между ними

**AI Задачи** (`AITask`):
- Конфигурируемые задачи обработки (генерация названий, описаний, ключевых слов)
- Системные и пользовательские промпты с переменными
- Настройки валидации и повторных попыток
- Привязка к конкретному провайдеру или использование провайдера по умолчанию

**AI Запросы** (`AIRequest`):
- Запись каждого обращения к AI с метриками
- Отслеживание использованных токенов, времени выполнения, стоимости
- Повторные попытки при ошибках

#### 2. Процесс обработки

1. **Статус видеофайлов**: Поле `status` в модель `VideoFile`:
   - `new` - Новый
   - `processed` - Обработан  
   - `need_add_meta_with_ai` - Требуется добавление метаданных с AI
   - `ai_processing` - Обрабатывается AI
   - `ai_completed` - AI обработка завершена
   - `error` - Ошибка

2. **Автоматическая обработка**: 
   - Система ищет видеофайлы со статусом `need_add_meta_with_ai`
   - Выбирает задачу по умолчанию для нужного типа (например, генерация названий)
   - Рендерит промпт с данными файла (путь, длительность, размер)
   - Отправляет запрос через настроенного провайдера AI
   - Сохраняет результат в соответствующие поля метаданных

3. **Переменные в промптах**:
   - `{file_path}` - путь без префикса `/srv/ffplayout-media`
   - `{filename}` - имя файла без расширения
   - `{filename_full}` - полное имя файла
   - `{duration}` - длительность в формате HH:MM:SS
   - `{extension}` - расширение файла
   - `{file_size}` - размер в МБ
   - `{video_name}` - название видео из базы

4. **Логирование и мониторинг**: 
   - Все действия логируются в `AIProcessingLog`
   - Метрики запросов сохраняются в `AIRequest`
   - Возможность отслеживать ошибки и производительность

### Работа с админ панелью

В админ панели доступны следующие разделы в секции "AI Метаданные":

- **AI Провайдеры** - настройка провайдеров AI (OpenAI, Anthropic и др.)
- **AI Задачи** - конфигурация задач обработки с промптами
- **AI Запросы** - просмотр всех запросов к AI с метриками
- **Логи обработки AI** - детальные логи процесса обработки
- **Настройки AI** - дополнительные настройки системы

#### Возможности админ панели:

1. **Управление провайдерами**:
   - Добавление нескольких AI провайдеров
   - Настройка API ключей и параметров
   - Переключение между провайдерами

2. **Конфигурация задач**:
   - Создание кастомных задач обработки
   - Редактирование системных и пользовательских промптов
   - Настройка параметров (токены, температура, повторы)
   - Установка приоритетов задач

3. **Удобная работа с видеофайлами** 🎬:
   - **Цветовые индикаторы статусов** с эмодзи
   - **Умная сортировка** - видео, требующие AI обработки, показываются первыми
   - **Фильтры по статусу AI обработки** (требуется обработка, ошибки, завершенные)
   - **Превью AI-сгенерированных названий** прямо в списке
   - **Массовые действия**:
     - 🤖 Обработать выбранными AI задачами
     - ⏳ Отметить для AI обработки
     - 🔄 Сбросить ошибки обработки
     - ✅ Отметить как обработанные
   - **История AI запросов** для каждого видео (inline)
   - **Статистика** по статусам и метаданным

4. **Мониторинг производительности**:
   - Просмотр использованных токенов и стоимости
   - Анализ времени выполнения запросов
   - Отслеживание ошибок и успешных обработок

5. **Настройка промптов**:
   - Использование переменных в промптах
   - A/B тестирование разных промптов
   - Версионирование задач

## Примеры использования

### Первоначальная настройка

```python
# Создание провайдера через Python
from ai_metadata.models import AIProvider

provider = AIProvider.objects.create(
    name='My OpenAI Provider',
    provider_type='openai',
    api_key='your-api-key',
    default_model='gpt-4',
    is_active=True,
    is_default=True
)
```

### Работа с задачами

```python
from ai_metadata.models import AITask, AIProvider

# Создание кастомной задачи
provider = AIProvider.objects.get(name='My OpenAI Provider')

task = AITask.objects.create(
    name='Кастомная генерация названий',
    task_type='generate_title',
    provider=provider,
    system_prompt='Ты эксперт по названиям фильмов...',
    user_prompt_template='Создай название для: {filename}',
    max_tokens=150,
    temperature=0.8,
    is_active=True
)
```

### Установка статуса для видеофайла

```python
from tvchannels.models import VideoFile

# Установить статус "требуется AI обработка"
video = VideoFile.objects.get(id=1)
video.status = 'need_add_meta_with_ai'
video.save()

# Массовая установка статуса
VideoFile.objects.filter(metadata__original_title='').update(
    status='need_add_meta_with_ai'
)
```

### Работа через админ панель 🖥️

#### Массовая обработка видео:
1. Перейдите в **Телеканалы** → **Видеофайлы**
2. Используйте **фильтр "Статус AI обработки"** → **"Требуется AI обработка"**
3. Выберите нужные видео в списке
4. В выпадающем меню **"Действия"** выберите:
   - 🤖 **Обработать: Генерация названия видео**
   - 🤖 **Обработать: Генерация описания видео**
   - 🤖 **Обработать: Извлечение ключевых слов**
5. Нажмите **"Выполнить"**

#### Удобные фильтры:
- **Требуется AI обработка** - видео со статусом `need_add_meta_with_ai`
- **Обрабатывается AI** - видео в процессе обработки
- **AI обработка завершена** - успешно обработанные видео
- **Без метаданных** - видео без связанных метаданных
- **Пустое название** - видео с пустыми AI-названиями
- **Ошибки обработки** - видео с ошибками AI обработки

#### Цветовые индикаторы статусов:
- ⏳ **Желтый** - требуется AI обработка
- 🔄 **Синий** - обрабатывается AI
- ✅ **Зеленый** - обработка завершена
- ❌ **Красный** - ошибка обработки
- ⚪ **Серый** - новое видео

### Ручная обработка через Python

```python
from ai_metadata.services import VideoMetadataProcessor

processor = VideoMetadataProcessor()

# Обработка с задачей по умолчанию
result = processor.process_videos_needing_ai_metadata(limit=5)
print(f"Обработано: {result['processed_count']} видео")

# Обработка с конкретным типом задачи
result = processor.process_videos_needing_ai_metadata(
    limit=3, 
    task_type='generate_description'
)

# Обработка одного видео с конкретной задачей
from tvchannels.models import VideoFile
video = VideoFile.objects.get(id=1)
result = processor.process_single_video(
    video, 
    task_name='Кастомная генерация названий'
)
print(f"Результат: {result['response']}")
```

### Работа с метриками и логами

```python
from ai_metadata.models import AIRequest, AIProcessingLog

# Просмотр последних запросов
recent_requests = AIRequest.objects.filter(
    status='completed'
).order_by('-created_at')[:10]

for request in recent_requests:
    print(f"Задача: {request.task.name}")
    print(f"Токенов: {request.tokens_used}")
    print(f"Время: {request.execution_time}с")
    print(f"Результат: {request.response[:50]}...")

# Статистика по провайдерам
from django.db.models import Count, Avg, Sum
stats = AIRequest.objects.values('provider__name').annotate(
    total_requests=Count('id'),
    avg_tokens=Avg('tokens_used'),
    total_tokens=Sum('tokens_used'),
    avg_time=Avg('execution_time')
)
```

### Создание кастомного провайдера

```python
# Пример настройки для Yandex GPT (когда будет поддержка)
custom_provider = AIProvider.objects.create(
    name='Yandex GPT',
    provider_type='yandex',
    api_key='your-yandex-key',
    api_url='https://llm.api.cloud.yandex.net',
    default_model='yandexgpt-lite',
    available_models=['yandexgpt-lite', 'yandexgpt'],
    max_tokens=2000,
    temperature=0.6,
    is_active=True
)
```

## Структура проекта

```
adapto-back/
├── ai_metadata/              # Приложение для AI обработки метаданных
│   ├── models.py            # Модели: AIProvider, AITask, AIRequest, AIProcessingLog, AISettings
│   ├── services.py          # Сервисы: AIProviderService, AITaskProcessor, VideoMetadataProcessor
│   ├── admin.py             # Админ панель для всех AI моделей
│   ├── management/commands/
│   │   ├── process_ai_metadata.py   # Команда обработки видео
│   │   ├── setup_ai_defaults.py     # Команда первоначальной настройки
│   │   ├── test_ai_connection.py    # Команда тестирования AI подключений
│   │   ├── test_admin_actions.py    # Команда тестирования admin actions
│   │   └── video_status.py          # Команда просмотра статистики видео
│   └── migrations/          # Миграции для AI моделей
├── tvchannels/
│   ├── models.py            # VideoFile с полем status, VideoMetadata
│   └── migrations/          # Обновленные миграции
├── requirements.txt         # Зависимости проекта (включая openai)
└── README.md               # Документация
```

### Основные модели

**AIProvider** - провайдеры AI сервисов:
- Поддержка OpenAI, Anthropic, Yandex GPT, кастомных API
- Настройки API ключей, моделей, параметров
- Возможность иметь несколько провайдеров

**AITask** - задачи обработки:
- Конфигурируемые промпты с переменными
- Типы: генерация названий, описаний, ключевых слов
- Настройки повторных попыток и валидации

**AIRequest** - запросы к AI:
- Отслеживание всех обращений к AI
- Метрики: токены, время, стоимость
- Связь с конкретной задачей и провайдером

**VideoFile** (обновлена):
- Поле `status` для отслеживания этапов обработки
- Связь с AI запросами и логами обработки

## API и интеграция

Приложение использует все нативные возможности Django:

- **ORM** для работы с базой данных
- **Management команды** для автоматизации
- **Админ панель** для управления
- **Сигналы Django** (при необходимости)
- **Логирование Django**
- **Настройки Django**

## Мониторинг и отладка

Все операции логируются. Для просмотра логов:

1. Админ панель → "Логи обработки AI"
2. Фильтрация по уровню (info, warning, error, debug)
3. Поиск по видеофайлам или сообщениям

## Безопасность

- API ключи не отображаются в админ панели (скрыты звездочками)
- Поддержка переменных окружения для чувствительных данных
- Логирование ошибок без раскрытия секретной информации
- Валидация входных данных и контроль доступа

## Быстрый старт

### 1. Минимальная настройка (5 минут)

```bash
# Активируйте виртуальное окружение
.venv\Scripts\activate

# Установите зависимости (важно: OpenAI >=1.0.0)
pip install -r requirements.txt

# Примените миграции
python manage.py migrate

# Быстрая настройка с вашим API ключом OpenAI
python manage.py setup_ai_defaults --openai-key "your-openai-api-key"

# Тестирование подключения к AI
python manage.py test_ai_connection

# Проверьте статус ваших видео
python manage.py video_status

# Установите статус для тестового видео
python manage.py shell
>>> from tvchannels.models import VideoFile
>>> video = VideoFile.objects.first()
>>> video.status = 'need_add_meta_with_ai'
>>> video.save()
>>> exit()

# Запустите обработку
python manage.py process_ai_metadata --limit 1
```

### 2. Проверка результатов

```bash
# Через админ панель
python manage.py runserver
# Перейдите в админку → AI Метаданные → AI Запросы

# Или через shell
python manage.py shell
>>> from ai_metadata.models import AIRequest
>>> request = AIRequest.objects.last()
>>> print(f"Результат: {request.response}")
```

### 3. Автоматическая обработка

```bash
# Запуск в режиме демона (каждые 60 секунд)
python manage.py process_ai_metadata --loop --interval 60
```

## Устранение неполадок

### Ошибка: "openai.ChatCompletion is no longer supported"

Если вы видите ошибку:
```
You tried to access openai.ChatCompletion, but this is no longer supported in openai>=1.0.0
```

**Решение:**
1. Убедитесь, что используете последнюю версию кода из этого репозитория
2. Обновите зависимости:
   ```bash
   pip install -r requirements.txt --upgrade
   ```
3. Проверьте версию OpenAI:
   ```bash
   pip show openai
   # Должно быть >= 1.0.0
   ```

### Тестирование подключения

Используйте команду тестирования для диагностики:
```bash
python manage.py test_ai_connection
```

### Ошибка "takes 3 positional arguments but 4 were given"

Если вы видите эту ошибку в админке при выполнении действий:

**Решение:**
1. Убедитесь, что используете последнюю версию кода
2. Перезапустите сервер разработки:
   ```bash
   # Остановите сервер (Ctrl+C)
   python manage.py runserver
   ```
3. Протестируйте admin actions:
   ```bash
   python manage.py test_admin_actions
   ```

### Проверка логов

Если есть проблемы с обработкой:
1. Перейдите в админку → AI Метаданные → Логи обработки AI
2. Отфильтруйте по уровню "Ошибка"
3. Изучите детали ошибок

### Поддержка

- **Документация**: Полная документация в этом README
- **Админ панель**: Интуитивный интерфейс для управления  
- **Логирование**: Детальные логи всех операций
- **Мониторинг**: Метрики производительности и затрат
- **Тестирование**: Команда диагностики подключения к AI

---

**Готово!** Теперь ваша система автоматически генерирует названия для видеофайлов с помощью AI. 

Для расширенной настройки изучите разделы о провайдерах AI и конфигурации задач выше. 