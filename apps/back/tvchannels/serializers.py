from rest_framework import serializers

from .models import Channel, Program, VideoFile, VideoMetadata


class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = [
            "id",
            "name",
            "slug",
            "is_active",
            "logo",
            "description",
            "stream_url",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ProgramSerializer(serializers.ModelSerializer):
    channel_name = serializers.CharField(source="channel.name", read_only=True)

    class Meta:
        model = Program
        fields = [
            "id",
            "channel",
            "channel_name",
            "name",
            "description",
            "start_time",
            "end_time",
            "duration",
        ]
        read_only_fields = ["duration"]


class ProgramListSerializer(serializers.ModelSerializer):
    channel_name = serializers.CharField(source="channel.name", read_only=True)

    class Meta:
        model = Program
        fields = ["id", "channel_name", "name", "start_time", "end_time"]


class VideoMetadataSerializer(serializers.ModelSerializer):
    display_title = serializers.ReadOnlyField()

    class Meta:
        model = VideoMetadata
        fields = [
            "id",
            "original_title",
            "display_title",
            "series_name",
            "season_number",
            "episode_number",
            "category",
            "age_rating",
            "language",
            "description",
            "director",
            "actors",
            "year",
            "country",
            "tags",
            "is_active",
        ]


class VideoFileSerializer(serializers.ModelSerializer):
    metadata = VideoMetadataSerializer(read_only=True)
    file_size_mb = serializers.ReadOnlyField()
    duration_formatted = serializers.ReadOnlyField()
    resolution = serializers.ReadOnlyField()

    class Meta:
        model = VideoFile
        fields = [
            "id",
            "name",
            "file_path",
            "extension",
            "duration_seconds",
            "duration_frames",
            "duration_formatted",
            "file_size",
            "file_size_mb",
            "video_bitrate",
            "audio_bitrate",
            "video_codec",
            "audio_codec",
            "resolution_width",
            "resolution_height",
            "resolution",
            "framerate",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class VideoFileListSerializer(serializers.ModelSerializer):
    file_size_mb = serializers.ReadOnlyField()
    duration_formatted = serializers.ReadOnlyField()
    resolution = serializers.ReadOnlyField()
    category = serializers.CharField(source="metadata.category", read_only=True)
    display_title = serializers.CharField(
        source="metadata.display_title", read_only=True
    )

    class Meta:
        model = VideoFile
        fields = [
            "id",
            "name",
            "display_title",
            "extension",
            "duration_formatted",
            "file_size_mb",
            "resolution",
            "category",
            "created_at",
        ]
