'use client';

import { useI18n } from '@/i18n/I18nProvider';

interface LiveIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  variant?: 'default' | 'badge';
}

export default function LiveIndicator({ 
  size = 'md', 
  showText = false,
  className = '',
  variant = 'default'
}: LiveIndicatorProps) {
  const { t } = useI18n();
  
  const dotSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };

  const textSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  };

  if (variant === 'badge') {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${className}`}
        style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className={`${textSizeClasses[size]} font-semibold text-red-500 uppercase tracking-wider`}>
          {t('live.label')}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="relative flex">
        <span 
          className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 ${dotSizeClasses[size]}`} 
        />
        <span 
          className={`relative inline-flex rounded-full bg-red-500 ${dotSizeClasses[size]}`}
          style={{ 
            boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)' 
          }}
        />
      </span>
      {showText && (
        <span className={`${textSizeClasses[size]} font-bold text-red-500 uppercase tracking-wide`}>
          {t('live.label')}
        </span>
      )}
    </div>
  );
}
