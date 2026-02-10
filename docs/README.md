# 📚 Документация Adapto Digital TV

Добро пожаловать в документацию платформы Adapto Digital TV — системы управления телевизионным контентом и стримингом.

## 📑 Содержание

### 🚀 Начало работы

| Документ | Описание |
|----------|----------|
| [Быстрый старт](setup/QUICK_START.md) | Минимальные шаги для запуска проекта |
| [Переменные окружения](setup/ENVIRONMENT.md) | Полное описание настроек `.env` файла |
| [Docker и развёртывание](setup/DOCKER.md) | Запуск в Docker, production деплой |

### 🏗️ Архитектура

| Документ | Описание |
|----------|----------|
| [Обзор архитектуры](architecture/OVERVIEW.md) | Структура проекта, сервисы, технологии |

### 📖 Руководства

| Документ | Описание |
|----------|----------|
| [Администрирование](guides/ADMIN.md) | Настройка суперпользователя Django |
| [Стриминг (MediaMTX)](guides/STREAMING.md) | Настройка HLS/RTSP/WebRTC стриминга |
| [Хранилище (SeaweedFS)](guides/STORAGE.md) | S3-совместимое объектное хранилище |

### 🔧 Решение проблем

| Документ | Описание |
|----------|----------|
| [Частые проблемы](troubleshooting/COMMON_ISSUES.md) | CSRF, редиректы, подключение к БД |

### 📡 API

| Документ | Описание |
|----------|----------|
| [Эндпоинты API](api/ENDPOINTS.md) | Описание REST API |

---

## 🔗 Полезные ссылки

### Внешние ресурсы

- [MediaMTX документация](https://github.com/bluenviron/mediamtx)
- [SeaweedFS документация](https://github.com/seaweedfs/seaweedfs/wiki)
- [Next.js документация](https://nextjs.org/docs)
- [Django REST Framework](https://www.django-rest-framework.org/)

### Домены проекта

| Домен | Назначение |
|-------|------------|
| `example.com` | Основной сайт (Next.js) |
| `dash.example.com` | Django Admin и API |
| `stream.example.com` | MediaMTX стриминг |
| `hlsx.example.com` | HLS прокси-сервер |

---

## 📁 Структура документации

```
docs/
├── README.md                    # Этот файл (индекс)
├── setup/
│   ├── QUICK_START.md          # Быстрый старт
│   ├── ENVIRONMENT.md          # Настройка окружения
│   └── DOCKER.md               # Docker и деплой
├── guides/
│   ├── ADMIN.md                # Администрирование
│   ├── STREAMING.md            # Стриминг
│   └── STORAGE.md              # Объектное хранилище
├── architecture/
│   └── OVERVIEW.md             # Архитектура проекта
├── troubleshooting/
│   └── COMMON_ISSUES.md        # Решение проблем
└── api/
    └── ENDPOINTS.md            # API эндпоинты
```

---

## 🤝 Вклад в документацию

При обновлении документации придерживайтесь единого стиля:

- **Язык**: Русский
- **Заголовки**: С эмодзи для разделов верхнего уровня
- **Кодовые блоки**: С указанием языка (`bash`, `yaml`, `python`)
- **Ссылки**: Относительные пути внутри `docs/`

---

**Версия документации**: 1.0  
**Последнее обновление**: Январь 2026
