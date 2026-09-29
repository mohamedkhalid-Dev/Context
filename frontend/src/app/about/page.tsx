import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Brain, MessagesSquare } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import Button from '@/components/ui/Button';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://context-teal-nine.vercel.app';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why Context is clarifying-first: detects missing goal, context and constraints, then asks focused follow-ups before answering.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'About — Context',
    description:
      'Why Context is clarifying-first: detects missing goal, context and constraints, then asks focused follow-ups before answering.',
    url: `${SITE_URL}/about`,
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
    title: 'About — Context',
    description:
      'Why Context is clarifying-first: detects missing goal, context and constraints, then asks focused follow-ups before answering.',
    images: [`${SITE_URL}/og-image.png`],
  },
};

const steps = [
  {
    title: '1. You ask',
    text: 'Send any request — a writing task, a coding problem, a decision you need help with.',
  },
  {
    title: '2. It clarifies',
    text: 'Instead of guessing, the AI asks 2–3 specific questions about your goal, context and constraints.',
  },
  {
    title: '3. You confirm',
    text: 'Every answer starts with an "Understood" summary so you can correct it before reading on.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">About</p>
        <h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl">
          AI that asks before it answers.
        </h1>
        <p className="mt-4 text-base text-neutral-600">
          Most chatbots guess what you mean and answer immediately — then you spend three
          more messages correcting them. Context is clarifying-first: it asks
          focused follow-up questions to fully grasp the nuances of your request, then
          gives one precise answer.
        </p>

        <section className="mt-10">
          <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
            <MessagesSquare size={20} /> How it differs
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            A standard chatbot treats every prompt as complete. Context treats
            every prompt as a draft: it detects what is missing — your goal, context,
            constraints, budget or skill level — and asks 2–3 targeted questions before
            answering. Never a vague &ldquo;tell me more&rdquo;. Every final answer
            opens with what the AI understood, so you can confirm or correct it in one
            click.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
            <Brain size={20} /> How it works
          </h2>
          <ol className="mt-4 space-y-3">
            {steps.map((step) => (
              <li
                key={step.title}
                className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <p className="font-medium">{step.title}</p>
                <p className="mt-1 text-sm text-neutral-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Stack notes</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-600">
            <li>Next.js (App Router + TypeScript + Tailwind) frontend.</li>
            <li>Supabase for auth and chat persistence.</li>
            <li>Bring your own OpenRouter key — stored only in your browser, never on our servers.</li>
          </ul>
        </section>

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-neutral-200 pt-8 text-center">
          <p className="text-sm text-neutral-500">Try a conversation that starts with understanding.</p>
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
