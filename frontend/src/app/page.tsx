import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import Examples from '@/components/landing/Examples';
import FAQ from '@/components/landing/FAQ';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';
import { createSupabaseServer } from '@/lib/supabaseServer';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://context-teal-nine.vercel.app';

export const metadata: Metadata = {
  title: 'Context — AI that asks before it answers',
  description:
    'Context is a clarifying-first AI chatbot. It asks 2–3 targeted follow-ups, shows an Understood summary, then answers precisely.',
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    title: 'Context — AI that asks before it answers',
    description: 'AI that asks before it answers. No guessing, only understanding.',
    url: `${SITE_URL}/`,
    siteName: 'Context',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
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
    images: [`${SITE_URL}/og-image.png`],
  },
};

// Structured data for rich results: Organization + WebSite + FAQPage.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#org`,
      name: 'Context',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/logo.svg`,
      slogan: 'AI that asks before it answers',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#site`,
      url: `${SITE_URL}/`,
      name: 'Context',
      publisher: { '@id': `${SITE_URL}/#org` },
      inLanguage: 'en-US',
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is clarifying-first?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Instead of guessing, Context asks 2–3 specific follow-up questions, shows an Understood summary, then answers. You confirm or correct it.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need an OpenRouter key?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. You bring your own OpenRouter key to pick any supported model and control usage and costs. Paste it once during onboarding.',
          },
        },
        {
          '@type': 'Question',
          name: 'Where is my key stored?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Your key stays in your browser localStorage and is sent only to OpenRouter over HTTPS. Never to our database.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is it free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Using Context is free. You pay OpenRouter directly for model usage on your own key, often cents per conversation.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is this different from ChatGPT?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Standard chatbots guess and answer immediately. Context detects ambiguity, asks targeted follow-ups, and confirms understanding first.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I delete my data?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Chats are local-first. Delete individual conversations or full history anytime from within the app.',
          },
        },
      ],
    },
  ],
};

// Landing is public-only: logged-in users never see it (SEO-safe —
// bots/visitors are unauthenticated, so they still get the full page).
// Always dynamic so the auth check runs per request (required on Vercel).
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  // Server guard (mirrors middleware): authenticated → /chat or /onboarding.
  try {
    const supabase = createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, onboarding_complete')
        .eq('user_id', user.id)
        .maybeSingle();
      const complete =
        profile !== null &&
        (profile as { onboarding_complete: boolean }).onboarding_complete === true;
      redirect(complete ? '/chat' : '/onboarding');
    }
  } catch (err) {
    // next/navigation redirect() throws — rethrow so the redirect works.
    // Any other error (e.g. missing env during build) falls through to render.
    if (err instanceof Error && /NEXT_REDIRECT/i.test(err.message)) throw err;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Examples />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
//start