# ⚙️ Настройка переменных окружения

Полное руководство по настройке `.env` файла для проекта ADAPTO.

## 📋 Создание .env файла

```bash
# Копируем пример
cp env.example .env

# Редактируем
nano .env  # или любой другой редактор
```

---

## 🔧 Основные настройки

### Общие параметры

```bash
# Режим работы
NODE_ENV=production        # production | development
DEBUG=0                    # 0 = выключен, 1 = включен
LOG_LEVEL=WARN             # DEBUG | INFO | WARN | ERROR
```

---

## 🗄️ База данных

### PostgreSQL

```bash
# URL подключения (для Django и Express.js)
DATABASE_URL=postgresql://adapto:changeme@postgres:5432/adapto

# Отдельные параметры (для PostgreSQL контейнера)
POSTGRES_DB=adapto
POSTGRES_USER=adapto
POSTGRES_PASSWORD=changeme
```

> **Важно для Docker**: В Docker окружении используйте имена сервисов (`postgres`, `redis`), а не `localhost`.

**Правильно** (Docker):
```bash
DATABASE_URL=postgresql://adapto:changeme@postgres:5432/adapto
```

**Неправильно** (не работает в Docker):
```bash
DATABASE_URL=postgresql://adapto:changeme@localhost:5432/adapto
```

### Express.js Backend

```bash
# Отдельные настройки для Express.js API
EXPRESS_PORT=8001
EXPRESS_DATABASE_URL=postgresql://adapto:changeme@postgres:5432/adapto
EXPRESS_DB_SSL=0                    # 0 = без SSL, 1 = с SSL
EXPRESS_DB_POOL_SIZE=10             # Размер пула соединений
EXPRESS_DB_IDLE_TIMEOUT=30000       # Таймаут простоя (мс)
```

### Redis

```bash
# URL подключения к Redis
REDIS_URL=redis://redis:6379/0
```

---

## 🐍 Django Backend

### Безопасность

```bash
# Секретный ключ (ОБЯЗАТЕЛЬНО измените для production!)
SECRET_KEY=your-secret-key-here-change-in-production

# Разрешённые хосты
ALLOWED_HOSTS=localhost,127.0.0.1,example.com,dash.example.com

# CORS (разрешённые источники для API)
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://example.com

# CSRF (доверенные источники для форм)
CSRF_TRUSTED_ORIGINS=https://example.com,https://dash.example.com

# TLS/SSL
USE_TLS=1                  # 1 = HTTPS, 0 = HTTP
```

### Суперпользователь

```bash
# Автоматическое создание админа при запуске
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=your-secure-password
```

---

## 🎨 Frontend (Next.js)

```bash
# API URL (относительный путь рекомендуется)
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_WS_URL=/ws

# Режим отладки
NEXT_PUBLIC_DEBUG=0

# Google Analytics
NEXT_PUBLIC_GA_ID=UA-XXXXXXXXX-X
```

> **Важно**: Переменные с префиксом `NEXT_PUBLIC_` доступны в браузере. Не храните в них секреты!

---

## 📺 Smart TV приложение

```bash
REACT_APP_API_BASE_URL=https://dash.example.com/api/v1
REACT_APP_WS_URL=wss://dash.example.com/ws
REACT_APP_DEBUG=0
```

---

## 📱 Мобильное приложение (Expo)

```bash
EXPO_PUBLIC_API_BASE_URL=https://dash.example.com/api/v1
EXPO_PUBLIC_WS_URL=wss://dash.example.com/ws
EXPO_PUBLIC_DEBUG=0
EXPO_USE_LOCAL_CLI=1
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
```

---

## 📺 Стриминг (MediaMTX)

```bash
# Часовой пояс
TZ=Asia/Almaty

# WebRTC хосты (для внешнего доступа)
MEDIAMTX_WEBRTC_HOSTS=localhost,127.0.0.1,example.com
```

---

## 🪣 Объектное хранилище (SeaweedFS)

