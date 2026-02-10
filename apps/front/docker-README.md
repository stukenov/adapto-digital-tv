# 🐳 Docker Deployment для Adapto Digital TV Web

Это руководство поможет вам развернуть Adapto Digital TV Web с помощью Docker.

## 📋 Предварительные требования

- Docker 20.10+ 
- Docker Compose 2.0+

## 🚀 Быстрый запуск

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd adapto-web
```

### 2. Настройка переменных окружения
Создайте файл `.env.local`:
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1

# Production settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
HOSTNAME=0.0.0.0
```

### 3. Сборка и запуск с Docker Compose
```bash
# Запуск в фоновом режиме
docker-compose up -d

# Просмотр логов
docker-compose logs -f adapto-web

# Остановка
docker-compose down
```

### 4. Ручная сборка Docker образа
```bash
# Сборка образа
docker build -t adapto-web .

# Запуск контейнера
docker run -d \
  --name adapto-web \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1 \
  adapto-web
```

## 🔧 Конфигурация

### Environment Variables
- `NEXT_PUBLIC_API_URL` - URL бэкенд API (обязательно)
- `NODE_ENV` - Окружение (production/development)
- `PORT` - Порт приложения (по умолчанию: 3000)
- `HOSTNAME` - Hostname для привязки (по умолчанию: 0.0.0.0)

### Docker Health Check
Включена проверка здоровья контейнера:
- Интервал: 30 секунд
- Таймаут: 10 секунд  
- Повторы: 3
- Период запуска: 40 секунд

## 📊 Мониторинг

### Проверка статуса
```bash
# Статус контейнеров
docker-compose ps

# Логи приложения
docker-compose logs adapto-web

# Использование ресурсов
docker stats adapto-web
```

### Health Check
```bash
# Проверка здоровья приложения
curl http://localhost:3000/api/health

# Или
wget --quiet --tries=1 --spider http://localhost:3000
```

## 🏗️ Особенности Dockerfile

### Multi-stage Build
1. **base** - Базовый образ с Node.js
2. **deps** - Установка production зависимостей
3. **builder** - Сборка приложения
4. **runner** - Финальный runtime образ

### Безопасность
- Использование non-root пользователя `nextjs`
- Минимальный Alpine Linux образ
- Только необходимые файлы в финальном образе

### Оптимизация
- Next.js standalone режим для минимального размера
- Многоэтапная сборка для кеширования слоев
- Исключение dev зависимостей в production

## 🌐 Production Deployment

### С Nginx Reverse Proxy
Раскомментируйте nginx сервис в `docker-compose.yml` и создайте `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream adapto-web {
        server adapto-web:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://adapto-web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Масштабирование
```bash
# Запуск нескольких реплик
docker-compose up -d --scale adapto-web=3

# С load balancer
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🐛 Устранение неполадок

### Контейнер не запускается
```bash
# Проверка логов
docker-compose logs adapto-web

# Запуск в интерактивном режиме
docker run -it --rm adapto-web sh
```

### Проблемы с API
- Убедитесь, что `NEXT_PUBLIC_API_URL` правильно настроен
- Проверьте доступность API сервера
- Проверьте сетевые настройки Docker

### Проблемы с производительностью
```bash
# Мониторинг ресурсов
docker stats

# Настройка лимитов памяти
docker run --memory=512m adapto-web
```

## 📝 Полезные команды

```bash
# Очистка неиспользуемых образов
docker system prune -a

# Просмотр размеров образов
docker images adapto-web

# Экспорт образа
docker save adapto-web:latest | gzip > adapto-web.tar.gz

# Импорт образа  
docker load < adapto-web.tar.gz
```