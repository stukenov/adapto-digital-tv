import { renderHook, act } from '@testing-library/react';
import { usePlayer } from '../usePlayer';

// Мокируем HLS.js
jest.mock('hls.js', () => {
  const mockHls = {
    loadSource: jest.fn(),
    attachMedia: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn(),
  };

  return {
    __esModule: true,
    default: jest.fn(() => mockHls),
    isSupported: jest.fn(() => true),
    Events: {
      MANIFEST_PARSED: 'hlsManifestParsed',
      ERROR: 'hlsError',
    },
  };
});

describe('usePlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePlayer({ src: undefined }));

    expect(result.current.playerState).toEqual({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      muted: false,
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle play/pause toggle', () => {
    const { result } = renderHook(() => usePlayer({ src: undefined }));

    act(() => {
      result.current.togglePlayPause();
    });

    // Проверяем, что функция не вызывает ошибок
    expect(result.current.error).toBeNull();
  });

  it('should handle volume changes', () => {
    const { result } = renderHook(() => usePlayer({ src: undefined }));

    act(() => {
      result.current.setVolume(0.5);
    });

    // Проверяем, что функция не вызывает ошибок
    expect(result.current.error).toBeNull();
  });

  it('should handle mute toggle', () => {
    const { result } = renderHook(() => usePlayer({ src: undefined }));

    act(() => {
      result.current.toggleMute();
    });

    // Проверяем, что функция не вызывает ошибок
    expect(result.current.error).toBeNull();
  });

  it('should handle HLS source loading', () => {
    const testUrl = 'https://example.com/test.m3u8';

    renderHook(() => usePlayer({ src: testUrl }));

    // Проверяем, что HLS был инициализирован
    const Hls = require('hls.js').default;
    expect(Hls).toHaveBeenCalled();
  });

  it('should show error when HLS is not supported', () => {
    const Hls = require('hls.js');
    Hls.isSupported.mockReturnValue(false);

    // Мокируем canPlayType для возврата false
    Object.defineProperty(HTMLVideoElement.prototype, 'canPlayType', {
      value: jest.fn(() => ''),
      writable: true,
    });

    const { result } = renderHook(() => usePlayer({ src: 'test.m3u8' }));

    expect(result.current.error).toBe(
      'HLS не поддерживается в данном браузере'
    );
  });
});
