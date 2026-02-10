from django.conf import settings
from django.contrib import admin

# Настройка заголовков админ-панели
admin.site.site_header = getattr(settings, "ADMIN_SITE_HEADER", "Adapto Digital TV - Админ-панель")
admin.site.site_title = getattr(settings, "ADMIN_SITE_TITLE", "Adapto Digital TV")
admin.site.index_title = getattr(settings, "ADMIN_INDEX_TITLE", "Управление контентом")

# Переопределение названий разделов
admin.site.site_url = None  # Убираем ссылку "Перейти на сайт"
