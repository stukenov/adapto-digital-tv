'use client';

import { Program } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import LiveIndicator from './LiveIndicator';

interface ScheduleListProps {
  programs: Program[];
  onProgramClick?: (program: Program) => void;
  showCurrentIndicator?: boolean;
  className?: string;
}

export default function ScheduleList({ 
  programs, 
  onProgramClick,
  showCurrentIndicator = true,
  className = '' 
}: ScheduleListProps) {
  const { t } = useI18n();

  // Определяем текущую программу
  const getCurrentProgramId = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const program of programs) {
      const [startHour, startMinute] = program.startTime.split(':').map(Number);
      const [endHour, endMinute] = program.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      let endMinutes = endHour * 60 + endMinute;
      
      // Обработка перехода через полночь
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
      }
      
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return program.id;
      }
    }
    return null;
  };

  const currentProgramId = getCurrentProgramId();

  // Фильтруем программы с одинаковым временем начала/окончания
  const filteredPrograms = programs.filter(p => p.startTime !== p.endTime);

  if (filteredPrograms.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-[var(--foreground-muted)]">{t('schedule.empty')}</p>
      </div>
    );
  }

  return (
    <div className={`py-2 ${className}`}>
      {filteredPrograms.map((program, index) => {
        const isCurrent = showCurrentIndicator && program.id === currentProgramId;
        
        return (
          <button
            key={program.id}
            onClick={() => onProgramClick?.(program)}
            className={`w-full text-left px-4 py-4 transition-fast border-b border-white/5 last:border-b-0 ${
              isCurrent 
                ? 'bg-red-500/10' 
                : 'hover:bg-white/5 active:bg-white/10'
            }`}
            style={{ 
              animationDelay: `${index * 30}ms`,
            }}
          >
            <div className="flex items-start gap-4">
              {/* Время */}
              <div className="flex-shrink-0 w-14">
                <span className={`text-base font-semibold tabular-nums ${
                  isCurrent ? 'text-red-500' : 'text-foreground'
                }`}>
                  {program.startTime}
                </span>
              </div>

              {/* Контент */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`font-medium line-clamp-2 ${
                    isCurrent ? 'text-foreground' : 'text-[var(--foreground-secondary)]'
                  }`}>
                    {program.title}
                  </h4>
                  {isCurrent && <LiveIndicator size="sm" />}
                </div>
                
                {program.description && (
                  <p className="text-sm text-[var(--foreground-muted)] line-clamp-1 mt-1">
                    {program.description}
                  </p>
                )}
              </div>

              {/* Длительность */}
              <div className="flex-shrink-0">
                <span className="text-xs text-[var(--foreground-subtle)] px-2 py-1 rounded-md bg-white/5">
                  {program.duration} {t('program.minutes_short')}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
