'use client';

import { useI18n } from '@/i18n/I18nProvider';
import Footer from '@/components/Footer';
import Image from 'next/image';
import Link from 'next/link';

export default function AppsPage() {
  const { t } = useI18n();

  const features = [
    { icon: '📺', text: t('apps.feature.live') },
    { icon: '📅', text: t('apps.feature.schedule') },
    { icon: '⭐', text: t('apps.feature.favorites') },
    { icon: '🔔', text: t('apps.feature.notifications') },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--accent-blue)]/10 via-transparent to-[var(--accent-purple)]/10 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            {t('apps.title')}
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto">
            {t('apps.subtitle')}
          </p>
        </div>
      </section>

      {/* Mobile App */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Phone mockup */}
            <div className="order-2 md:order-1 flex justify-center">
              <div className="relative w-64 h-[500px] bg-black rounded-[3rem] p-3 shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />
                <div className="w-full h-full bg-[var(--background)] rounded-[2.5rem] overflow-hidden flex items-center justify-center">
                  <div className="text-center p-6">
                    <Image
                      src="/logo.svg"
                      alt="Adapto Digital TV"
                      width={120}
                      height={40}
                      className="mx-auto mb-4"
                    />
                    <p className="text-foreground text-sm">{t('appPromo.mockupText')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {t('apps.mobile.title')}
              </h2>
              <p className="text-lg text-[var(--muted-foreground)] mb-8">
                {t('apps.mobile.desc')}
              </p>

              {/* Features */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]"
                  >
                    <span className="text-2xl">{feature.icon}</span>
                    <span className="text-sm font-medium text-foreground">{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* Download buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#"
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-black text-white rounded-xl hover:bg-black/80 transition-apple"
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs opacity-70">{t('appPromo.downloadOn')}</div>
                    <div className="text-lg font-semibold">App Store</div>
                  </div>
                </a>
                <a
                  href="#"
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-black text-white rounded-xl hover:bg-black/80 transition-apple"
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs opacity-70">{t('appPromo.getItOn')}</div>
                    <div className="text-lg font-semibold">Google Play</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart TV */}
      <section className="py-16 sm:py-24 bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {t('apps.smarttv.title')}
              </h2>
              <p className="text-lg text-[var(--muted-foreground)] mb-8">
                {t('apps.smarttv.desc')}
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="px-6 py-3 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                  <span className="font-medium text-foreground">Samsung Tizen</span>
                </div>
                <div className="px-6 py-3 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                  <span className="font-medium text-foreground">LG webOS</span>
                </div>
                <div className="px-6 py-3 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                  <span className="font-medium text-foreground">Android TV</span>
                </div>
              </div>
            </div>

            {/* TV mockup */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-80 h-48 bg-black rounded-lg border-4 border-gray-800 flex items-center justify-center">
                  <Image
                    src="/logo.svg"
                    alt="Adapto Digital TV on TV"
                    width={150}
                    height={50}
                    className="opacity-80"
                  />
                </div>
                <div className="w-24 h-4 bg-gray-800 mx-auto rounded-b-lg" />
                <div className="w-40 h-2 bg-gray-700 mx-auto rounded-b-lg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Web */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t('apps.web.title')}
          </h2>
          <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            {t('apps.web.desc')}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--accent-blue)] text-white font-semibold rounded-2xl hover:bg-[var(--accent-blue)]/90 transition-apple"
          >
            {t('hero.watchNow')}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
