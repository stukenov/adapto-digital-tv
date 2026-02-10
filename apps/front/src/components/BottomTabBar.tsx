'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';

export default function BottomTabBar() {
  const { t } = useI18n();
  const pathname = usePathname();

  // Не показываем на админских страницах и страницах просмотра канала
  const isAdminPage = pathname?.startsWith('/admin');
  const isChannelPage = pathname && !pathname.startsWith('/admin') && !pathname.startsWith('/schedule') && pathname !== '/' && !pathname.startsWith('/about') && !pathname.startsWith('/contacts') && !pathname.startsWith('/faq') && !pathname.startsWith('/apps');
  
  if (isAdminPage || isChannelPage) return null;

  const tabs = [
    {
      href: '/',
      label: t('nav.channels'),
      icon: (active: boolean) => (
        <svg 
          className={`w-6 h-6 transition-all duration-300 ${
            active ? 'text-[var(--accent-blue)]' : 'text-[var(--foreground-muted)]'
          }`}
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={active ? 0 : 1.5} 
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
          />
          {active && (
            <path d="M5 3C3.89543 3 3 3.89543 3 5V13H21V5C21 3.89543 20.1046 3 19 3H5ZM3 15H21V15C21 16.1046 20.1046 17 19 17H5C3.89543 17 3 16.1046 3 15V15ZM9.75 17L9 20L8 21H16L15 20L14.25 17H9.75Z" />
          )}
        </svg>
      ),
      isActive: pathname === '/'
    },
    {
      href: '/schedule',
      label: t('nav.schedule'),
      icon: (active: boolean) => (
        <svg 
          className={`w-6 h-6 transition-all duration-300 ${
            active ? 'text-[var(--accent-blue)]' : 'text-[var(--foreground-muted)]'
          }`}
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={active ? 0 : 1.5} 
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
          {active && (
            <path d="M8 2V4M16 2V4M3 7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V7ZM3 10H21M7 14H17M7 18H12" />
          )}
        </svg>
      ),
      isActive: pathname === '/schedule'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Blur background */}
      <div 
        className="absolute inset-0 tab-bar"
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)'
        }}
      />
      
      <div className="relative flex items-center justify-around h-16 tab-bar-safe border-t border-white/10">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center justify-center flex-1 h-full transition-fast active:scale-95 group"
          >
            {/* Icon with glow effect when active */}
            <div className="relative">
              {tab.isActive && (
                <div 
                  className="absolute inset-0 opacity-40"
                  style={{
                    background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)',
                    filter: 'blur(8px)',
                    transform: 'scale(2)'
                  }}
                />
              )}
              {tab.icon(tab.isActive)}
            </div>
            
            {/* Label */}
            <span 
              className={`text-[10px] mt-1 font-medium transition-colors ${
                tab.isActive 
                  ? 'text-[var(--accent-blue)]' 
                  : 'text-[var(--foreground-muted)]'
              }`}
            >
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
