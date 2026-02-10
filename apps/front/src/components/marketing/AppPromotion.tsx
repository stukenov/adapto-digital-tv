'use client';

import { useI18n } from '@/i18n/I18nProvider';
import Image from 'next/image';

export default function AppPromotion() {
  const { t } = useI18n();

  const features = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      text: t('appPromo.feature1')
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      text: t('appPromo.feature2')
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      text: t('appPromo.feature3')
    }
  ];

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, rgba(168, 85, 247, 0.08) 50%, rgba(0, 212, 255, 0.08) 100%)'
          }}
        />
        {/* Animated gradient orbs */}
        <div 
          className="absolute top-0 right-0 w-[500px] h-[500px] opacity-30 animate-float"
          style={{
            background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 60%)',
            filter: 'blur(80px)'
          }}
        />
        <div 
          className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-20"
          style={{
            background: 'radial-gradient(circle, var(--accent-purple) 0%, transparent 60%)',
            filter: 'blur(80px)',
            animation: 'float 8s ease-in-out infinite reverse'
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Content */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <svg className="w-4 h-4 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-[var(--foreground-secondary)]">
                {t('appPromo.badge')}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              {t('appPromo.title')}
            </h2>
            <p className="text-lg text-[var(--foreground-muted)] mb-8 max-w-xl mx-auto lg:mx-0">
              {t('appPromo.subtitle')}
            </p>

            {/* App Store Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
              <a
                href="#"
                className="group relative flex items-center gap-3 px-6 py-3.5 rounded-2xl overflow-hidden transition-premium hover:scale-105"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                aria-label="Download on App Store"
              >
                <svg className="w-8 h-8 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs text-[var(--foreground-muted)]">{t('appPromo.downloadOn')}</div>
                  <div className="text-lg font-semibold text-foreground">App Store</div>
                </div>
              </a>

              <a
                href="#"
                className="group relative flex items-center gap-3 px-6 py-3.5 rounded-2xl overflow-hidden transition-premium hover:scale-105"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                aria-label="Get it on Google Play"
              >
                <svg className="w-8 h-8 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs text-[var(--foreground-muted)]">{t('appPromo.getItOn')}</div>
                  <div className="text-lg font-semibold text-foreground">Google Play</div>
                </div>
              </a>
            </div>

            {/* Features */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                  <span className="text-[var(--accent-green)]">{feature.icon}</span>
                  {feature.text}
                </div>
              ))}
            </div>
          </div>

          {/* Phone mockup */}
          <div className="relative flex-shrink-0 w-full max-w-xs lg:max-w-sm">
            {/* Glow behind phone */}
            <div 
              className="absolute inset-0 opacity-40"
              style={{
                background: 'radial-gradient(circle at center, var(--accent-blue) 0%, transparent 60%)',
                filter: 'blur(60px)',
                transform: 'scale(1.2)'
              }}
            />
            
            {/* Phone frame */}
            <div className="relative mx-auto" style={{ perspective: '1000px' }}>
              <div 
                className="relative w-64 sm:w-72 mx-auto"
                style={{ 
                  transform: 'rotateY(-5deg) rotateX(5deg)',
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* Phone body */}
                <div 
                  className="relative rounded-[3rem] p-2 sm:p-3"
                  style={{
                    background: 'linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%)',
                    boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.5), 0 30px 60px -30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {/* Dynamic island */}
                  <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 w-24 sm:w-28 h-6 sm:h-7 bg-black rounded-full z-20" />
                  
                  {/* Screen */}
                  <div 
                    className="relative rounded-[2.5rem] overflow-hidden aspect-[9/19.5]"
                    style={{
                      background: 'var(--background)'
                    }}
                  >
                    {/* App content mockup */}
                    <div className="absolute inset-0 flex flex-col">
                      {/* Status bar */}
                      <div className="h-12 sm:h-14" />
                      
                      {/* Content */}
                      <div className="flex-1 p-4 flex flex-col items-center justify-center">
                        <div className="mb-6">
                          <Image
                            src="/logo.svg"
                            alt="Adapto Digital TV"
                            width={100}
                            height={32}
                            className="mx-auto"
                          />
                        </div>
                        
                        {/* Channel cards mockup */}
                        <div className="w-full space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div 
                              key={i}
                              className="flex items-center gap-3 p-3 rounded-xl"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)'
                              }}
                            >
                              <div className="w-10 h-10 rounded-lg bg-white/10 animate-shimmer" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-20 rounded bg-white/10 animate-shimmer" />
                                <div className="h-2 w-28 rounded bg-white/5 animate-shimmer" />
                              </div>
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-live" />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Bottom bar */}
                      <div 
                        className="h-16 sm:h-20 px-6 flex items-center justify-around"
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          backdropFilter: 'blur(10px)'
                        }}
                      >
                        <div className="w-6 h-6 rounded bg-white/20" />
                        <div className="w-6 h-6 rounded bg-[var(--accent-blue)]/50" />
                        <div className="w-6 h-6 rounded bg-white/20" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Reflection */}
                <div 
                  className="absolute -bottom-4 left-4 right-4 h-8 rounded-full opacity-20"
                  style={{
                    background: 'radial-gradient(ellipse, var(--accent-blue) 0%, transparent 70%)',
                    filter: 'blur(10px)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
