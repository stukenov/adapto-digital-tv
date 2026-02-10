import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PlayerState } from '../types';

interface UsePlayerOptions {
  src?: string;
  autoPlay?: boolean;
  volume?: number;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: string) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

interface UsePlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  playerState: PlayerState;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  togglePlayPause: () => Promise<void>;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  seek: (time: number) => void;
  error: string | null;
}

export function usePlayer(options: UsePlayerOptions = {}): UsePlayerReturn {
  const {
    src,
    autoPlay = false,
    volume = 1,
    onLoadStart,
    onLoadEnd,
    onError,
    onPlay,
    onPause,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume,
    muted: false,
    error: null,
  });

  const [error, setError] = useState<string | null>(null);

  // Update video source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    video.src = src;
    
    if (autoPlay) {
      video.play().catch((err) => {
        const errorMessage = `Autoplay failed: ${err.message}`;
        setError(errorMessage);
        setPlayerState(prev => ({ ...prev, error: errorMessage }));
        onError?.(errorMessage);
      });
    }
  }, [src, autoPlay, onError]);

  // Set up video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      setError(null);
      setPlayerState(prev => ({ ...prev, error: null }));
      onLoadStart?.();
    };

    const handleLoadedMetadata = () => {
      setPlayerState(prev => ({
        ...prev,
        duration: video.duration || 0,
      }));
      onLoadEnd?.();
    };

    const handleTimeUpdate = () => {
      setPlayerState(prev => ({
        ...prev,
        currentTime: video.currentTime || 0,
      }));
    };

    const handlePlay = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: true }));
      onPlay?.();
    };

    const handlePause = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
      onPause?.();
    };

    const handleVolumeChange = () => {
      setPlayerState(prev => ({
        ...prev,
        volume: video.volume,
        muted: video.muted,
      }));
    };

    const handleError = () => {
      const errorMessage = video.error 
        ? `Video error: ${video.error.message}` 
        : 'Unknown video error occurred';
      
      setError(errorMessage);
      setPlayerState(prev => ({ 
        ...prev, 
        isPlaying: false,
        error: errorMessage 
      }));
      onError?.(errorMessage);
    };

    const handleWaiting = () => {
      // Video is waiting for data
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    };

    const handlePlaying = () => {
      // Video has started playing after being paused or delayed due to buffering
      setError(null);
      setPlayerState(prev => ({ ...prev, isPlaying: true, error: null }));
    };

    // Add event listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    // Set initial volume
    video.volume = volume;

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [volume, onLoadStart, onLoadEnd, onError, onPlay, onPause]);

  const play = useCallback(async (): Promise<void> => {
    const video = videoRef.current;
    if (!video) return;

    try {
      await video.play();
      setError(null);
      setPlayerState(prev => ({ ...prev, error: null }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to play video';
      setError(errorMessage);
      setPlayerState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
      throw err;
    }
  }, [onError]);

  const pause = useCallback((): void => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
  }, []);

  const stop = useCallback((): void => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
  }, []);

  const togglePlayPause = useCallback(async (): Promise<void> => {
    if (playerState.isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [playerState.isPlaying, play, pause]);

  const setVolume = useCallback((newVolume: number): void => {
    const video = videoRef.current;
    if (!video) return;

    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    video.volume = clampedVolume;
  }, []);

  const setMuted = useCallback((muted: boolean): void => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = muted;
  }, []);

  const seek = useCallback((time: number): void => {
    const video = videoRef.current;
    if (!video) return;

    const clampedTime = Math.max(0, Math.min(video.duration || 0, time));
    video.currentTime = clampedTime;
  }, []);

  return {
    videoRef,
    playerState,
    play,
    pause,
    stop,
    togglePlayPause,
    setVolume,
    setMuted,
    seek,
    error,
  };
}
