from rest_framework.routers import DefaultRouter

from .views import (ChannelViewSet, ProgramViewSet, VideoFileViewSet,
                    VideoMetadataViewSet)

router = DefaultRouter()
router.register(r"tvchannels", ChannelViewSet)
router.register(r"programs", ProgramViewSet)
router.register(r"videos", VideoFileViewSet)
router.register(r"video-metadata", VideoMetadataViewSet)

urlpatterns = router.urls
