'use client';

import { useI18n } from '@/i18n/I18nProvider';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface HeroSectionProps {
  channelCount?: number;
}

export default function HeroSection({ channelCount = 15 }: HeroSectionProps) {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary glow */}
        <div 
          className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full opacity-30 animate-float"
          style={{ 
            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.4) 0%, transparent 60%)',
            filter: 'blur(60px)'
          }} 
        />
        {/* Secondary glow */}
        <div 
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-25"
          style={{ 
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 60%)',
            filter: 'blur(60px)',
            animation: 'float 8s ease-in-out infinite reverse'
          }} 
        />
        {/* Accent glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ 
            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.6) 0%, transparent 50%)',
            filter: 'blur(80px)'
          }} 
        />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Live badge */}
        <div 
          className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full mb-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span className="text-sm font-medium text-[var(--foreground-secondary)]">
            {t('hero.live')}
          </span>
          <span className="text-xs text-[var(--foreground-muted)]">•</span>
          <span className="text-sm text-[var(--foreground-muted)]">
            {channelCount}+ {t('hero.stats.channels').toLowerCase()}
          </span>
        </div>

        {/* Main heading */}
        <h1 
          className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 transition-all duration-700 delay-100 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ lineHeight: '1.1' }}
        >
          <span className="text-foreground">{t('hero.title.line1')}</span>
          <br className="hidden sm:block" />
          <span className="text-gradient">{t('hero.title.line2')}</span>
        </h1>

        {/* Subtitle */}
        <p 
          className={`text-lg sm:text-xl text-[var(--foreground-muted)] max-w-2xl mx-auto mb-10 transition-all duration-700 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {t('hero.subtitle')}
        </p>

        {/* CTA Buttons */}
        <div 
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-700 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <Link href="#channels" className="group w-full sm:w-auto">
            <button className="w-full sm:w-auto relative px-8 py-4 rounded-2xl font-semibold text-black overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95">
              {/* Button gradient background */}
              <div 
                className="absolute inset-0 transition-opacity duration-300"
                style={{ 
                  background: 'linear-gradient(135deg, var(--accent-blue) 0%, #00BFFF 100%)'
                }}
              />
              {/* Shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div 
                  className="absolute inset-0"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)'
                  }}
                />
              </div>
              {/* Button content */}
              <span className="relative flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                {t('hero.watchNow')}
              </span>
            </button>
          </Link>
          
          <Link href="/apps" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--foreground)'
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {t('hero.downloadApp')}
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div 
          className={`flex flex-wrap items-center justify-center gap-8 sm:gap-16 transition-all duration-700 delay-[400ms] ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">
              {channelCount}+
            </div>
            <div className="text-sm text-[var(--foreground-muted)]">
              {t('hero.stats.channels')}
            </div>
          </div>
          
          <div className="hidden sm:block w-px h-12 bg-[var(--border)]" />
          
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-gradient">
              24/7
            </div>
            <div className="text-sm text-[var(--foreground-muted)]">
              {t('hero.stats.live')}
            </div>
          </div>
          
          <div className="hidden sm:block w-px h-12 bg-[var(--border)]" />
          
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">
              100%
            </div>
            <div className="text-sm text-[var(--foreground-muted)]">
              {t('hero.stats.free')}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div 
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 delay-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <Link 
          href="#channels" 
          className="flex flex-col items-center gap-2 text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] transition-colors"
        >
          <span className="text-xs font-medium uppercase tracking-wider">{t('hero.scroll')}</span>
          <svg 
            className="w-5 h-5 animate-bounce" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
