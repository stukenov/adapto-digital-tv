"""
URL configuration for adapto_back project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
"""

from django.conf import settings
from django.urls import re_path
from django.views.static import serve as static_serve
from django.contrib import admin
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions
from django.http import HttpResponse
from .auth_views import CsrfTokenView, LoginView, LogoutView, MeView

# Импортируем настройки админ-панели
from . import admin as admin_config
from . import admin_translations


schema_view = get_schema_view(
    openapi.Info(
        title="Adapto Digital TV API",
        default_version="v1",
        description="API для управления телеканалами, программами передач, видеоконтентом и медиа-активами",
        terms_of_service="https://example.com/terms/",
        contact=openapi.Contact(email="api@example.com"),
        license=openapi.License(name="GPL-3.0 License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", lambda request: HttpResponse("ok")),
    path("api/v1/", include("tvchannels.urls")),
    # Auth endpoints for frontend
    path("api/v1/auth/csrf/", CsrfTokenView.as_view()),
    path("api/v1/auth/login/", LoginView.as_view()),
    path("api/v1/auth/logout/", LogoutView.as_view()),
    path("api/v1/auth/me/", MeView.as_view()),
    path(
        "swagger/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
]

# Отдаём media-файлы всегда (даже при DEBUG=False)
urlpatterns += [
    re_path(r"^media/(?P<path>.*)$", static_serve, {"document_root": settings.MEDIA_ROOT}),
]
