import type { MetadataRoute } from 'next';

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://context-teal-nine.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
  ];
}
