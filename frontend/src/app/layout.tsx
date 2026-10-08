import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

// Canonical production URL. Set NEXT_PUBLIC_SITE_URL on Vercel to
// https://context-teal-nine.vercel.app (or custom domain).
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://context-teal-nine.vercel.app';

const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Context — AI that asks before it answers',
    template: '%s — Context',
  },
  description:
    'Context is a clarifying-first AI chatbot. It asks 2–3 targeted follow-up questions, shows an Understood summary, then answers precisely.',
  keywords: [
    'Context',
    'clarifying-first AI',
    'AI chatbot',
    'OpenRouter',
    'ask before answering',
    'nuance detection',
  ],
  authors: [{ name: 'Context' }],
  creator: 'Context',
  openGraph: {
    title: 'Context — AI that asks before it answers',
    description: 'AI that asks before it answers. No guessing, only understanding.',
    url: `${SITE_URL}/`,
    siteName: 'Context',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Context — AI that asks before it answers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Context — AI that asks before it answers',
    description: 'AI that asks before it answers. No guessing, only understanding.',
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: `${SITE_URL}/` },
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/logo.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/favicon.ico' }],
  },
  manifest: '/manifest.webmanifest',
  applicationName: 'Context',
  appleWebApp: { capable: true, title: 'Context', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-white text-black antialiased">{children}</body>
    </html>
  );
}
