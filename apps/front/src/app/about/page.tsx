'use client';

import { useI18n } from '@/i18n/I18nProvider';
import Footer from '@/components/Footer';
import Image from 'next/image';

export default function AboutPage() {
  const { t } = useI18n();

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: t('about.features.free'),
      description: t('about.features.free.desc'),
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: t('about.features.quality'),
      description: t('about.features.quality.desc'),
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      title: t('about.features.devices'),
      description: t('about.features.devices.desc'),
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: t('about.features.schedule'),
      description: t('about.features.schedule.desc'),
    },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--accent-blue)]/10 via-transparent to-[var(--accent-purple)]/10 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            {t('about.title')}
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto">
            {t('about.subtitle')}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                {t('about.mission.title')}
              </h2>
              <p className="text-lg text-[var(--muted-foreground)] leading-relaxed">
                {t('about.mission.text')}
              </p>
            </div>
            <div className="relative">
              <div className="aspect-video bg-[var(--card)] rounded-3xl overflow-hidden flex items-center justify-center">
                <Image
                  src="/logo.svg"
                  alt="Adapto Digital TV"
                  width={200}
                  height={60}
                  className="opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            {t('about.features.title')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-2xl bg-[var(--background)] border border-[var(--border)]"
              >
                <div className="w-16 h-16 rounded-2xl bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] flex items-center justify-center mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-[var(--accent-blue)] mb-2">15+</div>
              <div className="text-[var(--muted-foreground)]">{t('hero.stats.channels')}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-[var(--accent-blue)] mb-2">24/7</div>
              <div className="text-[var(--muted-foreground)]">{t('hero.stats.live')}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-[var(--accent-blue)] mb-2">HD</div>
              <div className="text-[var(--muted-foreground)]">{t('about.features.quality')}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-[var(--accent-blue)] mb-2">100%</div>
              <div className="text-[var(--muted-foreground)]">{t('hero.stats.free')}</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
