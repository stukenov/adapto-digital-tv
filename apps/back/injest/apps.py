from django.apps import AppConfig


class InjestConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "injest"
    verbose_name = "Импорт видеофайлов"
