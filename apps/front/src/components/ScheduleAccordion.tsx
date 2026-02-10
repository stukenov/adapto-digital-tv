'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Channel, Program } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import LiveIndicator from './LiveIndicator';

interface ScheduleAccordionProps {
  channels: Channel[];
  className?: string;
}

export default function ScheduleAccordion({ channels, className = '' }: ScheduleAccordionProps) {
  const { t } = useI18n();
  const [expandedChannelId, setExpandedChannelId] = useState<string | null>(
    channels.length > 0 ? channels[0].id : null
  );

  const toggleChannel = (channelId: string) => {
    setExpandedChannelId(prev => prev === channelId ? null : channelId);
  };

  // Определяем текущую программу
  const getCurrentProgramId = (programs: Program[]) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const program of programs) {
      const [startHour, startMinute] = program.startTime.split(':').map(Number);
      const [endHour, endMinute] = program.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      let endMinutes = endHour * 60 + endMinute;
      
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
      }
      
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return program.id;
      }
    }
    return null;
  };

  if (channels.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-[var(--muted-foreground)]">{t('schedule.empty')}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {channels.map((channel, index) => {
        const isExpanded = expandedChannelId === channel.id;
        const hasSchedule = Array.isArray(channel.schedule) && channel.schedule.length > 0;
        const filteredPrograms = hasSchedule 
          ? channel.schedule.filter(p => p.startTime !== p.endTime)
          : [];
        const currentProgramId = getCurrentProgramId(filteredPrograms);
        const currentProgram = filteredPrograms.find(p => p.id === currentProgramId);

        return (
          <div 
            key={channel.id}
            className="rounded-2xl overflow-hidden bg-[var(--card)] animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Заголовок канала - кликабельный */}
            <button
              onClick={() => toggleChannel(channel.id)}
              className="w-full flex items-center gap-4 p-4 text-left transition-apple hover:bg-[var(--card-hover)]"
            >
              {/* Логотип */}
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                <Image
                  src={channel.logo}
                  alt={channel.name}
                  width={36}
                  height={36}
                  className="rounded-lg object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-channel.svg';
                  }}
                />
              </div>

              {/* Название и текущая программа */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-lg">{channel.name}</h3>
                  <LiveIndicator size="sm" />
                </div>
                {currentProgram && (
                  <p className="text-sm text-[var(--muted-foreground)] line-clamp-1">
                    {currentProgram.startTime} — {currentProgram.title}
                  </p>
                )}
              </div>

              {/* Иконка раскрытия */}
              <div className={`w-8 h-8 rounded-full bg-[var(--card-hover)] flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`}>
                <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Раскрывающийся список программ */}
            {isExpanded && (
              <div className="border-t border-[var(--border)]">
                {filteredPrograms.length > 0 ? (
                  <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                    {filteredPrograms.map((program) => {
                      const isCurrent = program.id === currentProgramId;
                      
                      return (
                        <Link
                          key={program.id}
                          href={`/${channel.slug}`}
                          className={`flex items-center gap-4 p-4 transition-apple-fast ${
                            isCurrent 
                              ? 'bg-[var(--accent-red)]/10' 
                              : 'hover:bg-[var(--card-hover)]'
                          }`}
                        >
                          {/* Время */}
                          <div className="w-14 flex-shrink-0">
                            <span className={`text-base font-semibold ${
                              isCurrent ? 'text-[var(--accent-red)]' : 'text-[var(--muted-foreground)]'
                            }`}>
                              {program.startTime}
                            </span>
                          </div>

                          {/* Название */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium line-clamp-1 ${
                                isCurrent ? 'text-foreground' : 'text-foreground/90'
                              }`}>
                                {program.title}
                              </span>
                              {isCurrent && <LiveIndicator size="sm" />}
                            </div>
                          </div>

                          {/* Длительность */}
                          <span className="text-sm text-[var(--muted-foreground)] flex-shrink-0">
                            {program.duration} {t('program.minutes_short')}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-[var(--muted-foreground)]">{t('schedule.empty')}</p>
                  </div>
                )}

                {/* Ссылка на канал */}
                <Link
                  href={`/${channel.slug}`}
                  className="flex items-center justify-center gap-2 p-4 border-t border-[var(--border)] text-[var(--accent-blue)] font-medium transition-apple hover:bg-[var(--card-hover)]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('program.watchChannel')}
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
