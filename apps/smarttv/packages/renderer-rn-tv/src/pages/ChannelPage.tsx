import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  BackHandler,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Video from 'react-native-video';
import { TVTouchable } from '../components/TVTouchable';
import { usePlayer } from '../hooks/usePlayer';
import { useChannels, Channel } from 'adapto-app-core';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ChannelPage: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { channel: routeChannel } = route.params as { channel: Channel };
  const videoRef = useRef<any>(null);
  const [showControls, setShowControls] = useState(false);
  const [channel, setChannel] = useState<Channel | null>(routeChannel);
  const [loading, setLoading] = useState(false);

  const { getChannelWithSchedule } = useChannels({ autoFetch: false });

  const {
    isPlaying,
    volume,
    currentTime,
    duration,
    play,
    pause,
    stop,
    setVolume: changeVolume,
    seek,
  } = usePlayer();

  // Load full channel data with schedule
  useEffect(() => {
    const loadFullChannelData = async () => {
      if (!routeChannel.slug && !routeChannel.id) return;
      
      setLoading(true);
      try {
        const fullChannel = await getChannelWithSchedule(routeChannel.slug || routeChannel.id);
        if (fullChannel) {
          setChannel(fullChannel);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load full channel data:', error);
        // Keep using route channel if API fails
      } finally {
        setLoading(false);
      }
    };

    loadFullChannelData();
  }, [routeChannel, getChannelWithSchedule]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (showControls) {
          setShowControls(false);
          return true;
        }
        stop();
        navigation.goBack();
        return true;
      }
    );

    return () => backHandler.remove();
  }, [showControls, stop, navigation]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleShowControls = () => {
    setShowControls(!showControls);
  };

  const handleVolumeUp = () => {
    changeVolume(Math.min(volume + 0.1, 1));
  };

  const handleVolumeDown = () => {
    changeVolume(Math.max(volume - 0.1, 0));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatProgramTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '--:--';
    }
  };

  const isLive = () => {
    if (!channel?.currentProgram?.startTime || !channel?.currentProgram?.endTime) {
      return false;
    }
    
    try {
      const now = new Date();
      const startTime = new Date(channel.currentProgram.startTime);
      const endTime = new Date(channel.currentProgram.endTime);
      return now >= startTime && now <= endTime;
    } catch (error) {
      return false;
    }
  };

  if (!channel) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Канал не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: channel.streamUrl }}
          style={styles.video}
          resizeMode='contain'
          onLoad={() => play()}
          onError={error => {
            // eslint-disable-next-line no-console
            console.error('Video error:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить видео поток');
          }}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Загружаем расписание...</Text>
          </View>
        )}

        {showControls && (
          <View style={styles.controlsOverlay}>
            <View style={styles.topControls}>
              <View style={styles.channelHeader}>
                <Text style={styles.channelName}>{channel.name}</Text>
                {isLive() && (
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>В ЭФИРЕ</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.programInfo}>
                <Text style={styles.programTitle}>
                  {channel.currentProgram?.title || 'Программа не указана'}
                </Text>
                <Text style={styles.programDescription}>
                  {channel.currentProgram?.description || channel.description || 'Описание недоступно'}
                </Text>
                {channel.currentProgram?.startTime && channel.currentProgram?.endTime && (
                  <Text style={styles.programTime}>
                    {formatProgramTime(channel.currentProgram.startTime)} - {formatProgramTime(channel.currentProgram.endTime)}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.centerControls}>
              <TVTouchable
                style={styles.controlButton}
                onPress={handlePlayPause}
                hasTVPreferredFocus={true}
              >
                <Text style={styles.controlButtonText}>
                  {isPlaying ? '⏸️' : '▶️'}
                </Text>
              </TVTouchable>
            </View>

            <View style={styles.bottomControls}>
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Text>
              </View>

              <View style={styles.volumeContainer}>
                <TVTouchable
                  style={styles.volumeButton}
                  onPress={handleVolumeDown}
                >
                  <Text style={styles.volumeButtonText}>🔉</Text>
                </TVTouchable>

                <View style={styles.volumeBar}>
                  <View
                    style={[styles.volumeLevel, { width: `${volume * 100}%` }]}
                  />
                </View>

                <TVTouchable
                  style={styles.volumeButton}
                  onPress={handleVolumeUp}
                >
                  <Text style={styles.volumeButtonText}>🔊</Text>
                </TVTouchable>
              </View>
            </View>
          </View>
        )}

        <TVTouchable
          style={styles.videoOverlay}
          onPress={handleShowControls}
          activeOpacity={1}
        >
          <View />
        </TVTouchable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    width: screenWidth,
    height: screenHeight,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'space-between',
    padding: 48,
  },
  topControls: {
    alignItems: 'center',
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  channelName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    marginRight: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  programInfo: {
    alignItems: 'center',
    maxWidth: 800,
  },
  programTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  programDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  programTime: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  centerControls: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlButtonText: {
    fontSize: 40,
    color: '#ffffff',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    flex: 1,
  },
  timeText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '500',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  volumeButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  volumeButtonText: {
    fontSize: 24,
  },
  volumeBar: {
    width: 200,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginHorizontal: 16,
  },
  volumeLevel: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
});
