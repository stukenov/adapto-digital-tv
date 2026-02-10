import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

// Динамический импорт hls.js только для веб-платформы
let Hls: any = null;
if (typeof window !== 'undefined') {
  import('hls.js').then((hlsModule) => {
    Hls = hlsModule.default;
  }).catch((error) => {
    console.warn('Failed to load hls.js:', error);
  });
}

interface HLSVideoPlayerProps {
  streamUrl: string;
  channelName: string;
  onError?: (error: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function HLSVideoPlayer({ streamUrl, channelName, onError }: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    console.log('🎥 HLSVideoPlayer loading:', streamUrl);
    
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    // Очистка предыдущего экземпляра
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    const loadVideo = async () => {
      try {
        if (!Hls) {
          // Ждем загрузки hls.js
          await new Promise((resolve) => {
            const checkHls = () => {
              if (Hls) {
                resolve(true);
              } else {
                setTimeout(checkHls, 100);
              }
            };
            checkHls();
          });
        }

        if (Hls && Hls.isSupported()) {
          console.log('✅ HLS.js supported, initializing...');
          
          const hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
          });

          hlsRef.current = hls;

          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            console.log('📺 Video attached');
            hls.loadSource(streamUrl);
          });

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('✅ Manifest parsed, starting playback');
            setIsLoading(false);
            video.play().catch((error) => {
              console.warn('Autoplay failed:', error);
              setIsLoading(false);
            });
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('❌ HLS Error:', data);
            setIsLoading(false);
            
            if (data.fatal) {
              setHasError(true);
              setErrorMessage(`HLS Error: ${data.type} - ${data.details}`);
              onError?.(`HLS Error: ${data.type} - ${data.details}`);
            }
          });

          hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          console.log('✅ Native HLS support detected');
          video.src = streamUrl;
          setIsLoading(false);
        } else {
          console.error('❌ No HLS support available');
          setHasError(true);
          setErrorMessage('Ваш браузер не поддерживает HLS потоки');
          onError?.('HLS not supported');
        }
      } catch (error) {
        console.error('❌ Failed to load video:', error);
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(`Ошибка загрузки: ${error}`);
        onError?.(String(error));
      }
    };

    loadVideo();

    // Обработчики событий видео
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: any) => {
      console.error('❌ Video error:', e);
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(`Ошибка видео: ${e.target?.error?.message || 'Unknown error'}`);
      onError?.(e.target?.error?.message || 'Video error');
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, onError]);

  const togglePlayPause = () => {
    if (!videoRef.current || hasError) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((error) => {
        console.warn('Play failed:', error);
      });
    }
  };

  const toggleMute = () => {
    if (!videoRef.current || hasError) return;
    
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const reloadStream = () => {
    if (!videoRef.current) return;
    
    console.log('🔄 Reloading stream...');
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    
    // Принудительная перезагрузка
    window.location.reload();
  };

  const toggleControls = () => {
    setShowControls(!showControls);
    
    if (!showControls) {
      setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  if (hasError) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.secondarySystemBackground }]}>
        <View style={styles.errorContainer}>
          <ThemedText type="headline" style={[styles.errorTitle, { color: colors.accent }]}>
            Ошибка HLS потока
          </ThemedText>
          <ThemedText type="body" style={[styles.errorText, { color: colors.secondaryLabel }]}>
            {errorMessage}
          </ThemedText>
          
          <View style={styles.streamInfo}>
            <ThemedText type="caption1" style={[styles.streamInfoText, { color: colors.tertiaryLabel }]}>
              Канал: {channelName}
            </ThemedText>
            <ThemedText type="caption1" style={[styles.streamInfoText, { color: colors.tertiaryLabel }]}>
              URL: {streamUrl}
            </ThemedText>
            <ThemedText type="caption1" style={[styles.streamInfoText, { color: colors.tertiaryLabel }]}>
              HLS.js: {Hls ? (Hls.isSupported() ? 'Поддерживается' : 'Не поддерживается') : 'Загружается...'}
            </ThemedText>
          </View>
          
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={reloadStream}
            activeOpacity={0.7}
          >
            <ThemedText type="callout" style={styles.retryButtonText}>
              Перезагрузить
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
        <video
          ref={videoRef}
          style={styles.video}
          controls={false}
          autoPlay
          muted={false}
          playsInline
        />
        
        {/* Индикатор загрузки */}
        {isLoading && (
          <View style={[styles.loadingContainer, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText type="body" style={[styles.loadingText, { color: '#FFFFFF' }]}>
              Загрузка HLS потока...
            </ThemedText>
            <ThemedText type="caption1" style={[styles.channelName, { color: '#FFFFFF' }]}>
              {channelName}
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
                  {isPlaying ? '⏸️' : '▶️'}
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
                onPress={toggleMute}
                activeOpacity={0.7}
              >
                <ThemedText type="body" style={styles.controlButtonText}>
                  {isMuted ? '🔇' : '🔊'}
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
    height: (screenWidth - 32) * (9 / 16),
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
    backgroundColor: '#000000',
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