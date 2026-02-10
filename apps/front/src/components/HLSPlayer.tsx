'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { useI18n } from '@/i18n/I18nProvider';
import Image from 'next/image';

interface HLSPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  logoUrl?: string;
  compact?: boolean;
}

export default function HLSPlayer({ 
  src, 
  poster, 
  className = '', 
  autoPlay = true, 
  muted = true,
  logoUrl,
  compact = false,
}: HLSPlayerProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const hasAttemptedAutoPlayRef = useRef<boolean>(false);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playPromiseRef.current) return;
    if (typeof video.play !== 'function') return;
    
    playPromiseRef.current = video.play();
    if (playPromiseRef.current && typeof playPromiseRef.current.catch === 'function') {
      playPromiseRef.current
        .catch((err: unknown) => {
          const message = (err as { message?: string })?.message ?? '';
          const name = (err as { name?: string })?.name ?? '';
          if (
            name === 'AbortError' ||
            message.includes('The play() request was interrupted by a new load request') ||
            name === 'NotAllowedError' ||
            message.includes('play() failed')
          ) {
            return;
          }
        })
        .finally(() => {
          playPromiseRef.current = null;
        });
    } else {
      playPromiseRef.current = null;
    }
  }, []);

  // Скрытие контролов с таймером
  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    setShowControls(true);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!src) {
      setError(t('player.error.media'));
      setIsLoading(false);
      return;
    }

    const originalError = window.onerror;
    const handleXPathError = (message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) => {
      if (typeof message === 'string' && message.includes('XPath expression')) {
        return true;
      }
      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
      return false;
    };
    
    window.onerror = handleXPathError;

    const initializePlayer = () => {
      setIsLoading(true);
      setError(null);

      if (Hls && typeof Hls.isSupported === 'function' && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 60,
          maxBufferLength: 90,
          maxMaxBufferLength: 120,
          maxBufferSize: 128 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 3,
          maxFragLookUpTolerance: 0.25,
          startPosition: 0,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 8,
          maxLiveSyncPlaybackRate: 1.0,
          manifestLoadingMaxRetry: 6,
          manifestLoadingRetryDelay: 1000,
          levelLoadingMaxRetry: 6,
          levelLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 1000,
          capLevelToPlayerSize: true,
          testBandwidth: false,
          debug: false,
          enableSoftwareAES: false,
          preferManagedMediaSource: false,
        });

        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          if (autoPlay && !hasAttemptedAutoPlayRef.current) {
            hasAttemptedAutoPlayRef.current = true;
            safePlay();
          }
        });

        const domVideo = document.querySelector('video');
        let extraDelay = 0;
        let lastTime = 0, stableTicks = 0;

        hls.on(Hls.Events.ERROR, (ev, data) => {
          if (
            data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
            data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL
          ) {
            extraDelay = Math.min(extraDelay + 1, 3);
            hls.config.liveSyncDurationCount = 3 + extraDelay;
            hls.config.liveMaxLatencyDurationCount = 8 + extraDelay * 2;

            try {
              if (domVideo) {
                domVideo.currentTime = domVideo.currentTime + 0.1;
              }
            } catch {}

            if (data.frag) hls.trigger(Hls.Events.FRAG_LOADING, { frag: data.frag, targetBufferTime: 0 });
          }
        });

        if (domVideo) {
          domVideo.addEventListener('timeupdate', () => {
            if (domVideo.currentTime > lastTime) {
              stableTicks++;
              if (stableTicks > 60 && extraDelay > 0) {
                extraDelay = 0;
                hls.config.liveSyncDurationCount = 3;
                hls.config.liveMaxLatencyDurationCount = 8;
                stableTicks = 0;
              }
              lastTime = domVideo.currentTime;
            }
          });
        }

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (!data.fatal) {
            if (
              data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
              data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL
            ) {
              const vid = videoRef.current;
              if (vid) {
                try {
                  vid.currentTime = Math.max(0, vid.currentTime + 0.05);
                } catch {}
              }
              try { hls.startLoad(); } catch {}
              return;
            }
            return;
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError(t('player.error.network'));
              try { hls.startLoad(); } catch {}
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError(t('player.error.media'));
              try { hls.recoverMediaError(); } catch {}
              break;
            default:
              setError(t('player.error.fatal'));
              try { hls.destroy(); } catch {}
              break;
          }
        });

        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          setIsLoading(false);
        });

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          if (autoPlay && !hasAttemptedAutoPlayRef.current) {
            hasAttemptedAutoPlayRef.current = true;
            safePlay();
          }
        });
        
        video.addEventListener('error', () => {
          setError(t('player.error.media'));
        });
      } else {
        setError(t('player.error.unsupported'));
      }
    };

    initializePlayer();

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      window.onerror = originalError;
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [src, autoPlay, t, safePlay]);

  // Отслеживание fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      hasAttemptedAutoPlayRef.current = true;
      safePlay();
    } else {
      if (typeof video.pause === 'function') {
        video.pause();
      }
    }
    resetHideTimer();
  };

  const handleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);
    resetHideTimer();
  };

  const handleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
    resetHideTimer();
  };

  const handleTap = () => {
    if (showControls) {
      handlePlayPause();
    } else {
      resetHideTimer();
    }
  };

  const handleRetry = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black overflow-hidden ${compact ? 'rounded-xl' : 'rounded-2xl'} ${className}`}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={handleTap}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        muted={muted}
        playsInline
        preload="auto"
      />
      
      {/* Минималистичный спиннер загрузки */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      
      {/* Оверлей ошибки - упрощенный */}
      {error && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-16 h-16 bg-[var(--accent-red)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--accent-red)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              className="w-14 h-14 bg-white/10 backdrop-blur rounded-full flex items-center justify-center mx-auto transition-apple hover:bg-white/20"
              aria-label={t('player.error.retry')}
            >
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Логотип канала - только когда не компактный режим */}
      {logoUrl && !compact && (
        <Image
          src={logoUrl}
          alt=""
          width={40}
          height={40}
          className={`absolute top-4 right-4 object-contain transition-opacity duration-300 ${
            showControls ? 'opacity-80' : 'opacity-40'
          }`}
          unoptimized
        />
      )}

      {/* Большая кнопка Play/Pause по центру - появляется при тапе */}
      {!isLoading && !error && showControls && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
            className="pointer-events-auto w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center transition-apple hover:bg-white/30 hover:scale-110 active:scale-95"
            aria-label={isPlaying ? t('player.pause') : t('player.play')}
          >
            {isPlaying ? (
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Нижние контролы - минималистичные */}
      {!isLoading && !error && (
        <div 
          className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            {/* Левая сторона - звук */}
            <button
              onClick={handleMute}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-apple"
              aria-label={isMuted ? t('player.unmute') : t('player.mute')}
            >
              {isMuted ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            {/* Правая сторона - fullscreen */}
            <button
              onClick={handleFullscreen}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-apple"
              aria-label={isFullscreen ? t('player.exitFullscreen') : t('player.fullscreen')}
            >
              {isFullscreen ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V5a1 1 0 00-1-1H5m11 5V5a1 1 0 011-1h3m-4 15v-4a1 1 0 011-1h3M5 15v4a1 1 0 001 1h3" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0-4l5-5m11 5v4m0-4h-4m4 4l-5-5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
