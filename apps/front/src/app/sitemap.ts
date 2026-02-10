import { MetadataRoute } from 'next';

const BASE_URL = 'https://example.com';

// Static pages that always exist
const staticPages = [
  '',
  '/schedule',
  '/about',
  '/contacts',
  '/faq',
  '/apps',
];

// Known channel slugs - these should ideally come from API
const channelSlugs = [
  'qazaqstan',
  'balapan',
  'jibek-joly',
  'qazaqstan-almaty',
  'qazaqstan-shymkent',
  'qazaqstan-aqtobe',
  'qazaqstan-qostanay',
  'qazaqstan-qaragandy',
  'qazaqstan-pavlodar',
  'qazsport',
  'abai-tv',
  'el-arna',
  'kazakh-tv',
  'balalar',
  'madeniyet',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = staticPages.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'hourly' : 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));

  // Channel pages
  const channelRoutes: MetadataRoute.Sitemap = channelSlugs.map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.9,
  }));

  // Channel schedule pages
  const scheduleRoutes: MetadataRoute.Sitemap = channelSlugs.map((slug) => ({
    url: `${BASE_URL}/${slug}/schedule`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...staticRoutes, ...channelRoutes, ...scheduleRoutes];
}
