"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

import { Channel, Program, convertApiChannelToChannel, convertApiProgramToProgram, getCurrentProgram, getNextProgram } from '@/types';
import Image from 'next/image';
import ChannelCard from '@/components/ChannelCard';
import HLSPlayer from '@/components/HLSPlayer';
import { channelsApi, apiUtils } from '@/services/api';
import { useI18n } from '@/i18n/I18nProvider';
import { localChannels } from '@/data/local-channels';

// Убраны неиспользуемые утилиты, чтобы не ломать линт

export default function ChannelPage() {
  const params = useParams<{ id: string }>();
  const slug = params?.id;
  const { t } = useI18n();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [otherChannels, setOtherChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const useLocal = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LOCALDATA === 'true';
  // Избегаем несоответствий при гидрации: инициализируем после монтирования
  const [nowMinutes, setNowMinutes] = useState<number>(0);
  const [animateCurrent, setAnimateCurrent] = useState(false);
  const [animateNext, setAnimateNext] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFadeIn, setModalFadeIn] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  const loadChannelData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!slug) {
        // Ожидаем параметр маршрута
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
        // В локальном режиме без расписания
        setChannel({
          id: lc.id,
          name: lc.name,
          logo: lc.logo,
          description: lc.description,
          streamUrl: lc.streamUrl,
          slug: lc.slug,
          schedule: [],
        });
        // Показываем другие каналы без расписания
        const otherLocalChannels = localChannels
          .filter((c) => c.slug !== slug)
          .slice(0, 6)
          .map((c) => ({
            id: c.id,
            name: c.name,
            logo: c.logo,
            description: c.description,
            streamUrl: c.streamUrl,
            slug: c.slug,
            schedule: [] as Program[],
          }));
        setOtherChannels(otherLocalChannels);
        setIsLoading(false);
        return;
      }

      // Загружаем данные канала и все каналы
      const [apiChannel, allApiChannels] = await Promise.all([
        channelsApi.getChannel(slug),
        channelsApi.getChannels(),
      ]);

      const baseChannel = convertApiChannelToChannel(apiChannel);

      // Загружаем программы для основного канала
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
      } catch (programError) {
        console.error('Failed to load programs for channel:', programError);
        
        // Устанавливаем канал с заглушечными программами
        setChannel({
          ...baseChannel,
          currentProgram: {
            id: 'placeholder-current',
            title: t('program.unavailable'),
            description: t('program.unavailable.desc'),
            startTime: '00:00',
            endTime: '23:59',
            duration: 1439
          },
          nextProgram: {
            id: 'placeholder-next',
            title: t('program.next.title'),
            description: t('program.unavailable.desc'),
            startTime: '23:59',
            endTime: '23:59',
            duration: 0
          },
          schedule: []
        });
      }

      // Загружаем другие каналы для рекомендаций
      const otherChannelsData = await Promise.all(
        allApiChannels
          .filter(ch => ch.is_active && ch.slug !== slug)
          // сортируем по sort_order (desc), затем по имени
          .sort((a, b) => {
            const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
            const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
            if (ao !== bo) return bo - ao;
            return a.name.localeCompare(b.name, 'ru');
          })
          .slice(0, 6)
          .map(async (apiCh) => {
            const ch = convertApiChannelToChannel(apiCh);
            
            try {
              const programs = await channelsApi.getChannelSchedule({
                slug: apiCh.slug,
                date: apiUtils.getCurrentDate()
              });
              
              const convertedPrograms = programs.map(convertApiProgramToProgram);
              const currentProg = getCurrentProgram(convertedPrograms);
              
               return {
                ...ch,
                currentProgram: currentProg,
                nextProgram: getNextProgram(convertedPrograms, currentProg),
                schedule: convertedPrograms
              };
            } catch {
              return {
                ...ch,
                currentProgram: {
                  id: 'placeholder',
                  title: t('program.unavailable'),
                  description: '',
                  startTime: '00:00',
                  endTime: '23:59',
                  duration: 1439
                },
                schedule: []
              };
            }
          })
      );

      // Показываем другие каналы даже без расписания
      setOtherChannels(otherChannelsData);

    } catch (error) {
      console.error('Failed to load channel data:', error);
      setError(t('channel.error.unavailable'));
    } finally {
      setIsLoading(false);
    }
  }, [slug, t, useLocal]);

  useEffect(() => {
    loadChannelData();
  }, [loadChannelData]);

  // Устанавливаем текущее время после монтирования, затем обновляем каждую минуту
  useEffect(() => {
    const now = new Date();
    setNowMinutes(now.getHours() * 60 + now.getMinutes());
  }, []);

  // Переодическое обновление текущей/следующей программы и прогресса раз в минуту
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMinutes(() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
      });

      setChannel((prev) => {
        if (!prev || !prev.schedule || prev.schedule.length === 0) return prev;
        const programs = prev.schedule;
        const curr = getCurrentProgram(programs);
        const next = getNextProgram(programs, curr);

        const currentChanged = curr?.id !== prev.currentProgram?.id;
        const nextChanged = next?.id !== prev.nextProgram?.id;

        if (currentChanged) {
          setAnimateCurrent(true);
          setTimeout(() => setAnimateCurrent(false), 400);
        }
        if (nextChanged) {
          setAnimateNext(true);
          setTimeout(() => setAnimateNext(false), 400);
        }

        if (currentChanged || nextChanged) {
          return { ...prev, currentProgram: curr, nextProgram: next } as Channel;
        }
        return prev;
      });
    }, 60000); // каждую минуту
    return () => clearInterval(timer);
  }, []);

  const computeProgressPercent = (): number => {
    if (!channel?.currentProgram) return 0;
    const [sh, sm] = channel.currentProgram.startTime.split(':').map(Number);
    const [eh, em] = channel.currentProgram.endTime.split(':').map(Number);
    const start = sh * 60 + sm;
    let end = eh * 60 + em;
    let now = nowMinutes;
    if (end <= start) end += 24 * 60; // через полночь
    if (now < start) now += 24 * 60;
    const total = end - start;
    const done = Math.min(Math.max(now - start, 0), total);
    return Math.round((done / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 bg-gray-200 rounded-2xl"></div>
              <div>
                <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-gray-200 rounded-2xl aspect-video"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-gray-200 rounded-2xl"></div>
                <div className="h-32 bg-gray-200 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('channel.error.notFound')}</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              {t('channel.back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Генерируем реально последующие программы после ближайшей следующей
  const nextIndex = channel.nextProgram
    ? channel.schedule.findIndex((p) => p.id === channel.nextProgram!.id)
    : -1;
  const upcomingPrograms = nextIndex >= 0
    ? channel.schedule.slice(nextIndex + 1, nextIndex + 3)
    : channel.schedule.slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок с логотипом канала */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center">
              <Image
                src={channel.logo}
                alt={channel.name}
                width={48}
                height={48}
                className="rounded-xl object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-channel.svg';
                }}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{channel.name}</h1>
              <p className="text-gray-600">{t('channel.live')}</p>
            </div>
          </div>
        </div>

        {/* Плеер и программы */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Плеер */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="relative aspect-video">
                <HLSPlayer 
                  src={channel.streamUrl}
                  className="w-full h-full"
                  autoPlay={true}
                  muted={false}
                />
              </div>
            </div>
          </div>

          {/* Программы справа (только при наличии расписания) */}
          {channel.schedule.length > 0 && (
          <div className="space-y-6">
            {/* Текущая программа */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-600 uppercase tracking-wide">
                  {t('channel.current')}
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  if (channel.currentProgram) {
                    setSelectedProgram(channel.currentProgram);
                    setIsModalOpen(true);
                    setTimeout(() => setModalFadeIn(true), 10);
                  }
                }}
                className="text-left w-full cursor-pointer"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-2 hover:underline">
                  {channel.currentProgram?.title || t('channel.program.unknown')}
                </h2>
              </button>
              
              {channel.currentProgram?.description && (
                <p className="text-gray-600 mb-4 text-sm">
                  {channel.currentProgram.description}
                </p>
              )}
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>
                  {channel.currentProgram ? `${channel.currentProgram.startTime} - ${channel.currentProgram.endTime}` : t('channel.time.unknown')}
                </span>
                <span>
                  {channel.currentProgram?.duration || 0} мин
                </span>
              </div>
              
              {/* Прогресс-бар */}
              <div className={animateCurrent ? 'transition-all duration-300' : ''}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{channel.currentProgram?.startTime || '00:00'}</span>
                  <span>{channel.currentProgram?.endTime || '00:00'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`bg-blue-600 h-2 transition-all duration-500 ease-out ${animateCurrent ? 'opacity-70' : 'opacity-100'}`}
                    style={{ width: `${computeProgressPercent()}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Что будет дальше */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('channel.whatsnext')}</h3>
              
              <div className="space-y-4">
                {/* Следующая программа */}
                <div className={`border-l-4 border-blue-500 pl-4 ${animateNext ? 'transition-all duration-300' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                      {t('channel.next')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (channel.nextProgram) {
                        setSelectedProgram(channel.nextProgram);
                        setIsModalOpen(true);
                        setTimeout(() => setModalFadeIn(true), 10);
                      }
                    }}
                    className="text-left w-full cursor-pointer"
                  >
                    <h4 className="font-semibold text-gray-900 text-sm hover:underline">{channel.nextProgram?.title || t('channel.program.unknown')}</h4>
                  </button>
                  {channel.nextProgram?.description && (
                    <p className="text-xs text-gray-600 mt-1">{channel.nextProgram.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {channel.nextProgram ? `${channel.nextProgram.startTime} - ${channel.nextProgram.endTime}` : t('channel.time.unknown')}
                  </p>
                </div>

                {/* Последующие программы */}
                {upcomingPrograms.slice(0, 2).map((program) => (
                  <div key={program.id} className="border-l-4 border-gray-200 pl-4">
                    <button
                      type="button"
                      onClick={() => { setSelectedProgram(program); setIsModalOpen(true); setTimeout(() => setModalFadeIn(true), 10); }}
                      className="text-left w-full cursor-pointer"
                    >
                      <h4 className="font-semibold text-gray-900 text-sm hover:underline">{program.title}</h4>
                    </button>
                    {program.description && (
                      <p className="text-xs text-gray-600 mt-1">{program.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {program.startTime} - {program.endTime}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Блок под плеером: только описание канала (убрали статистику и кнопки) */}
        <div className="grid grid-cols-1 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{t('channel.about')}</h3>
            <p className="text-gray-600 leading-relaxed">
              {channel.description}
            </p>
          </div>
        </div>

          {/* Другие каналы */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('channel.other')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {otherChannels.map((otherChannel) => (
              <ChannelCard key={otherChannel.id} channel={otherChannel} />
            ))}
          </div>
        </div>
      </div>
      {/* Modal Program Details */}
      {isModalOpen && selectedProgram && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center ${modalFadeIn ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
          onClick={() => { setModalFadeIn(false); setTimeout(() => setIsModalOpen(false), 180); }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className={`relative bg-white rounded-2xl shadow-xl w-[92%] max-w-lg mx-auto overflow-hidden ${modalFadeIn ? 'translate-y-0 scale-100' : 'translate-y-2 scale-95'} transition-all duration-200`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label={t('common.close')}
              className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
              onClick={() => { setModalFadeIn(false); setTimeout(() => setIsModalOpen(false), 180); }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Image src={channel.logo} alt={channel.name} width={32} height={32} className="rounded-md object-contain" />
                </div>
                <div className="font-semibold text-gray-900">{channel.name}</div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{selectedProgram.title}</h3>
              {selectedProgram.description && (
                <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">{selectedProgram.description}</p>
              )}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{t('program.time')}: {selectedProgram.startTime} – {selectedProgram.endTime}</span>
                <span>{t('program.duration')}: {selectedProgram.duration} {t('program.minutes_short')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 