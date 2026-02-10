"""
Русские переводы для админ-панели Django
"""

from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin, UserAdmin
from django.contrib.auth.models import Group, User

# Переопределяем названия встроенных моделей
User._meta.verbose_name = "Пользователь"
User._meta.verbose_name_plural = "Пользователи"

Group._meta.verbose_name = "Группа"
Group._meta.verbose_name_plural = "Группы"

# Переопределяем поля User модели
User._meta.get_field("username").verbose_name = "Имя пользователя"
User._meta.get_field("first_name").verbose_name = "Имя"
User._meta.get_field("last_name").verbose_name = "Фамилия"
User._meta.get_field("email").verbose_name = "Email"
User._meta.get_field("is_staff").verbose_name = "Статус персонала"
User._meta.get_field("is_active").verbose_name = "Активен"
User._meta.get_field("is_superuser").verbose_name = "Статус суперпользователя"
User._meta.get_field("last_login").verbose_name = "Последний вход"
User._meta.get_field("date_joined").verbose_name = "Дата регистрации"

# Переопределяем поля Group модели
Group._meta.get_field("name").verbose_name = "Название"
Group._meta.get_field("permissions").verbose_name = "Разрешения"


# Переопределяем админ-классы с русскими fieldsets
class RussianUserAdmin(UserAdmin):
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Личная информация", {"fields": ("first_name", "last_name", "email")}),
        (
            "Разрешения",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        ("Важные даты", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "password1", "password2"),
            },
        ),
    )
    list_display = ("username", "email", "first_name", "last_name", "is_staff")
    search_fields = ("username", "first_name", "last_name", "email")


class RussianGroupAdmin(GroupAdmin):
    pass


# Перерегистрируем админ-классы
admin.site.unregister(User)
admin.site.unregister(Group)
admin.site.register(User, RussianUserAdmin)
admin.site.register(Group, RussianGroupAdmin)
