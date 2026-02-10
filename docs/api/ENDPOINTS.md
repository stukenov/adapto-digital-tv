# 📡 API эндпоинты

Описание REST API Adapto Digital TV.

## 🌐 Базовые URL

| Среда | URL |
|-------|-----|
| Production | `https://example.com/api/v1` |
| Production (Django) | `https://dash.example.com/api/v1` |
| Development | `http://localhost/api/v1` |

---

## 📺 Каналы

### Список каналов

```http
GET /api/v1/channels/
```

**Ответ:**

```json
[
  {
    "id": 1,
    "name": "Qazaqstan",
    "name_kk": "Қазақстан",
    "slug": "qazaqstan",
    "logo": "/media/logos/qazaqstan.png",
    "hls_url": "https://stream.example.com/qazaqstan/index.m3u8",
    "is_active": true,
    "sort_order": 1
  },
  {
    "id": 2,
    "name": "Balapan",
    "name_kk": "Балапан",
    "slug": "balapan",
    "logo": "/media/logos/balapan.png",
    "hls_url": "https://stream.example.com/balapan/index.m3u8",
    "is_active": true,
    "sort_order": 2
  }
]
```

### Детали канала

```http
GET /api/v1/channels/{slug}/
```

**Пример:** `GET /api/v1/channels/qazaqstan/`

**Ответ:**

```json
{
  "id": 1,
  "name": "Qazaqstan",
  "name_kk": "Қазақстан",
  "slug": "qazaqstan",
  "logo": "/media/logos/qazaqstan.png",
  "hls_url": "https://stream.example.com/qazaqstan/index.m3u8",
  "description": "Қазақстан телеарнасы",
  "description_kk": "Қазақстан телеарнасы",
  "is_active": true
}
```

---

## 📅 Расписание (Программы)

### Список программ

```http
GET /api/v1/programs/
```

**Query параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `channel` | int | ID канала |
| `date` | string | Дата (YYYY-MM-DD) |
| `from` | datetime | Начало периода |
| `to` | datetime | Конец периода |

**Пример:** `GET /api/v1/programs/?channel=1&date=2026-01-03`

**Ответ:**

```json
[
  {
    "id": 1,
    "channel": 1,
    "title": "Новости",
    "title_kk": "Жаңалықтар",
    "description": "Ежедневные новости",
    "start_time": "2026-01-03T08:00:00Z",
    "end_time": "2026-01-03T08:30:00Z",
    "duration_minutes": 30
  },
  {
    "id": 2,
    "channel": 1,
    "title": "Утренняя программа",
    "title_kk": "Таңғы бағдарлама",
    "description": null,
    "start_time": "2026-01-03T08:30:00Z",
    "end_time": "2026-01-03T10:00:00Z",
    "duration_minutes": 90
  }
]
```

### Расписание канала на дату

```http
GET /api/v1/programs/{channel_id}/{date}/
```

**Пример:** `GET /api/v1/programs/1/2026-01-03/`

### Текущая программа

```http
GET /api/v1/programs/current/?channel={channel_id}
```

**Ответ:**

```json
{
  "current": {
    "id": 5,
    "title": "Фильм",
    "start_time": "2026-01-03T20:00:00Z",
    "end_time": "2026-01-03T22:00:00Z",
    "progress_percent": 45
  },
  "next": {
    "id": 6,
    "title": "Новости",
    "start_time": "2026-01-03T22:00:00Z"
  }
}
```

---

## 🎬 Видеофайлы

### Список видеофайлов

```http
GET /api/v1/videos/
```

**Query параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `channel` | int | ID канала |
| `status` | string | Статус: `pending`, `processing`, `ready`, `error` |
| `page` | int | Номер страницы |
| `page_size` | int | Размер страницы (max 100) |

### Детали видеофайла

```http
GET /api/v1/videos/{id}/
```

**Ответ:**

```json
{
  "id": 123,
  "channel": 1,
  "file_path": "/videos/2026/01/03/movie.mp4",
  "original_name": "movie.mp4",
  "duration_seconds": 7200,
  "file_size": 4294967296,
  "status": "ready",
  "metadata": {
    "codec": "h264",
    "resolution": "1920x1080",
    "bitrate": 5000000
  },
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T12:00:00Z"
}
```

---

## 🔐 Аутентификация

### Django Session Auth

Используется для админ-панели. Авторизация через форму входа.

### API Token (если включено)

```http
POST /api/v1/auth/token/
Content-Type: application/json

{
  "username": "user",
  "password": "password"
}
```

**Ответ:**

```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expires_at": "2026-01-04T10:00:00Z"
}
```

**Использование токена:**

```http
GET /api/v1/protected-endpoint/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

---

## 📊 Health Check

### Проверка здоровья

```http
GET /api/v1/health/
```

**Ответ:**

```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-01-03T15:30:00Z"
}
```

---

## 🔢 Коды ответов

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 201 | Ресурс создан |
| 400 | Неверный запрос |
| 401 | Не авторизован |
| 403 | Доступ запрещён |
| 404 | Ресурс не найден |
| 500 | Ошибка сервера |

---

## 📝 Формат ошибок

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid date format",
    "details": {
      "field": "date",
      "value": "invalid-date"
    }
  }
}
```

---

## 🧪 Примеры с cURL

### Получить список каналов

```bash
curl -s https://example.com/api/v1/channels/ | jq
```

### Получить расписание

```bash
curl -s "https://example.com/api/v1/programs/?channel=1&date=2026-01-03" | jq
```

### С авторизацией

```bash
# Получить токен
TOKEN=$(curl -s -X POST https://example.com/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}' | jq -r '.token')

# Использовать токен
curl -s https://example.com/api/v1/protected/ \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 🔗 Связанные документы

- [Архитектура](../architecture/OVERVIEW.md)
- [Настройка окружения](../setup/ENVIRONMENT.md)
