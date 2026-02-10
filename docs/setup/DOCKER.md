# 🐳 Docker и развёртывание

Руководство по работе с Docker и развёртыванию проекта ADAPTO.

## 📋 Требования

- Docker 20.10+
- Docker Compose v2 (команда `docker compose`)
- 4 ГБ RAM минимум
- 20 ГБ свободного места

---

## 🚀 Запуск проекта

### Production развёртывание

```bash
# Рекомендуемый способ
make deploy-prod
```

Эта команда выполняет:
1. Обновление системных пакетов
2. `git pull` для получения последних изменений
3. Создание необходимых директорий
4. Сборку и запуск Docker контейнеров
5. Перезапуск Caddy

### Ручной запуск

```bash
# Создание директорий
mkdir -p media/hls media/uploads uploads
mkdir -p storage/seaweedfs/master storage/seaweedfs/volume storage/seaweedfs/filer

# Запуск
docker compose -f docker-compose.yml up -d --build --remove-orphans
```

---

## 📦 Сервисы

### Основные сервисы (docker-compose.yml)

| Сервис | Образ | Порт | Описание |
|--------|-------|------|----------|
| `caddy` | caddy:2 | 80, 443 | Reverse proxy с автоматическим SSL |
| `backend` | apps/back | 8000 | Django REST API |
| `back-express` | apps/back.js | 8001 | Express.js API (быстрый) |
| `frontend` | apps/front | 3000 | Next.js веб-приложение |
| `postgres` | postgres:15 | 5432 | База данных |
| `redis` | redis:7 | 6379 | Кэш и сессии |
| `mediamtx` | bluenviron/mediamtx | 8554, 1935, 8888, 8889 | Стриминг сервер |
| `hlsx` | apps/hlsx | 8280 | HLS прокси |

### Дополнительные compose файлы

| Файл | Назначение |
|------|------------|
| `docker-compose.ffplayout.yml` | FFplayout для автоматического вещания |
| `docker-compose.timetable.yml` | Генерация расписания |
| `docker-compose.tools.yml` | Утилиты обработки видео |

---

## 🌐 Доступные URL

### Production (с доменами)

| Сервис | URL | Описание |
|--------|-----|----------|
| **Frontend** | https://example.com | Основной сайт |
| **Django Admin** | https://dash.example.com/admin/ | Админ-панель |
| **API (Express)** | https://example.com/api/v1/ | Быстрый REST API |
| **API (Django)** | https://dash.example.com/api/v1/ | Django REST API |
| **HLS Стримы** | https://stream.example.com/ | MediaMTX HLS |
| **HLSX** | https://hlsx.example.com/ | HLS прокси |

### Development (localhost)

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost |
| Django Admin | http://localhost/admin/django/ |
| API | http://localhost/api/v1/ |
| MediaMTX HLS | http://localhost:8880 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## 🔧 Управление контейнерами

### Статус и логи

```bash
# Статус всех контейнеров
docker ps

# Статус с фильтрацией
docker compose ps

# Логи всех сервисов
docker compose logs

# Логи конкретного сервиса
docker compose logs -f backend

# Последние 100 строк логов
docker compose logs --tail=100 frontend
```

### Перезапуск сервисов

```bash
# Перезапуск конкретного сервиса
docker compose restart backend

# Перезапуск всего стека
docker compose restart

# Остановка и запуск
docker compose down
docker compose up -d
```

### Пересборка образов

```bash
# Пересборка конкретного сервиса
docker compose build backend

# Пересборка без кэша
docker compose build --no-cache backend

# Пересборка и запуск
docker compose up -d --build backend
```

---

## 💻 Работа с контейнерами

### Выполнение команд

```bash
# Bash в контейнере backend
docker exec -it adapto-backend-1 bash

# Выполнение команды Django
docker exec adapto-backend-1 python manage.py migrate

# Django shell
docker exec -it adapto-backend-1 python manage.py shell

# PostgreSQL shell
docker exec -it adapto-postgres-1 psql -U adapto -d adapto
```

### Django команды

