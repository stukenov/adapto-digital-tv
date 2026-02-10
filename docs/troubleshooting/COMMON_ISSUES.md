# 🔧 Решение частых проблем

Руководство по диагностике и устранению типичных проблем в ADAPTO.

## 📑 Содержание

- [CSRF ошибка 403](#-csrf-ошибка-403)
- [Ошибка подключения к базе данных](#-ошибка-подключения-к-базе-данных)
- [ERR_TOO_MANY_REDIRECTS](#-err_too_many_redirects)
- [Проблемы с переменными окружения Frontend](#-проблемы-с-переменными-окружения-frontend)
- [Общие проблемы Docker](#-общие-проблемы-docker)

---

## 🔒 CSRF ошибка 403

### Симптомы

```
Ошибка доступа (403)
Ошибка проверки CSRF. Запрос отклонён.
```

### Причины

1. Не настроен `CSRF_TRUSTED_ORIGINS` в `.env`
2. Несоответствие домена в запросе и настройках
3. Отсутствие заголовков `X-Forwarded-*` от reverse proxy

### Решение

#### 1. Настройте `.env`

```bash
# Добавьте в .env
CSRF_TRUSTED_ORIGINS=https://example.com,https://dash.example.com
USE_TLS=1
DEBUG=0
```

#### 2. Перезапустите backend

```bash
docker compose restart backend
```

#### 3. Проверьте настройки

```bash
docker exec adapto-backend-1 python manage.py shell -c "
from django.conf import settings
print('CSRF_TRUSTED_ORIGINS:', settings.CSRF_TRUSTED_ORIGINS)
print('ALLOWED_HOSTS:', settings.ALLOWED_HOSTS)
"
```

### Диагностика

```bash
# Проверить переменные окружения
docker exec adapto-backend-1 env | grep -E "(CSRF|DEBUG|ALLOWED)"

# Логи Django
docker compose logs backend | grep -i csrf
```

### Временное решение (только для отладки!)

Если нужно временно отключить CSRF для тестирования API:

```python
# В views.py
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def my_api_view(request):
    # ...
```

> ⚠️ **Никогда не используйте в production!**

---

## 🗄️ Ошибка подключения к базе данных

### Симптомы

```
django.db.utils.OperationalError: connection to server at "localhost" (::1), port 5432 failed: Connection refused
```

### Причина

В Docker контейнере `localhost` не указывает на PostgreSQL. Нужно использовать имя сервиса `postgres`.

### Решение

#### 1. Исправьте `.env`

**Неправильно** (не работает в Docker):
```bash
DATABASE_URL=postgresql://adapto:changeme@localhost:5432/adapto
REDIS_URL=redis://localhost:6379/0
```

**Правильно** (для Docker):
```bash
DATABASE_URL=postgresql://adapto:changeme@postgres:5432/adapto
REDIS_URL=redis://redis:6379/0
```

#### 2. Перезапустите контейнеры

```bash
docker compose down
docker compose up -d
```

### Диагностика

```bash
# Проверить DATABASE_URL
grep DATABASE_URL .env

# Проверить что PostgreSQL запущен
docker compose logs postgres | tail -20

# Проверить сеть Docker
docker network inspect adapto_default

# Тест подключения из backend
docker exec adapto-backend-1 python manage.py dbshell
```

### Важно

В Docker Compose сервисы общаются по именам:
- `postgres` — база данных
- `redis` — кэш
- `backend` — Django
- `frontend` — Next.js

**Не используйте** `localhost` в `.env` для Docker окружения!

---

## 🔄 ERR_TOO_MANY_REDIRECTS

### Симптомы

```
Страница недоступна
Сайт dash.example.com выполнил переадресацию слишком много раз.
ERR_TOO_MANY_REDIRECTS
```

### Причина

Цикл редиректов между Django и reverse proxy:
1. Caddy обрабатывает HTTPS и передает HTTP в Django
2. Django видит HTTP и пытается перенаправить на HTTPS
3. Caddy снова отправляет HTTP в Django
4. Бесконечный цикл

### Решение

#### 1. Проверьте Django settings

Django должен доверять заголовкам от reverse proxy:

```python
# settings.py
# НЕ включаем SECURE_SSL_REDIRECT — HTTPS обрабатывает Caddy
# SECURE_SSL_REDIRECT = True  # Должно быть отключено!

# Настройки для reverse proxy
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
```

#### 2. Проверьте Caddyfile

```caddyfile
dash.example.com {
    reverse_proxy backend:8000 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-Host {host}
    }
}
```

#### 3. Очистите кэш браузера

- Chrome/Edge: `Ctrl+Shift+Delete` → Очистить cookie и кэш
- Firefox: `Ctrl+Shift+Delete` → Очистить cookie и кэш
- Или используйте режим инкогнито

### Диагностика

```bash
# Проверить цепочку редиректов
curl -L -v https://dash.example.com/admin/ 2>&1 | grep -E "(HTTP|Location)"

# Логи Caddy
docker compose logs caddy | tail -50

# Логи Django
docker compose logs backend | tail -50

# Проверить настройки Django
docker exec adapto-backend-1 python manage.py shell -c "
from django.conf import settings
print('SECURE_SSL_REDIRECT:', getattr(settings, 'SECURE_SSL_REDIRECT', 'НЕ ЗАДАН'))
print('SECURE_PROXY_SSL_HEADER:', getattr(settings, 'SECURE_PROXY_SSL_HEADER', 'НЕ ЗАДАН'))
"
```

---

## 🎨 Проблемы с переменными окружения Frontend

### Симптомы

1. API URL неправильный
2. Переменные `NEXT_PUBLIC_*` не подхватываются
3. Ошибка: `"next start" does not work with "output: standalone"`

### Причина

В Next.js standalone режиме `NEXT_PUBLIC_*` переменные встраиваются в код **на этапе сборки**, а не runtime.

### Решение

#### 1. Переменные передаются через build args

В `docker-compose.yml`:

```yaml
frontend:
  build:
    context: ./apps/front
    dockerfile: Dockerfile
    args:
      NEXT_PUBLIC_API_URL: /api/v1
      NEXT_PUBLIC_WS_URL: /ws
      NEXT_PUBLIC_DEBUG: 0
```

#### 2. Пересоберите frontend

```bash
# Остановить
docker compose down

# Пересобрать с новыми args
docker compose build --no-cache frontend

# Запустить
docker compose up -d
```

#### 3. Проверьте Dockerfile

```dockerfile
# Build-time переменные
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# Standalone server
CMD ["node", "server.js"]
```

### Диагностика

```bash
# Логи frontend
docker compose logs frontend | tail -50

# Проверить переменные в контейнере
docker exec adapto-frontend-1 env | grep NEXT_PUBLIC
```

### Тестовая страница

Если в проекте есть `/env-test`:
1. Откройте `http://localhost/env-test`
2. Проверьте что переменные отображаются правильно

---

## 🐳 Общие проблемы Docker

### Порты заняты

```
Error: Bind for 0.0.0.0:80 failed: port is already allocated
```

**Решение**:
```bash
# Найти процесс
sudo lsof -i :80

# Остановить или изменить порт в docker-compose.yml
```

### Нет места на диске

```
no space left on device
```

**Решение**:
```bash
# Очистка Docker
docker system prune -a

# Удаление неиспользуемых volumes
docker volume prune

# Проверка места
df -h
docker system df
```

### Контейнер постоянно перезапускается

**Диагностика**:
```bash
# Логи контейнера
docker compose logs backend

# Статус
docker compose ps

# События
docker events --filter container=adapto-backend-1
```

### Сеть недоступна

```bash
# Проверка сетей
docker network ls

# Пересоздание сети
docker compose down
docker network rm adapto_default
docker compose up -d
```

---

## 📊 Общая диагностика

### Скрипт диагностики

```bash
#!/bin/bash
echo "=== Docker Status ==="
docker compose ps

echo -e "\n=== Container Health ==="
docker ps --format "table {{.Names}}\t{{.Status}}"

echo -e "\n=== Recent Logs ==="
docker compose logs --tail=20

echo -e "\n=== Environment Check ==="
echo "DATABASE_URL: $(grep DATABASE_URL .env)"
echo "CSRF_TRUSTED_ORIGINS: $(grep CSRF_TRUSTED_ORIGINS .env)"

echo -e "\n=== Network Check ==="
docker exec adapto-backend-1 ping -c 1 postgres 2>/dev/null && echo "PostgreSQL: OK" || echo "PostgreSQL: FAIL"
docker exec adapto-backend-1 ping -c 1 redis 2>/dev/null && echo "Redis: OK" || echo "Redis: FAIL"

echo -e "\n=== Django Settings ==="
docker exec adapto-backend-1 python manage.py shell -c "
from django.conf import settings
print('DEBUG:', settings.DEBUG)
print('ALLOWED_HOSTS:', settings.ALLOWED_HOSTS)
print('CSRF_TRUSTED_ORIGINS:', getattr(settings, 'CSRF_TRUSTED_ORIGINS', 'NOT SET'))
"
```

Сохраните как `diagnose.sh` и запустите:

```bash
chmod +x diagnose.sh
./diagnose.sh > diagnosis.txt
```

---

## 🔗 Связанные документы

- [Настройка окружения](../setup/ENVIRONMENT.md)
- [Docker и развёртывание](../setup/DOCKER.md)
- [Архитектура](../architecture/OVERVIEW.md)
