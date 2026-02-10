'use client';

import { useI18n } from '@/i18n/I18nProvider';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'default' | 'minimal';
}

export default function LanguageSwitcher({ className = '', variant = 'default' }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();

  if (variant === 'minimal') {
    return (
      <div 
        className={`flex items-center p-1 rounded-xl ${className}`} 
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
        role="group" 
        aria-label="Language switcher"
      >
        <button
          type="button"
          className={`w-9 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-fast ${
            locale === 'kk' 
              ? 'bg-[var(--accent-blue)] text-black' 
              : 'text-[var(--foreground-muted)] hover:text-foreground hover:bg-white/10'
          }`}
          onClick={() => setLocale('kk')}
          title="Қазақша"
        >
          KZ
        </button>
        <button
          type="button"
          className={`w-9 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-fast ${
            locale === 'ru' 
              ? 'bg-[var(--accent-blue)] text-black' 
              : 'text-[var(--foreground-muted)] hover:text-foreground hover:bg-white/10'
          }`}
          onClick={() => setLocale('ru')}
          title="Русский"
        >
          RU
        </button>
      </div>
    );
  }

  // Стандартный вариант для админки
  const base = 'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]';
  const active = 'bg-[var(--accent-blue)] text-black';
  const inactive = 'text-[var(--foreground-muted)] hover:text-foreground hover:bg-white/10';

  return (
    <div className={`inline-flex items-center gap-1 ${className}`} role="group" aria-label="Language switcher">
      <button
        type="button"
        className={`${base} ${locale === 'ru' ? active : inactive}`}
        aria-pressed={locale === 'ru'}
        onClick={() => setLocale('ru')}
        title="Русский"
      >
        RU
        <span className="sr-only">Русский</span>
      </button>
      <button
        type="button"
        className={`${base} ${locale === 'kk' ? active : inactive}`}
        aria-pressed={locale === 'kk'}
        onClick={() => setLocale('kk')}
        title="Қазақша"
      >
        KZ
        <span className="sr-only">Қазақша</span>
      </button>
    </div>
  );
}
