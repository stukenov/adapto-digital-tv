'use client';

import { useCallback } from 'react';

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

type EventName =
  | 'channel_view'
  | 'channel_play'
  | 'channel_favorite'
  | 'schedule_view'
  | 'app_download_click'
  | 'share_click'
  | 'language_change'
  | 'search'
  | 'page_view';

interface EventParams {
  channel_name?: string;
  channel_slug?: string;
  platform?: string;
  share_type?: string;
  language?: string;
  search_query?: string;
  page_title?: string;
  page_path?: string;
  duration?: number;
  [key: string]: string | number | boolean | undefined;
}

export function useAnalytics() {
  /**
   * Track a custom event to Google Analytics
   */
  const trackEvent = useCallback((eventName: EventName, params?: EventParams) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, {
        ...params,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  /**
   * Track page view
   */
  const trackPageView = useCallback((path: string, title?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_title: title || document.title,
      });
    }
  }, []);

  /**
   * Track channel view
   */
  const trackChannelView = useCallback(
    (channelSlug: string, channelName: string) => {
      trackEvent('channel_view', {
        channel_slug: channelSlug,
        channel_name: channelName,
      });
    },
    [trackEvent]
  );

  /**
   * Track channel play (when video starts playing)
   */
  const trackChannelPlay = useCallback(
    (channelSlug: string, channelName: string) => {
      trackEvent('channel_play', {
        channel_slug: channelSlug,
        channel_name: channelName,
      });
    },
    [trackEvent]
  );

  /**
   * Track adding/removing favorite
   */
  const trackFavorite = useCallback(
    (channelSlug: string, channelName: string, isFavorite: boolean) => {
      trackEvent('channel_favorite', {
        channel_slug: channelSlug,
        channel_name: channelName,
        action: isFavorite ? 'add' : 'remove',
      });
    },
    [trackEvent]
  );

  /**
   * Track schedule view
   */
  const trackScheduleView = useCallback(
    (channelSlug?: string) => {
      trackEvent('schedule_view', {
        channel_slug: channelSlug,
        view_type: channelSlug ? 'channel' : 'all',
      });
    },
    [trackEvent]
  );

  /**
   * Track app download click
   */
  const trackAppDownload = useCallback(
    (platform: 'ios' | 'android' | 'smarttv') => {
      trackEvent('app_download_click', {
        platform,
      });
    },
    [trackEvent]
  );

  /**
   * Track share action
   */
  const trackShare = useCallback(
    (shareType: 'telegram' | 'whatsapp' | 'copy' | 'native', channelSlug?: string) => {
      trackEvent('share_click', {
        share_type: shareType,
        channel_slug: channelSlug,
      });
    },
    [trackEvent]
  );

  /**
   * Track language change
   */
  const trackLanguageChange = useCallback(
    (language: 'kk' | 'ru') => {
      trackEvent('language_change', {
        language,
      });
    },
    [trackEvent]
  );

  /**
   * Track search
   */
  const trackSearch = useCallback(
    (query: string, resultsCount: number) => {
      trackEvent('search', {
        search_query: query,
        results_count: resultsCount,
      });
    },
    [trackEvent]
  );

  return {
    trackEvent,
    trackPageView,
    trackChannelView,
    trackChannelPlay,
    trackFavorite,
    trackScheduleView,
    trackAppDownload,
    trackShare,
    trackLanguageChange,
    trackSearch,
  };
}
