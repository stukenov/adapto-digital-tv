'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n/I18nProvider';
import { useEffect, useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  
  // Track scroll for background opacity - must be before any conditional returns
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Не показываем на админских страницах
  const isAdminPage = pathname?.startsWith('/admin');
  if (isAdminPage) return null;

  // На странице канала показываем минимальную навигацию
  const isChannelPage = pathname && !pathname.startsWith('/schedule') && pathname !== '/' && !pathname.startsWith('/about') && !pathname.startsWith('/contacts') && !pathname.startsWith('/faq') && !pathname.startsWith('/apps');

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 safe-area-top ${
        scrolled 
          ? 'glass-header' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-18">
          {/* Логотип или кнопка назад */}
          {isChannelPage ? (
            <Link 
              href="/" 
              className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-fast group"
              aria-label={t('nav.channels')}
            >
              <div className="w-9 h-9 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-fast group-hover:bg-white/10 group-hover:border-white/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <span className="hidden sm:inline font-medium text-sm">{t('nav.back')}</span>
            </Link>
          ) : (
            <Link href="/" className="flex items-center" aria-label="Adapto Digital TV — на главную">
              <div className="relative h-8 w-auto">
                <Image
                  src="/logo.svg"
                  alt="Adapto Digital TV"
                  width={120}
                  height={32}
                  className="h-8 w-auto object-contain"
                  priority
                />
              </div>
            </Link>
          )}

          {/* Десктопная навигация + переключатель языка */}
          <div className="flex items-center gap-2">
            {/* Десктопные ссылки - скрыты на мобильных */}
            {!isChannelPage && (
              <div className="hidden md:flex items-center gap-1 mr-2">
                <Link
                  href="/"
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-fast ${
                    pathname === '/'
                      ? 'bg-white/10 text-foreground'
                      : 'text-[var(--foreground-muted)] hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{t('nav.channels')}</span>
                </Link>
                <Link
                  href="/schedule"
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-fast ${
                    pathname === '/schedule'
                      ? 'bg-white/10 text-foreground'
                      : 'text-[var(--foreground-muted)] hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{t('nav.schedule')}</span>
                </Link>
              </div>
            )}

            {/* Переключатель языка */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher variant="minimal" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
