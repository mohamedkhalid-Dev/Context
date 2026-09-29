import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  History,
  KeyRound,
  MessagesSquare,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://context-teal-nine.vercel.app';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Specific follow-ups, nuance detection, Understood summaries, BYO OpenRouter key, precise answers and local-first privacy.',
  alternates: { canonical: `${SITE_URL}/features` },
  openGraph: {
    title: 'Features — Context',
    description:
      'Specific follow-ups, nuance detection, Understood summaries, BYO OpenRouter key, precise answers and local-first privacy.',
    url: `${SITE_URL}/features`,
    siteName: 'Context',
    type: 'website',
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
    title: 'Features — Context',
    description:
      'Specific follow-ups, nuance detection, Understood summaries, BYO OpenRouter key, precise answers and local-first privacy.',
    images: [`${SITE_URL}/og-image.png`],
  },
};

const features = [
  {
    icon: MessagesSquare,
    title: 'Specific follow-ups',
    text: 'Max 2–3 targeted questions per turn. Never a vague “tell me more”.',
  },
  {
    icon: Brain,
    title: 'Nuance detection',
    text: 'Detects missing goal, context, constraints, budget and skill level.',
  },
  {
    icon: History,
    title: 'Understood summary',
    text: 'Every answer starts with what the AI understood — confirm or correct it.',
  },
  {
    icon: KeyRound,
    title: 'Bring your own key',
    text: 'Use your own OpenRouter key. It stays in your browser — we never store it.',
  },
  {
    icon: Zap,
    title: 'Precise answers',
    text: 'One well-targeted answer beats five guesses. Less back-and-forth, faster results.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    text: 'Black & white, no trackers. Your key is yours; your chats persist in Supabase.',
  },
];

const comparison: { label: string; standard: string; understood: string }[] = [
  {
    label: 'First response',
    standard: 'Guesses and answers immediately',
    understood: 'Asks 2–3 specific questions first',
  },
  {
    label: 'Vague prompts',
    standard: 'Assumes the most likely meaning',
    understood: 'Detects what is missing and clarifies',
  },
  {
    label: 'Corrections',
    standard: 'Three more messages of back-and-forth',
    understood: '“Understood” summary you confirm in one click',
  },
  {
    label: 'API key',
    standard: 'Locked to one provider, opaque billing',
    understood: 'Bring your own OpenRouter key, your control',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Features
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl">
            Clarifying-first, not guessing-first.
          </h1>
          <p className="mt-4 text-base text-neutral-600">
            Everything in Context exists to understand your request before
            answering it.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <f.icon size={22} className="mb-3" />
              <h2 className="font-display font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-neutral-500">{f.text}</p>
            </Card>
          ))}
        </div>

        <section className="mx-auto mt-14 max-w-3xl">
          <h2 className="font-display text-center text-2xl font-bold">
            Standard chatbot vs Context
          </h2>
          <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-3 font-medium text-neutral-500"> </th>
                  <th className="px-4 py-3 font-semibold">Standard chatbot</th>
                  <th className="px-4 py-3 font-semibold">Context</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.label} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-neutral-500">{row.standard}</td>
                    <td className="px-4 py-3">{row.understood}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-neutral-500">Experience the difference in one conversation.</p>
          <Link href="/login">
            <Button size="lg">
              Start Free <ArrowRight size={18} />
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
