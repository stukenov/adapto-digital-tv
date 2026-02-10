"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Channel,
  convertApiChannelToChannel,
  convertApiProgramToProgram,
} from "@/types";
import { channelsApi, apiUtils } from "@/services/api";
import { useI18n } from "@/i18n/I18nProvider";
import { localChannels } from "@/data/local-channels";
import ScheduleAccordion from "@/components/ScheduleAccordion";

export default function SchedulePage() {
  const { t, locale } = useI18n();
  const useLocal = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LOCALDATA === 'true';
  const [selectedDay, setSelectedDay] = useState('today');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScheduleData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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
      
      // Фильтруем только активные каналы
      const activeChannels = apiChannels.filter(ch => ch.is_active && !useLocal);
      
      // Определяем дату для загрузки
      const dateOffset = selectedDay === 'today' ? 0 : selectedDay === 'tomorrow' ? 1 : 2;
      const targetDate = apiUtils.getDateWithOffset(dateOffset);

      // Загружаем расписание для всех каналов
      const channelsWithSchedule = await Promise.all(
        activeChannels.map(async (apiChannel) => {
          const channel = convertApiChannelToChannel(apiChannel);
          
          try {
            const programs = await channelsApi.getChannelSchedule({
              slug: apiChannel.slug,
              date: targetDate,
            });
            
            return {
              ...channel,
              schedule: programs.map(convertApiProgramToProgram)
            };
          } catch {
            return {
              ...channel,
              schedule: []
            };
          }
        })
      );

      // Сортируем по sortOrder (desc), затем по имени
      const sorted = [...channelsWithSchedule].sort((a, b) => {
        const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        if (aOrder !== bOrder) return bOrder - aOrder;
        return a.name.localeCompare(b.name, 'ru');
      });

      setChannels(sorted);
    } catch {
      setError(t('schedule.error.title'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedDay, t, useLocal]);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  const days = [
    { id: 'today', name: t('schedule.today'), date: new Date().toLocaleDateString(locale === 'kk' ? 'kk-KZ' : 'ru-RU') },
    { id: 'tomorrow', name: t('schedule.tomorrow'), date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString(locale === 'kk' ? 'kk-KZ' : 'ru-RU') },
    { id: 'dayAfterTomorrow', name: t('schedule.afterTomorrow'), date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(locale === 'kk' ? 'kk-KZ' : 'ru-RU') }
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="mb-6 text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {t('schedule.title')}
          </h1>
          <p className="text-[var(--muted-foreground)]">
            {t('schedule.subtitle')}
          </p>
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
                    : 'bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--card-hover)]'
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

        {/* Состояние загрузки */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-3 border-[var(--border)] border-t-[var(--accent-blue)] rounded-full animate-spin" />
          </div>
        )}

        {/* Ошибка */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[var(--accent-red)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[var(--accent-red)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('schedule.error.title')}</h3>
            <p className="text-[var(--muted-foreground)] mb-6">{error}</p>
            <button
              onClick={loadScheduleData}
              className="btn-apple px-6 py-3"
            >
              {t('schedule.error.retry')}
            </button>
          </div>
        )}

        {/* Сообщение о локальном режиме */}
        {!isLoading && !error && useLocal && (
          <div className="text-center py-16">
            <p className="text-[var(--muted-foreground)]">{t('schedule.local.disabled')}</p>
          </div>
        )}

        {/* Аккордеон каналов */}
        {!isLoading && !error && !useLocal && channels.length > 0 && (
          <ScheduleAccordion channels={channels} />
        )}

        {/* Пустое состояние */}
        {!isLoading && !error && channels.length === 0 && !useLocal && (
          <div className="text-center py-16">
            <p className="text-[var(--muted-foreground)]">{t('schedule.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
