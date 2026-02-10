from django.utils import timezone
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Channel, Program, VideoFile, VideoMetadata
from .serializers import (ChannelSerializer, ProgramListSerializer,
                          ProgramSerializer, VideoFileListSerializer,
                          VideoFileSerializer, VideoMetadataSerializer)


class ChannelViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint для просмотра телеканалов.
    """

    queryset = Channel.objects.filter(is_active=True)
    serializer_class = ChannelSerializer
    lookup_field = "slug"

    @swagger_auto_schema(
        operation_description="Получить список активных телеканалов",
        responses={200: ChannelSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Получить детальную информацию о телеканале по его slug",
        responses={200: ChannelSerializer()},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Получить программу передач для конкретного канала",
        manual_parameters=[
            openapi.Parameter(
                "date",
                openapi.IN_QUERY,
                description="Дата в формате YYYY-MM-DD (по умолчанию - сегодня)",
                type=openapi.TYPE_STRING,
                required=False,
            )
        ],
        responses={200: ProgramListSerializer(many=True)},
    )
    @action(detail=True, methods=["get"])
    def schedule(self, request, slug=None):
        """Получить программу передач для канала на указанную дату."""
        channel = self.get_object()
        date_str = request.query_params.get("date")

        try:
            if date_str:
                date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
            else:
                date = timezone.now().date()

            start_datetime = timezone.datetime.combine(
                date, timezone.datetime.min.time()
            )
            end_datetime = timezone.datetime.combine(date, timezone.datetime.max.time())

            programs = Program.objects.filter(
                channel=channel, start_time__range=(start_datetime, end_datetime)
            ).order_by("start_time")

            serializer = ProgramListSerializer(programs, many=True)
            return Response(serializer.data)

        except ValueError:
            return Response(
                {"error": "Неверный формат даты. Используйте YYYY-MM-DD"}, status=400
            )


class ProgramViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint для просмотра программ передач.
    """

    queryset = Program.objects.all()
    serializer_class = ProgramSerializer

    def get_queryset(self):
        queryset = Program.objects.all().select_related("channel")

        # Фильтрация по каналу
        channel_id = self.request.query_params.get("channel", None)
        if channel_id:
            queryset = queryset.filter(channel_id=channel_id)

        # Фильтрация по дате
        date = self.request.query_params.get("date", None)
        if date:
            try:
                date_obj = timezone.datetime.strptime(date, "%Y-%m-%d").date()
                start_datetime = timezone.datetime.combine(
                    date_obj, timezone.datetime.min.time()
                )
                end_datetime = timezone.datetime.combine(
                    date_obj, timezone.datetime.max.time()
                )
                queryset = queryset.filter(
                    start_time__range=(start_datetime, end_datetime)
                )
            except ValueError:
                pass

        return queryset.order_by("start_time")

    @swagger_auto_schema(
        operation_description="Получить список программ",
        manual_parameters=[
            openapi.Parameter(
                "channel",
                openapi.IN_QUERY,
                description="ID канала для фильтрации",
                type=openapi.TYPE_INTEGER,
                required=False,
            ),
            openapi.Parameter(
                "date",
                openapi.IN_QUERY,
                description="Дата в формате YYYY-MM-DD",
                type=openapi.TYPE_STRING,
                required=False,
            ),
        ],
        responses={200: ProgramSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Получить детальную информацию о конкретной программе",
        responses={200: ProgramSerializer()},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


class VideoFileViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint для просмотра видеофайлов.
    """

    queryset = VideoFile.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return VideoFileListSerializer
        return VideoFileSerializer

    def get_queryset(self):
        queryset = VideoFile.objects.select_related("metadata").all()

        # Фильтрация по расширению
        extension = self.request.query_params.get("extension", None)
        if extension:
            queryset = queryset.filter(extension=extension)

        # Фильтрация по категории
        category = self.request.query_params.get("category", None)
        if category:
            queryset = queryset.filter(metadata__category=category)

        # Фильтрация по языку
        language = self.request.query_params.get("language", None)
        if language:
            queryset = queryset.filter(metadata__language=language)

        # Фильтрация по возрастному рейтингу
        age_rating = self.request.query_params.get("age_rating", None)
        if age_rating:
            queryset = queryset.filter(metadata__age_rating=age_rating)

        # Фильтрация по году
        year = self.request.query_params.get("year", None)
        if year:
            queryset = queryset.filter(metadata__year=year)

        # Только активные
        active_only = self.request.query_params.get("active_only", "true")
        if active_only.lower() == "true":
            queryset = queryset.filter(metadata__is_active=True)

        return queryset.order_by("-created_at")

    @swagger_auto_schema(
        operation_description="Получить список видеофайлов",
        manual_parameters=[
            openapi.Parameter(
                "extension",
                openapi.IN_QUERY,
                description="Фильтр по расширению файла",
                type=openapi.TYPE_STRING,
                required=False,
            ),
            openapi.Parameter(
                "category",
                openapi.IN_QUERY,
                description="Фильтр по категории (series, shows, movies, etc.)",
                type=openapi.TYPE_STRING,
                required=False,
            ),
            openapi.Parameter(
                "language",
                openapi.IN_QUERY,
                description="Фильтр по языку (kk, ru, en, etc.)",
                type=openapi.TYPE_STRING,
                required=False,
            ),
            openapi.Parameter(
                "age_rating",
                openapi.IN_QUERY,
                description="Фильтр по возрастному рейтингу (0+, 6+, 12+, 16+, 18+)",
                type=openapi.TYPE_STRING,
                required=False,
            ),
            openapi.Parameter(
                "year",
                openapi.IN_QUERY,
                description="Фильтр по году выпуска",
                type=openapi.TYPE_INTEGER,
                required=False,
            ),
            openapi.Parameter(
                "active_only",
                openapi.IN_QUERY,
                description="Показывать только активные файлы (true/false, по умолчанию true)",
                type=openapi.TYPE_STRING,
                required=False,
            ),
        ],
        responses={200: VideoFileListSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Получить детальную информацию о видеофайле",
        responses={200: VideoFileSerializer()},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


class VideoMetadataViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint для просмотра метаданных видео.
    """

    queryset = VideoMetadata.objects.all()
    serializer_class = VideoMetadataSerializer

    def get_queryset(self):
        queryset = VideoMetadata.objects.select_related("video_file").all()

        # Фильтрация по категории
        category = self.request.query_params.get("category", None)
        if category:
            queryset = queryset.filter(category=category)

        # Фильтрация по языку
        language = self.request.query_params.get("language", None)
        if language:
            queryset = queryset.filter(language=language)

        # Только активные
        active_only = self.request.query_params.get("active_only", "true")
        if active_only.lower() == "true":
            queryset = queryset.filter(is_active=True)

        return queryset.order_by("-updated_at")

    @swagger_auto_schema(
        operation_description="Получить список метаданных видео",
        manual_parameters=[
            openapi.Parameter(
                "category",
                openapi.IN_QUERY,
                description="Фильтр по категории",
                type=openapi.TYPE_STRING,
                required=False,
            ),
            openapi.Parameter(
                "language",
                openapi.IN_QUERY,
                description="Фильтр по языку",
                type=openapi.TYPE_STRING,
                required=False,
            ),
            openapi.Parameter(
                "active_only",
                openapi.IN_QUERY,
                description="Показывать только активные (true/false)",
                type=openapi.TYPE_STRING,
                required=False,
            ),
        ],
        responses={200: VideoMetadataSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Получить детальную информацию о метаданных видео",
        responses={200: VideoMetadataSerializer()},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