```bash
# Миграции
docker exec adapto-backend-1 python manage.py migrate

# Создание суперпользователя
docker exec -it adapto-backend-1 python manage.py createsuperuser

# Сбор статики
docker exec adapto-backend-1 python manage.py collectstatic --noinput

# Создание тестового канала
docker exec adapto-backend-1 python manage.py create_test_channel
```

---

## 📁 Volumes и данные

### Именованные volumes

| Volume | Назначение |
|--------|------------|
| `backend_media` | Django медиафайлы |
| `caddy_data` | Caddy сертификаты и данные |
| `caddy_config` | Конфигурация Caddy |
| `next_image_cache` | Кэш оптимизации изображений Next.js |

### Bind mounts (директории хоста)

| Путь хоста | Путь в контейнере | Сервис |
|------------|-------------------|--------|
| `./media/hls` | `/var/www/hls` | caddy |
| `./media/hls` | `/app/media/hls` | mediamtx |
| `./mediamtx.yml` | `/mediamtx.yml` | mediamtx |
| `./Caddyfile` | `/etc/caddy/Caddyfile` | caddy |

### Очистка данных

```bash
# Удаление контейнеров и сетей
docker compose down

# Удаление контейнеров, сетей и volumes
docker compose down -v

# Полная очистка (включая образы)
docker compose down -v --rmi all

# Очистка неиспользуемых ресурсов Docker
docker system prune -a
```

---

## 🔒 SSL/TLS сертификаты

Caddy автоматически получает и обновляет SSL сертификаты от Let's Encrypt.

### Требования для автоматического SSL

1. Домены должны указывать на сервер
2. Порты 80 и 443 должны быть открыты
3. Firewall должен разрешать входящие соединения

### Проверка сертификатов

```bash
# Логи Caddy
docker compose logs caddy | grep -i certificate

# Статус сертификата
curl -vI https://example.com 2>&1 | grep -A5 "Server certificate"
```

---

## 📊 Мониторинг и отладка

### Health checks

```bash
# Проверка здоровья сервисов
curl -s http://localhost/api/v1/health/
curl -s http://localhost:9333/cluster/status  # SeaweedFS (если используется)
```

### Просмотр ресурсов

```bash
# Использование ресурсов
docker stats

# Использование дискового пространства
docker system df
```

### Отладка сети

```bash
# Список сетей
docker network ls

# Инспекция сети проекта
docker network inspect adapto_default

# Проверка соединения между контейнерами
docker exec adapto-backend-1 ping postgres
```

---

## ⚙️ Конфигурация ресурсов

### Лимиты ресурсов (из docker-compose.yml)

| Сервис | Memory Limit | Memory Reservation |
|--------|--------------|-------------------|
| backend | 512M | 256M |
| back-express | 128M | 64M |
| frontend | 256M | 128M |
| postgres | 1G | 512M |
| redis | 256M | 128M |

### Изменение лимитов

Для изменения лимитов отредактируйте секцию `deploy.resources` в `docker-compose.yml`:

```yaml
backend:
  deploy:
    resources:
      limits:
        memory: 1G      # Увеличить до 1 ГБ
      reservations:
        memory: 512M
```

---

## 🔄 CI/CD

### GitHub Actions

Проект использует GitHub Actions для CI/CD:

- **ci-cd.yml** — Тесты и деплой при push
- **release.yml** — Создание релизов по тегам
- **dependabot-auto-merge.yml** — Автоматический merge обновлений зависимостей

### Ручной деплой

```bash
# На сервере
cd /path/to/adapto
git pull
make deploy-prod
```

---

## 📝 Полезные команды

```bash
# Быстрый статус
docker compose ps

# Перезапуск всего
docker compose restart

# Обновление с пересборкой
docker compose up -d --build --remove-orphans

# Просмотр логов в реальном времени
docker compose logs -f

# Остановка всего
docker compose down

# Очистка и перезапуск
docker compose down -v && docker compose up -d --build
```

---

## 🔗 Связанные документы

- [Быстрый старт](QUICK_START.md)
- [Настройка окружения](ENVIRONMENT.md)
- [Архитектура](../architecture/OVERVIEW.md)
- [Решение проблем](../troubleshooting/COMMON_ISSUES.md)
