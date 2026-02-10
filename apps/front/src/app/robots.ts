import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/env-test'],
      },
    ],
    sitemap: 'https://example.com/sitemap.xml',
  };
}
