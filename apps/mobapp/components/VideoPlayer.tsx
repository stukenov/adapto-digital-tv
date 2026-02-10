import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

interface VideoPlayerProps {
  streamUrl: string;
  channelName: string;
  onError?: (error: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function VideoPlayer({ streamUrl, channelName, onError }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showControls, setShowControls] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const maxRetries = 3;

  // Логируем для отладки
  console.log('🎥 VideoPlayer streamUrl:', streamUrl);
  console.log('📱 Platform:', Platform.OS);
  
  // Создаем видеоплеер с новым API
  const player = useVideoPlayer(streamUrl, (player) => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setRetryCount(0);

    const reloadStream = () => {
      try {
        setIsLoading(true);
        setHasError(false);
        setErrorMessage('');
        setRetryCount(prev => prev + 1);
        
        // Перезапускаем плеер с новым источником
        player.replace(streamUrl);
        player.play();
      } catch (error) {
        console.error('Error reloading stream:', error);
        setHasError(true);
        setErrorMessage(`Ошибка перезагрузки потока: ${error}`);
      }
    };

    // Подписываемся на события плеера
    const statusSubscription = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay') {
        setIsLoading(false);
        setHasError(false);
      } else if (status.status === 'error') {
        setIsLoading(false);
        setHasError(true);
        const error = `Ошибка воспроизведения: ${status.error}`;
        setErrorMessage(error);
        onError?.(error);
        
        // Автоматическая попытка переподключения
        if (retryCount < maxRetries) {
          setTimeout(() => {
            reloadStream();
          }, 2000);
        }
      } else if (status.status === 'loading') {
        setIsLoading(true);
      }
    });

    return () => {
      statusSubscription?.remove();
    };
  }, [streamUrl, player, retryCount, onError, maxRetries]);

  const togglePlayPause = () => {
    if (!hasError) {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    }
  };

  const toggleMute = () => {
    if (!hasError) {
      player.muted = !player.muted;
    }
  };

  const reloadStream = () => {
    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      setRetryCount(prev => prev + 1);
      
      // Перезапускаем плеер с новым источником
      player.replace(streamUrl);
      player.play();
    } catch (error) {
      console.error('Error reloading stream:', error);
      setHasError(true);
      setErrorMessage(`Ошибка перезагрузки потока: ${error}`);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
    
    // Автоматически скрыть элементы управления через 3 секунды
    if (!showControls) {
      setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const getStreamInfo = () => {
    const isHLS = streamUrl.includes('.m3u8');
    const protocol = streamUrl.startsWith('https') ? 'HTTPS' : 'HTTP';
    const streamType = isHLS ? 'HLS' : 'Stream';
    return `${protocol} ${streamType}`;
  };

  const isHLSStream = streamUrl.includes('.m3u8');
  const isWebPlatform = Platform.OS === 'web';

  if (hasError) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.secondarySystemBackground }]}>
        <View style={styles.errorContainer}>
          <ThemedText type="headline" style={[styles.errorTitle, { color: colors.accent }]}>
            {isHLSStream && isWebPlatform ? 'HLS не поддерживается' : 'Ошибка воспроизведения'}
          </ThemedText>
          <ThemedText type="body" style={[styles.errorText, { color: colors.secondaryLabel }]}>
            {isHLSStream && isWebPlatform 
              ? 'HLS потоки (.m3u8) не поддерживаются напрямую в веб-браузерах. Попробуйте открыть в мобильном приложении.'
              : (errorMessage || `Не удалось загрузить поток для канала ${channelName}`)
            }
          </ThemedText>
          
          <View style={styles.streamInfo}>
            <ThemedText type="caption1" style={[styles.streamInfoText, { color: colors.tertiaryLabel }]}>
              Канал: {channelName}
            </ThemedText>
            <ThemedText type="caption1" style={[styles.streamInfoText, { color: colors.tertiaryLabel }]}>
              URL: {streamUrl}
            </ThemedText>
            <ThemedText type="caption1" style={[styles.streamInfoText, { color: colors.tertiaryLabel }]}>
              Тип: {getStreamInfo()}
            </ThemedText>
            <ThemedText type="caption1" style={[styles.streamInfoText, { color: colors.tertiaryLabel }]}>
              Платформа: {Platform.OS}
            </ThemedText>
            <ThemedText type="caption1" style={[styles.streamInfoText, { color: colors.tertiaryLabel }]}>
              Попыток: {retryCount}/{maxRetries}
            </ThemedText>
          </View>
          
          <TouchableOpacity
            style={[
              styles.retryButton, 
              { 
                backgroundColor: retryCount >= maxRetries ? colors.secondaryLabel : colors.tint,
                opacity: retryCount >= maxRetries ? 0.6 : 1
              }
            ]}
            onPress={reloadStream}
            activeOpacity={0.7}
            disabled={retryCount >= maxRetries}
          >
            <ThemedText type="callout" style={styles.retryButtonText}>
              {retryCount >= maxRetries ? 'Превышен лимит попыток' : 'Попробовать снова'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.systemBackground }]}>
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={toggleControls}
        activeOpacity={1}
      >
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
          contentFit="contain"
          nativeControls={false}
        />
        
        {/* Индикатор загрузки */}
        {isLoading && (
          <View style={[styles.loadingContainer, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText type="body" style={[styles.loadingText, { color: '#FFFFFF' }]}>
              {retryCount > 0 ? `Переподключение... (${retryCount}/${maxRetries})` : 'Загрузка потока...'}
            </ThemedText>
            <ThemedText type="caption1" style={[styles.channelName, { color: '#FFFFFF' }]}>
              {channelName}
            </ThemedText>
            <ThemedText type="caption2" style={[styles.streamType, { color: 'rgba(255, 255, 255, 0.7)' }]}>
              {getStreamInfo()}
            </ThemedText>
          </View>
        )}
        
        {/* Элементы управления */}
        {showControls && !isLoading && (
          <View style={styles.controlsContainer}>
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
                onPress={togglePlayPause}
                activeOpacity={0.7}
              >
                <ThemedText type="body" style={styles.controlButtonText}>
                  {player.playing ? '⏸️' : '▶️'}
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
                onPress={toggleMute}
                activeOpacity={0.7}
              >
                <ThemedText type="body" style={styles.controlButtonText}>
                  {player.muted ? '🔇' : '🔊'}
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
                onPress={reloadStream}
                activeOpacity={0.7}
              >
                <ThemedText type="body" style={styles.controlButtonText}>
                  🔄
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Индикатор прямого эфира */}
        <View style={[styles.liveIndicator, { backgroundColor: colors.accent }]}>
          <ThemedText type="caption2" style={styles.liveText}>
            LIVE
          </ThemedText>
        </View>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: screenWidth - 32,
    height: (screenWidth - 32) * (9 / 16), // 16:9 aspect ratio
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  channelName: {
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  streamType: {
    marginTop: 4,
    textAlign: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  liveIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  streamInfo: {
    marginBottom: 20,
    alignItems: 'center',
  },
  streamInfoText: {
    marginBottom: 4,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 