```bash
# S3-совместимый API
SEAWEEDFS_S3_ACCESS_KEY=adapto-access-key-123
SEAWEEDFS_S3_SECRET_KEY=adapto-secret-key-456
SEAWEEDFS_S3_ENDPOINT=http://localhost:8333
SEAWEEDFS_S3_REGION=us-east-1
SEAWEEDFS_S3_BUCKET=adapto-media
```

---

## 🤖 Внешние сервисы

### OpenAI (для AI-функций)

```bash
OPENAI_API_KEY=sk-your-openai-api-key
```

### Email (SMTP)

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=ADAPTO <noreply@example.com>
```

### Sentry (мониторинг ошибок)

```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 🔒 JWT и безопасность

```bash
# JWT настройки
JWT_SECRET_KEY=your-jwt-secret-key
JWT_EXPIRATION_TIME=3600              # Время жизни токена (секунды)

# Rate limiting
API_RATE_LIMIT=100/hour               # Лимит API запросов
WEB_RATE_LIMIT=1000/hour              # Лимит веб запросов
```

---

## 🌐 Production настройки

```bash
# Домены
DOMAIN=example.com
API_DOMAIN=api.example.com
TV_DOMAIN=tv.example.com

# CDN
CDN_URL=https://cdn.example.com

# База данных (production)
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10

# Кэширование
CACHE_TTL=3600
CACHE_MAX_ENTRIES=10000
```

---

## ✅ Проверка конфигурации

### Проверка Django настроек

```bash
docker exec adapto-backend-1 python manage.py shell -c "
from django.conf import settings
print('DEBUG:', settings.DEBUG)
print('ALLOWED_HOSTS:', settings.ALLOWED_HOSTS)
print('CSRF_TRUSTED_ORIGINS:', settings.CSRF_TRUSTED_ORIGINS)
print('DATABASE:', settings.DATABASES['default']['HOST'])
"
```

### Проверка переменных окружения в контейнере

```bash
# Django backend
docker exec adapto-backend-1 env | grep -E "(DATABASE|DEBUG|SECRET)"

# Express.js backend
docker exec adapto-back-express-1 env | grep EXPRESS

# Frontend
docker exec adapto-frontend-1 env | grep NEXT_PUBLIC
```

### Проверка подключения к БД

```bash
docker exec adapto-backend-1 python manage.py dbshell
```

---

## 📝 Пример полного .env файла

```bash
# =============================================================================
# ADAPTO Environment Configuration
# =============================================================================

# General
NODE_ENV=production
DEBUG=0
LOG_LEVEL=WARN

# Database
DATABASE_URL=postgresql://adapto:changeme@postgres:5432/adapto
POSTGRES_DB=adapto
POSTGRES_USER=adapto
POSTGRES_PASSWORD=changeme

# Redis
REDIS_URL=redis://redis:6379/0

# Django
SECRET_KEY=change-this-to-a-very-long-random-string
ALLOWED_HOSTS=localhost,127.0.0.1,example.com,dash.example.com
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://example.com
CSRF_TRUSTED_ORIGINS=https://example.com,https://dash.example.com
USE_TLS=1

# Admin
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=your-secure-password

# Frontend
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_WS_URL=/ws
NEXT_PUBLIC_DEBUG=0

# Streaming
TZ=Asia/Almaty
MEDIAMTX_WEBRTC_HOSTS=localhost,example.com

# SeaweedFS
SEAWEEDFS_S3_ACCESS_KEY=adapto-access-key-123
SEAWEEDFS_S3_SECRET_KEY=adapto-secret-key-456
SEAWEEDFS_S3_ENDPOINT=http://seaweedfs-s3:8333
SEAWEEDFS_S3_BUCKET=adapto-media
```

---

## 🔗 Связанные документы

- [Быстрый старт](QUICK_START.md)
- [Docker и развёртывание](DOCKER.md)
- [Решение проблем](../troubleshooting/COMMON_ISSUES.md)
