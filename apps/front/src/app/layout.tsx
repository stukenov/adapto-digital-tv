import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Navigation from "@/components/Navigation";
import BottomTabBar from "@/components/BottomTabBar";
import { I18nProvider } from "@/i18n/I18nProvider";
import TopNavWrapper from "@/components/TopNavWrapper";

export const metadata: Metadata = {
  title: {
    default: 'Adapto Digital TV — Online TV Platform',
    template: '%s — Adapto Digital TV',
  },
  description: 'Watch TV channels online for free. Live streaming 24/7 on any device.',
  keywords: [
    'online tv', 'live tv', 'streaming', 'tv channels',
    'adapto digital tv', 'live streaming', 'free tv',
  ],
  authors: [{ name: 'Adapto Digital TV', url: 'https://example.com' }],
  creator: 'Adapto Digital TV',
  publisher: 'Adapto Digital TV',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'),
  alternates: {
    canonical: '/',
    languages: {
      'kk-KZ': '/kk',
      'ru-RU': '/ru',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'kk_KZ',
    alternateLocale: ['ru_RU'],
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
    siteName: 'Adapto Digital TV',
    title: 'Adapto Digital TV — Online TV Platform',
    description: 'Watch TV channels online for free. Live streaming 24/7.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Adapto Digital TV',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Adapto Digital TV',
    description: 'Watch TV channels online for free 24/7',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  category: 'entertainment',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

// JSON-LD structured data for Organization
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Adapto Digital TV',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
  description: 'Online TV platform. Watch TV channels live for free.',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['Kazakh', 'Russian', 'English'],
  },
};

// JSON-LD for WebSite with search
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Adapto Digital TV',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: (process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com') + '/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "";
  return (
    <html lang="kk">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        {/* WebView bridge guards to prevent crashes in in-app browsers (e.g., Facebook iOS) */}
        <Script id="webview-bridge-shim" strategy="beforeInteractive">
          {`
          (function(){
            try {
              if (typeof window !== 'undefined') {
                if (!window.__adapto_abort_swallow_installed) {
                  window.__adapto_abort_swallow_installed = true;
                  window.addEventListener('unhandledrejection', function(e){
                    var reason = e && e.reason;
                    var name = reason && reason.name;
                    var message = reason && (reason.message || String(reason));
                    if (name === 'AbortError' && message && message.indexOf('The play() request was interrupted by a new load request') !== -1) {
                      e.preventDefault();
                    }
                  });
                }
                if (!('webkit' in window) || typeof window.webkit !== 'object' || !window.webkit) {
                  window.webkit = {};
                }
                if (!window.webkit.messageHandlers || typeof window.webkit.messageHandlers !== 'object') {
                  window.webkit.messageHandlers = {};
                }
                var handlerNames = ['ReactNativeWebView','bridge','native','console'];
                for (var i = 0; i < handlerNames.length; i++) {
                  var name = handlerNames[i];
                  if (!window.webkit.messageHandlers[name]) {
                    window.webkit.messageHandlers[name] = { postMessage: function(){ /* no-op */ } };
                  } else {
                    if (typeof window.webkit.messageHandlers[name].postMessage !== 'function') {
                      window.webkit.messageHandlers[name].postMessage = function(){ /* no-op */ };
                    }
                  }
                }
                if (!window.ReactNativeWebView || typeof window.ReactNativeWebView.postMessage !== 'function') {
                  window.ReactNativeWebView = { postMessage: function(){ /* no-op */ } };
                }
              }
            } catch (e) { /* swallow */ }
          })();
          `}
        </Script>
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-gtag" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: true });
              `}
            </Script>
          </>
        )}
        <I18nProvider>
          <TopNavWrapper>
            <Navigation />
          </TopNavWrapper>
          {children}
          <TopNavWrapper>
            <BottomTabBar />
          </TopNavWrapper>
        </I18nProvider>
      </body>
    </html>
  );
}
