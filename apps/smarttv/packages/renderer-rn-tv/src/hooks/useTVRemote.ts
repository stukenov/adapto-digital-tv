import { useEffect, useCallback } from 'react';
import { TVEventHandler, Platform } from 'react-native';
import { TVRemoteEvent } from '../types';

interface UseTVRemoteProps {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void;
  onBack?: () => void;
  onMenu?: () => void;
  onPlayPause?: () => void;
}

export const useTVRemote = ({
  onUp,
  onDown,
  onLeft,
  onRight,
  onSelect,
  onBack,
  onMenu,
  onPlayPause,
}: UseTVRemoteProps) => {
  const handleTVEvent = useCallback(
    (event: any) => {
      const { eventType } = event;

      switch (eventType) {
        case 'up':
          onUp?.();
          break;
        case 'down':
          onDown?.();
          break;
        case 'left':
          onLeft?.();
          break;
        case 'right':
          onRight?.();
          break;
        case 'select':
          onSelect?.();
          break;
        case 'back':
          onBack?.();
          break;
        case 'menu':
          onMenu?.();
          break;
        case 'playPause':
          onPlayPause?.();
          break;
        default:
          break;
      }
    },
    [onUp, onDown, onLeft, onRight, onSelect, onBack, onMenu, onPlayPause]
  );

  useEffect(() => {
    // Только для TV платформ
    if (Platform.isTV) {
      const tvEventHandler = new TVEventHandler();
      tvEventHandler.enable(null, handleTVEvent);

      return () => {
        tvEventHandler.disable();
      };
    }
  }, [handleTVEvent]);
};
