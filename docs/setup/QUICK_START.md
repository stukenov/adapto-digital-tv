# 🚀 Быстрый старт

Минимальные шаги для запуска проекта ADAPTO.

## 📋 Требования

- **Docker** 20.10+ и Docker Compose v2
- **Git**
- 4 ГБ RAM минимум (рекомендуется 8 ГБ)
- 20 ГБ свободного места на диске

## ⚡ Быстрый запуск (5 минут)

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd adapto
```

### 2. Настройка окружения

```bash
# Копируем пример конфигурации
cp env.example .env
```

> **Важно**: Для production обязательно измените `SECRET_KEY` и пароли в `.env`

### 3. Запуск проекта

```bash
# Разворачивание на production
make deploy-prod
```

Эта команда автоматически:
- Создаст необходимые директории
- Соберёт Docker образы
- Запустит все сервисы
- Выполнит миграции базы данных
- Создаст суперпользователя Django

### 4. Проверка работоспособности

После запуска проверьте что всё работает:

```bash
# Статус контейнеров
docker ps

# Логи (если есть проблемы)
docker compose logs -f
```

## 🌐 Доступ к сервисам

| Сервис | URL | Описание |
|--------|-----|----------|
| **Сайт** | http://localhost | Next.js фронтенд |
| **Django Admin** | http://localhost/admin/django/ | Админ-панель Django |
| **API** | http://localhost/api/v1/ | REST API |

> **Примечание**: На production с настроенными доменами:
> - Сайт: https://example.com
> - Admin: https://dash.example.com/admin/
> - API: https://example.com/api/v1/

## 🔑 Данные администратора

При первом запуске суперпользователь создаётся автоматически. Данные по умолчанию:

| Поле | Значение |
|------|----------|
| Username | `admin` |
| Email | `admin@example.com` |
| Password | Из `DJANGO_SUPERUSER_PASSWORD` в `.env` |

Получить данные из логов:

```bash
docker compose logs backend | grep -A 10 "Суперпользователь"
```

## 🛑 Остановка проекта

```bash
docker compose down
```

Для полной очистки (включая volumes):

```bash
docker compose down -v
```

## 📁 Структура после запуска

```
adapto/
├── .env                   # Ваши настройки
├── media/
│   └── hls/               # HLS сегменты (создаётся автоматически)
├── storage/
│   └── seaweedfs/         # Данные SeaweedFS (создаётся автоматически)
└── ...
```

## 🔧 Полезные команды

```bash
# Перезапуск конкретного сервиса
docker compose restart backend

# Просмотр логов сервиса
docker compose logs -f frontend

# Выполнение команды в контейнере
docker exec -it adapto-backend-1 bash

# Применение миграций
docker exec adapto-backend-1 python manage.py migrate

# Создание нового суперпользователя
docker exec -it adapto-backend-1 python manage.py createsuperuser
```

## ❓ Проблемы?

- **Порты заняты**: Измените порты в `docker-compose.yml`
- **Ошибки подключения к БД**: Проверьте `DATABASE_URL` в `.env`
- **CSRF ошибки**: Проверьте `CSRF_TRUSTED_ORIGINS` в `.env`

Подробнее: [Решение частых проблем](../troubleshooting/COMMON_ISSUES.md)

---

## 🔗 Следующие шаги

- [Настройка переменных окружения](ENVIRONMENT.md) — подробная конфигурация
- [Docker и развёртывание](DOCKER.md) — продвинутые настройки Docker
- [Архитектура проекта](../architecture/OVERVIEW.md) — понимание структуры
- [Настройка стриминга](../guides/STREAMING.md) — MediaMTX конфигурация
