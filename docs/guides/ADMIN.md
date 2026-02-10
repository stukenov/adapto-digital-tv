# 🔑 Администрирование

Руководство по настройке и управлению администраторами Django в Adapto Digital TV.

## 📋 Автоматическое создание суперпользователя

При запуске Docker контейнеров суперпользователь создается автоматически на основе переменных окружения.

### Настройка через .env

```bash
# Admin User Settings
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=your-secure-password
```

> **Примечание**: Если `DJANGO_SUPERUSER_PASSWORD` не задан, пароль будет сгенерирован автоматически и показан в логах.

---

## 🔐 Получение данных администратора

### При первом запуске

Логин и пароль отображаются в логах Docker:

```bash
# Просмотр логов backend
docker compose logs backend | grep -A 10 "Суперпользователь"
```

Пример вывода:
```
============================================================
Суперпользователь успешно создан!

Username: admin
Email: admin@example.com
Password: [сгенерированный пароль]

Админ-панель: https://dash.example.com/admin/
============================================================
```

### Для существующего контейнера

```bash
# Войти в контейнер
docker exec -it adapto-backend-1 bash

# Создать нового админа или показать существующего
python manage.py create_superuser_auto --force
```

### Проверка файла с данными

```bash
docker exec adapto-backend-1 cat /tmp/adapto_admin_info.txt
```

---

## 👤 Создание администратора вручную

### Способ 1: Через переменные окружения

1. Отредактируйте `.env`:
   ```bash
   DJANGO_SUPERUSER_USERNAME=myusername
   DJANGO_SUPERUSER_EMAIL=my@email.com
   DJANGO_SUPERUSER_PASSWORD=mypassword
   ```

2. Перезапустите контейнер:
   ```bash
   docker compose restart backend
   ```

### Способ 2: Через команду Django

```bash
docker exec -it adapto-backend-1 python manage.py create_superuser_auto \
  --username myusername \
  --email my@email.com \
  --password mypassword \
  --force
```

### Способ 3: Интерактивное создание

```bash
docker exec -it adapto-backend-1 python manage.py createsuperuser
```

---

## 🌐 Админ-панель

### URL адреса

| Среда | URL |
|-------|-----|
| Production | https://dash.example.com/admin/ |
| С основного домена | https://example.com/admin/django/ |
| Development | http://localhost/admin/django/ |

### Вход

1. Откройте URL админ-панели
2. Введите Username и Password
3. Нажмите "Войти"

---

## 🛠️ Управление пользователями

### Просмотр суперпользователей

```bash
docker exec adapto-backend-1 python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
admins = User.objects.filter(is_superuser=True)
for admin in admins:
    print(f'{admin.username} ({admin.email})')
"
```

### Смена пароля

```bash
# Интерактивно
docker exec -it adapto-backend-1 python manage.py changepassword admin

# Программно
docker exec adapto-backend-1 python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.get(username='admin')
user.set_password('new-password')
user.save()
print('Пароль изменён')
"
```

### Создание дополнительного администратора

```bash
docker exec -it adapto-backend-1 python manage.py create_superuser_auto \
  --username admin2 \
  --email admin2@example.com
```

### Деактивация пользователя

```bash
docker exec adapto-backend-1 python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.get(username='admin2')
user.is_active = False
user.save()
print('Пользователь деактивирован')
"
```

---

## ⚠️ Безопасность

### Рекомендации

1. **Смените пароль** после первого входа в production
2. **Используйте сложные пароли** (минимум 12 символов, буквы, цифры, спецсимволы)
3. **Удалите временный файл** с данными администратора:
   ```bash
   docker exec adapto-backend-1 rm /tmp/adapto_admin_info.txt
   ```
4. **Ограничьте доступ** к админ-панели по IP (через Caddy/Nginx)
5. **Включите 2FA** если поддерживается

### Ограничение доступа по IP

Добавьте в `Caddyfile`:

```caddyfile
dash.example.com {
    @blocked not remote_ip 192.168.1.0/24 10.0.0.0/8
    respond @blocked "Access Denied" 403
    
    reverse_proxy backend:8000 {
        # ... headers ...
    }
}
```

---

## 📝 Логирование

Все действия по созданию суперпользователя логируются:

- Docker логи контейнера `backend`
- Временный файл `/tmp/adapto_admin_info.txt`

Просмотр логов:

```bash
# Логи backend
docker compose logs backend | grep -i admin

# Логи авторизации (если настроено)
docker exec adapto-backend-1 cat /var/log/django/auth.log
```

---

## 🎨 Кастомизация админ-панели

### Локализация

Админ-панель поддерживает казахский и русский языки. Настройка в `settings.py`:

```python
LANGUAGE_CODE = 'ru'
LANGUAGES = [
    ('kk', 'Қазақша'),
    ('ru', 'Русский'),
]
```

### Темы и стили

Кастомные стили в `templates/admin/base_site.html`.

---

## 🔗 Связанные документы

- [Настройка окружения](../setup/ENVIRONMENT.md)
- [Docker и развёртывание](../setup/DOCKER.md)
- [Решение проблем](../troubleshooting/COMMON_ISSUES.md)
