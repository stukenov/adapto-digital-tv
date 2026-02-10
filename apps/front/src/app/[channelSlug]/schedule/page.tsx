"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Channel, Program, convertApiChannelToChannel, convertApiProgramToProgram } from '@/types';
import { channelsApi, apiUtils } from '@/services/api';
import { useI18n } from '@/i18n/I18nProvider';
import { localChannels } from '@/data/local-channels';
import ScheduleList from '@/components/ScheduleList';

export default function ChannelSchedulePage() {
  const params = useParams<{ channelSlug: string }>();
  const slug = params?.channelSlug;
  const { t, locale } = useI18n();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [selectedDay, setSelectedDay] = useState('today');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const useLocal = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LOCALDATA === 'true';

  const loadChannelSchedule = useCallback(async () => {
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
        setPrograms([]);
        setIsLoading(false);
        return;
      }

      // Загружаем канал
      const apiChannel = await channelsApi.getChannel(slug);
      if (!apiChannel) {
        setError(t('channel.error.notFound'));
        setIsLoading(false);
        return;
      }
      
      const channelData = convertApiChannelToChannel(apiChannel);
      setChannel(channelData);

      // Определяем дату для загрузки
      const dateOffset = selectedDay === 'today' ? 0 : selectedDay === 'tomorrow' ? 1 : 2;
      const targetDate = apiUtils.getDateWithOffset(dateOffset);

      // Загружаем программы
      const scheduleData = await channelsApi.getChannelSchedule({
        slug: apiChannel.slug,
        date: targetDate,
      });

      const convertedPrograms = scheduleData.map(convertApiProgramToProgram);
      setPrograms(convertedPrograms);

    } catch {
      setError(t('channel.error.unavailable'));
    } finally {
      setIsLoading(false);
    }
  }, [slug, selectedDay, t, useLocal]);

  useEffect(() => {
    loadChannelSchedule();
  }, [loadChannelSchedule]);

  const days = [
    { 
      id: 'today', 
      name: t('schedule.today'), 
      date: new Date().toLocaleDateString(locale === 'kk' ? 'kk-KZ' : 'ru-RU'),
    },
    { 
      id: 'tomorrow', 
      name: t('schedule.tomorrow'), 
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString(locale === 'kk' ? 'kk-KZ' : 'ru-RU'),
    },
    { 
      id: 'dayAfterTomorrow', 
      name: t('schedule.afterTomorrow'), 
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(locale === 'kk' ? 'kk-KZ' : 'ru-RU'),
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-[var(--accent-red)]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[var(--accent-red)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">{t('channel.error.notFound')}</h2>
          <p className="text-[var(--muted-foreground)] mb-6">{error}</p>
          <Link
            href="/"
            className="btn-apple px-6 py-3 inline-block"
          >
            {t('channel.back')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок с логотипом канала */}
        <div className="mb-6">
          <Link 
            href={`/${channel.slug}`} 
            className="flex items-center gap-4 mb-4 group"
          >
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center transition-apple group-hover:bg-white/15">
              <Image
                src={channel.logo}
                alt={channel.name}
                width={40}
                height={40}
                className="rounded-lg object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-channel.svg';
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white group-hover:text-[var(--accent-blue)] transition-colors">
                {channel.name}
              </h1>
              <p className="text-[var(--muted-foreground)]">{t('schedule.title')}</p>
            </div>
          </Link>
        </div>

        {/* Выбор дня */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {days.map((day) => (
              <button
                key={day.id}
                onClick={() => setSelectedDay(day.id)}
                disabled={isLoading}
                className={`flex-shrink-0 px-5 py-3 rounded-xl text-sm font-medium transition-apple-fast disabled:opacity-50 ${
                  selectedDay === day.id
                    ? 'bg-[var(--accent-blue)] text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold">{day.name}</div>
                  <div className="text-xs opacity-75 mt-0.5">{day.date}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Список программ */}
        <div className="bg-[var(--card)] rounded-2xl overflow-hidden">
          <ScheduleList 
            programs={programs}
            showCurrentIndicator={selectedDay === 'today'}
            className="divide-y divide-white/5"
          />
        </div>

        {/* Кнопка назад */}
        <div className="mt-8 text-center">
          <Link
            href={`/${channel.slug}`}
            className="inline-flex items-center text-[var(--accent-blue)] font-medium transition-apple hover:opacity-80"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('channel.back')}
          </Link>
        </div>
      </div>
    </div>
  );
}
