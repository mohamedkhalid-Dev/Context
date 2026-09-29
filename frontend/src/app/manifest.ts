import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Context — AI that asks before it answers',
    short_name: 'Context',
    description:
      'Clarifying-first AI chatbot that asks specific follow-up questions before answering.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/og-image.png', sizes: '1200x630', type: 'image/png' },
    ],
  };
}
