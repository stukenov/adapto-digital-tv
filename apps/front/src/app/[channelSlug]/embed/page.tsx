"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { convertApiChannelToChannel } from '@/types';
import HLSPlayer from '@/components/HLSPlayer';
import { channelsApi } from '@/services/api';
import { localChannels } from '@/data/local-channels';
import { useI18n } from '@/i18n/I18nProvider';

export default function ChannelEmbedPage() {
  const params = useParams<{ channelSlug: string }>();
  const slug = params?.channelSlug;
  const { t } = useI18n();
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const useLocal = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LOCALDATA === 'true';

  const loadChannelData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!slug) {
        setIsLoading(false);
        return;
      }

      if (useLocal) {
        const lc = localChannels.find((c) => c.slug === slug);
        if (!lc) {
          setError(t('channel.error.notFound'));
          setIsLoading(false);
          return;
        }
        setStreamUrl(lc.streamUrl);
        setLogoUrl(lc.logo);
        setIsLoading(false);
        return;
      }

      const apiChannel = await channelsApi.getChannel(slug);
      if (!apiChannel) {
        setError(t('channel.error.notFound'));
        setIsLoading(false);
        return;
      }
      
      const channel = convertApiChannelToChannel(apiChannel);
      
      setStreamUrl(channel.streamUrl);
      setLogoUrl(channel.logo);
    } catch (error) {
      console.error('Failed to load channel data:', error);
      setError(t('channel.error.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [slug, useLocal, t]);

  useEffect(() => {
    loadChannelData();
  }, [loadChannelData]);

  // Error boundary for XPath and DOM errors that can occur in embed environments
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message && (
        event.message.includes('XPath') ||
        event.message.includes('evaluate') ||
        event.message.includes('not a valid XPath expression')
      )) {
        console.warn('Suppressed XPath error in embed environment:', event.message);
        event.preventDefault();
        return false;
      }
      return true;
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && typeof event.reason === 'string' && event.reason.includes('XPath')) {
        console.warn('Suppressed XPath promise rejection in embed environment:', event.reason);
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !streamUrl) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-2">{t('home.error.title')}</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black">
      <HLSPlayer 
        src={streamUrl}
        className="w-full h-full"
        autoPlay={true}
        muted={false}
        logoUrl={logoUrl || undefined}
      />
    </div>
  );
}
