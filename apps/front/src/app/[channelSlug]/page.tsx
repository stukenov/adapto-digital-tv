"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Channel, Program, convertApiChannelToChannel, convertApiProgramToProgram, getCurrentProgram, getNextProgram } from '@/types';
import HLSPlayer from '@/components/HLSPlayer';
import ScheduleList from '@/components/ScheduleList';
import LiveIndicator from '@/components/LiveIndicator';
import { channelsApi, apiUtils } from '@/services/api';
import { useI18n } from '@/i18n/I18nProvider';
import { localChannels } from '@/data/local-channels';

export default function ChannelPage() {
  const params = useParams<{ channelSlug: string }>();
  const slug = params?.channelSlug;
  const { t, locale } = useI18n();
  
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedDay, setSelectedDay] = useState('today');
  const [schedulePrograms, setSchedulePrograms] = useState<Program[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
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
        setChannel({
          id: lc.id,
          name: lc.name,
          logo: lc.logo,
          description: lc.description,
          streamUrl: lc.streamUrl,
          slug: lc.slug,
          schedule: [],
        });
        setIsLoading(false);
        return;
      }

      const apiChannel = await channelsApi.getChannel(slug).catch(() => null);

      if (!apiChannel) {
        setError(t('channel.error.notFound'));
        setIsLoading(false);
        return;
      }

      const baseChannel = convertApiChannelToChannel(apiChannel);

      // Загружаем программы для текущего дня
      try {
        const todayPrograms = await channelsApi.getChannelSchedule({
          slug: apiChannel.slug,
          date: apiUtils.getCurrentDate()
        });

        const programs = todayPrograms.map(convertApiProgramToProgram);
        const currentProgram = getCurrentProgram(programs);
        const nextProgram = getNextProgram(programs, currentProgram);

        setChannel({
          ...baseChannel,
          currentProgram,
          nextProgram,
          schedule: programs
        });
        setSchedulePrograms(programs);
      } catch {
        setChannel({
          ...baseChannel,
          schedule: []
        });
      }

    } catch {
      setError(t('channel.error.unavailable'));
    } finally {
      setIsLoading(false);
    }
  }, [slug, t, useLocal]);

  useEffect(() => {
    loadChannelData();
  }, [loadChannelData]);

  // Загрузка расписания при изменении дня
  const loadScheduleForDay = useCallback(async (day: string) => {
    if (!channel || useLocal) return;

    setIsScheduleLoading(true);
    try {
      const dateOffset = day === 'today' ? 0 : day === 'tomorrow' ? 1 : 2;
      const targetDate = apiUtils.getDateWithOffset(dateOffset);

      const programs = await channelsApi.getChannelSchedule({
        slug: channel.slug,
        date: targetDate
      });

      setSchedulePrograms(programs.map(convertApiProgramToProgram));
    } catch {
      setSchedulePrograms([]);
    } finally {
      setIsScheduleLoading(false);
    }
  }, [channel, useLocal]);

  useEffect(() => {
    if (showSchedule) {
      loadScheduleForDay(selectedDay);
    }
  }, [showSchedule, selectedDay, loadScheduleForDay]);

  // Обновление текущей программы каждую минуту
  useEffect(() => {
    const timer = setInterval(() => {
      setChannel((prev) => {
        if (!prev || !prev.schedule || prev.schedule.length === 0) return prev;
        
        const curr = getCurrentProgram(prev.schedule);
        const next = getNextProgram(prev.schedule, curr);

        if (curr?.id !== prev.currentProgram?.id || next?.id !== prev.nextProgram?.id) {
          return { ...prev, currentProgram: curr, nextProgram: next };
        }
        return prev;
      });
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const days = [
    { id: 'today', name: t('schedule.today'), date: new Date().toLocaleDateString(locale === 'kk' ? 'kk-KZ' : 'ru-RU') },
    { id: 'tomorrow', name: t('schedule.tomorrow'), date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString(locale === 'kk' ? 'kk-KZ' : 'ru-RU') },
    { id: 'dayAfterTomorrow', name: t('schedule.afterTomorrow'), date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(locale === 'kk' ? 'kk-KZ' : 'ru-RU') }
  ];

  // Статические роуты, которые не являются каналами
  const staticRoutes = ['admin', 'api', 'schedule', 'env-test', 'sentry-example-page', 'about', 'contacts', 'faq', 'apps', 'privacy', 'terms'];
  
  if (slug && staticRoutes.includes(slug)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">404</h2>
          <p className="text-[var(--foreground-muted)]">{t('channel.error.notFound')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent-blue)] animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-black">
        <div className="text-center max-w-md">
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
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('channel.error.notFound')}</h2>
          <p className="text-[var(--foreground-muted)]">{error}</p>
        </div>
      </div>
    );
  }

  const hasSchedule = Array.isArray(channel.schedule) && channel.schedule.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Режим с расписанием */}
      {showSchedule ? (
        <>
          {/* Компактный плеер */}
          <div className="w-full pt-16">
            <HLSPlayer 
              src={channel.streamUrl}
              className="w-full aspect-video"
              autoPlay={true}
              muted={false}
              logoUrl={channel.logo}
              compact={true}
            />
          </div>

          {/* Заголовок канала */}
          <div className="px-4 py-4 border-b border-[var(--border)] bg-[var(--background)]">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                  <Image
                    src={imageError ? '/placeholder-channel.svg' : channel.logo}
                    alt={channel.name}
                    width={32}
                    height={32}
                    className="object-contain"
                    onError={() => setImageError(true)}
                  />
                </div>
                <h1 className="text-lg font-bold text-foreground">{channel.name}</h1>
              </div>
              <button
                onClick={() => setShowSchedule(false)}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-fast hover:bg-white/10"
                aria-label={t('common.close')}
              >
                <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Выбор дня */}
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
            <div className="flex gap-2 max-w-4xl mx-auto overflow-x-auto scrollbar-hide">
              {days.map((day) => (
                <button
                  key={day.id}
                  onClick={() => setSelectedDay(day.id)}
                  disabled={isScheduleLoading}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-fast whitespace-nowrap disabled:opacity-50 ${
                    selectedDay === day.id
                      ? 'bg-[var(--accent-blue)] text-black'
                      : 'bg-white/5 text-[var(--foreground-muted)] hover:bg-white/10 hover:text-foreground'
                  }`}
                >
                  {day.name}
                </button>
              ))}
            </div>
          </div>

          {/* Список программ */}
          <div className="flex-1 overflow-y-auto scrollbar-thin bg-[var(--background)]">
            <div className="max-w-4xl mx-auto">
              {isScheduleLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent-blue)] animate-spin" />
                  </div>
                </div>
              ) : (
                <ScheduleList 
                  programs={schedulePrograms}
                  showCurrentIndicator={selectedDay === 'today'}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        /* Режим просмотра - иммерсивный */
        <>
          {/* Плеер на весь экран */}
          <div className="flex-1 flex flex-col relative">
            <HLSPlayer 
              src={channel.streamUrl}
              className="w-full flex-1 min-h-[50vh] md:min-h-[60vh]"
              autoPlay={true}
              muted={false}
              logoUrl={channel.logo}
            />
          </div>

          {/* Информация о канале и программе */}
          <div className="relative bg-gradient-to-t from-[var(--background)] via-[var(--background)] to-transparent">
            {/* Glow effect */}
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] opacity-20 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse, var(--accent-blue) 0%, transparent 70%)',
                filter: 'blur(60px)'
              }}
            />

            <div className="relative px-4 sm:px-6 py-6 sm:py-8 max-w-4xl mx-auto">
              {/* Channel info */}
              <div className="flex items-start gap-4 mb-6">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden">
                    <Image
                      src={imageError ? '/placeholder-channel.svg' : channel.logo}
                      alt={channel.name}
                      width={64}
                      height={64}
                      className="object-contain p-2"
                      onError={() => setImageError(true)}
                    />
                  </div>
                  {/* Live badge */}
                  <div className="absolute -top-1 -right-1">
                    <LiveIndicator size="sm" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                    {channel.name}
                  </h1>
                  
                  {/* Current program */}
                  {hasSchedule && channel.currentProgram && (
                    <div className="space-y-1">
                      <p className="text-base sm:text-lg text-foreground font-medium line-clamp-1">
                        {channel.currentProgram.title}
                      </p>
                      <p className="text-sm text-[var(--foreground-muted)]">
                        {channel.currentProgram.startTime} – {channel.currentProgram.endTime}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Next program preview */}
              {hasSchedule && channel.nextProgram && (
                <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                      {t('channel.next')}
                    </span>
                    <span className="text-xs text-[var(--accent-blue)]">
                      {channel.nextProgram.startTime}
                    </span>
                  </div>
                  <p className="text-foreground font-medium line-clamp-1">
                    {channel.nextProgram.title}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Schedule button */}
                {!useLocal && (
                  <button
                    onClick={() => setShowSchedule(true)}
                    className="flex-1 py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-premium active:scale-98"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <svg className="w-5 h-5 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-foreground">{t('channel.viewFullSchedule')}</span>
                  </button>
                )}

                {/* Share button */}
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: channel.name,
                        text: `${t('channel.share')} ${channel.name}`,
                        url: window.location.href
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                    }
                  }}
                  className="sm:w-14 h-14 rounded-2xl flex items-center justify-center gap-2 sm:gap-0 transition-fast"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                  aria-label={t('channel.share')}
                >
                  <svg className="w-5 h-5 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="sm:hidden text-[var(--foreground-muted)]">{t('channel.share')}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
