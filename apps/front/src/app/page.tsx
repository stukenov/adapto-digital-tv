'use client';

import { useState, useEffect, useCallback } from 'react';
import ChannelCard from '@/components/ChannelCard';
import HeroSection from '@/components/marketing/HeroSection';
import AppPromotion from '@/components/marketing/AppPromotion';
import Footer from '@/components/Footer';
import { Channel, convertApiChannelToChannel } from '@/types';
import { channelsApi } from '@/services/api';
import { useI18n } from '@/i18n/I18nProvider';
import { localChannels } from '@/data/local-channels';

export default function Home() {
  const { t } = useI18n();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const useLocal = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LOCALDATA === 'true';
      const apiChannels = useLocal
        ? localChannels.map((ch) => ({
            id: Number(ch.id),
            name: ch.name,
            slug: ch.slug,
            logo: ch.logo,
            description: ch.description,
            stream_url: ch.streamUrl,
            is_active: true,
            created_at: '',
            updated_at: '',
          }))
        : await channelsApi.getChannels();

      // Преобразуем каналы - без загрузки расписания для главной
      const channelsData = apiChannels
        .filter(channel => channel.is_active)
        .map((apiChannel) => {
          const channel = convertApiChannelToChannel(apiChannel);
          return {
            ...channel,
            schedule: []
          };
        });

      // Сортируем по sortOrder (desc), затем по имени
      const sorted = [...channelsData].sort((a, b) => {
        const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        if (aOrder !== bOrder) return bOrder - aOrder;
        return a.name.localeCompare(b.name, 'ru');
      });

      setChannels(sorted);
    } catch (error) {
      console.error('Failed to load channels:', error);
      setError(t('home.error.title'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const handleRetry = () => {
    loadChannels();
  };

  // Состояние загрузки - премиальный анимированный спиннер
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          {/* Animated loader */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent-blue)] animate-spin" />
            <div 
              className="absolute inset-2 rounded-full opacity-50"
              style={{
                background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)',
                filter: 'blur(8px)'
              }}
            />
          </div>
          <p className="text-sm text-[var(--foreground-muted)] animate-pulse">
            {t('home.loading')}
          </p>
        </div>
      </div>
    );
  }

  // Состояние ошибки
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* Error icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
                filter: 'blur(20px)'
              }}
            />
            <div className="relative w-20 h-20 rounded-full bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-[var(--accent-red)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {t('home.error.title')}
          </h2>
          <p className="text-[var(--foreground-muted)] mb-8">
            {error}
          </p>
          
          <button
            onClick={handleRetry}
            className="btn-primary px-8 py-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('home.error.retry')}
          </button>
        </div>
      </div>
    );
  }

  // Пустое состояние
  if (channels.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-[var(--foreground-muted)] text-lg">{t('home.empty')}</p>
        </div>
      </div>
    );
  }

  // Выделяем первые 2 канала как featured (если есть)
  const featuredChannels = channels.slice(0, 2);
  const regularChannels = channels.slice(2);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Hero секция */}
      <HeroSection channelCount={channels.length} />

      {/* Каналы */}
      <section id="channels" className="relative">
        {/* Background gradient for section */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)] to-[var(--background)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          {/* Section header */}
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {t('home.title')}
            </h2>
            <p className="text-lg text-[var(--foreground-muted)] max-w-2xl mx-auto">
              {t('home.subtitle')}
            </p>
          </div>

          {/* Featured channels - 2 large cards */}
          {featuredChannels.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 sm:mb-12">
              {featuredChannels.map((channel, index) => (
                <div 
                  key={channel.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <ChannelCard channel={channel} variant="featured" />
                </div>
              ))}
            </div>
          )}
          
          {/* Regular channels grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {regularChannels.map((channel, index) => (
              <div 
                key={channel.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${(index + 2) * 50}ms` }}
              >
                <ChannelCard channel={channel} />
              </div>
            ))}
          </div>

          {/* Show all channels link if many */}
          {channels.length > 15 && (
            <div className="text-center mt-12">
              <button className="btn-secondary px-8 py-3">
                {t('home.viewAll')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features section */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div 
            className="absolute top-1/2 left-0 w-[500px] h-[500px] -translate-y-1/2 -translate-x-1/2 opacity-20"
            style={{
              background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)',
              filter: 'blur(100px)'
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t('features.title')}
            </h2>
            <p className="text-lg text-[var(--foreground-muted)] max-w-xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Feature 1 - Free */}
            <div className="group p-6 sm:p-8 rounded-3xl bg-[var(--card)] border border-[var(--border)] transition-premium hover:border-[var(--border-hover)]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-green)]/20 to-[var(--accent-green)]/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-premium">
                <svg className="w-7 h-7 text-[var(--accent-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {t('features.free.title')}
              </h3>
              <p className="text-[var(--foreground-muted)]">
                {t('features.free.description')}
              </p>
            </div>

            {/* Feature 2 - 24/7 */}
            <div className="group p-6 sm:p-8 rounded-3xl bg-[var(--card)] border border-[var(--border)] transition-premium hover:border-[var(--border-hover)]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-blue)]/20 to-[var(--accent-blue)]/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-premium">
                <svg className="w-7 h-7 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {t('features.live.title')}
              </h3>
              <p className="text-[var(--foreground-muted)]">
                {t('features.live.description')}
              </p>
            </div>

            {/* Feature 3 - All devices */}
            <div className="group p-6 sm:p-8 rounded-3xl bg-[var(--card)] border border-[var(--border)] transition-premium hover:border-[var(--border-hover)]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-purple)]/20 to-[var(--accent-purple)]/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-premium">
                <svg className="w-7 h-7 text-[var(--accent-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {t('features.devices.title')}
              </h3>
              <p className="text-[var(--foreground-muted)]">
                {t('features.devices.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Баннер приложения */}
      <AppPromotion />

      {/* Футер */}
      <Footer />
    </div>
  );
}
