import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://context-teal-nine.vercel.app';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Context collects, uses, and protects your data. Local-first: profiles in Supabase, OpenRouter key and conversations in your browser.',
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: 'Privacy Policy — Context',
    description: 'How Context protects data: only name, age, email in Supabase. Key and chats stay in your browser.',
    url: `${SITE_URL}/privacy`,
    siteName: 'Context',
    type: 'website',
  },
};

const sections = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'data-we-collect', label: 'Data we collect' },
  { id: 'how-we-use', label: 'How we use data' },
  { id: 'openrouter-key', label: 'OpenRouter key handling' },
  { id: 'cookies', label: 'Cookies & localStorage' },
  { id: 'retention', label: 'Data retention & deletion' },
  { id: 'security', label: 'Security' },
  { id: 'rights', label: 'Your rights' },
  { id: 'contact', label: 'Contact' },
  { id: 'changes', label: 'Changes' },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black"
        >
          <ArrowLeft size={16} /> Back to home
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-black text-white">
            <ShieldCheck size={20} />
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
        </div>
        <p className="mt-3 text-sm text-gray-500">Last updated: September 28, 2026</p>

        <div className="mt-6 rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm leading-relaxed text-black">
          <p>
            <strong>Data storage at a glance:</strong> we store only your name, age, and
            email in our database (Supabase Postgres,{' '}
            <code className="rounded bg-gray-200 px-1.5 py-0.5 text-[13px]">
              public.profiles
            </code>
            ). Your conversation history and your OpenRouter API key are stored locally
            on your device only, using browser local storage (
            <code className="rounded bg-gray-200 px-1.5 py-0.5 text-[13px]">
              understoodchat:conversations
            </code>{' '}
            and{' '}
            <code className="rounded bg-gray-200 px-1.5 py-0.5 text-[13px]">
              understoodchat:openrouter_key
            </code>
            ) — they are never sent to our database.
          </p>
        </div>

        <nav aria-label="On this page" className="mt-8 rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            On this page
          </p>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-gray-600 underline-offset-4 hover:text-black hover:underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-gray-700">
          <section id="introduction">
            <h2 className="font-display text-xl font-bold text-black">Introduction</h2>
            <p className="mt-3">
              Context is a clarifying-first chatbot: it asks follow-up questions to
              understand nuance before answering. We are local-first by design. Supabase stores
              only your profile (name, age, email). Your OpenRouter API key and your
              conversations stay in your browser&apos;s localStorage.
            </p>
          </section>

          <section id="data-we-collect">
            <h2 className="font-display text-xl font-bold text-black">Data we collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong className="text-black">Profile data (database only):</strong> we
                store only your name, age, and email in our Supabase Postgres database
                (table <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-black">public.profiles</code>).
                Used for authentication and personalization — nothing else is stored
                server-side.
              </li>
              <li>
                <strong className="text-black">Device-only data (browser local storage):</strong> your
                OpenRouter API key and your conversation history are stored locally on
                your device only, using browser local storage. These never leave your
                device except as described below.
              </li>
              <li>
                <strong className="text-black">Technical data:</strong> basic, non-identifying
                info such as browser type or error logs needed to keep the app working.
              </li>
            </ul>
            <p className="mt-3">
              We do not collect payment details, precise location, or any data beyond what is
              needed to run the service.
            </p>
          </section>

          <section id="how-we-use">
            <h2 className="font-display text-xl font-bold text-black">How we use data</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Provide, maintain, and improve the chat experience.</li>
              <li>Authenticate you and keep your profile available across sessions.</li>
              <li>Respond to support requests sent to us by email.</li>
              <li>Protect the service against abuse and fix bugs.</li>
            </ul>
            <p className="mt-3">We do not sell your data. We do not use your data for advertising.</p>
          </section>

          <section id="openrouter-key">
            <h2 className="font-display text-xl font-bold text-black">OpenRouter key handling</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                Your key is stored only in browser localStorage under{' '}
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-black">
                  understoodchat:openrouter_key
                </code>
                .
              </li>
              <li>It is sent only to OpenRouter over HTTPS when you send a chat message.</li>
              <li>It is never sent to Supabase or our backend, and never logged by us.</li>
              <li>
                Anyone with access to your browser profile can read localStorage, so use a
                personal device and clear site data on shared computers.
              </li>
            </ul>
          </section>

          <section id="cookies">
            <h2 className="font-display text-xl font-bold text-black">Cookies &amp; localStorage</h2>
            <p className="mt-3">
              We use essential cookies or browser storage for authentication sessions (Supabase
              Auth) and preferences. We use localStorage for your OpenRouter key and
              conversations so they stay on your device. We do not use third-party tracking or
              advertising cookies.
            </p>
          </section>

          <section id="retention">
            <h2 className="font-display text-xl font-bold text-black">
              Data retention &amp; deletion
            </h2>
            <p className="mt-3">
              Profile data is kept in Supabase while your account is active. Conversations and
              your key live in your browser until you clear them. To delete your account and
              profile data, contact us or use the in-app delete option where available. Clearing
              site data in your browser removes locally stored conversations and your key
              immediately.
            </p>
          </section>

          <section id="security">
            <h2 className="font-display text-xl font-bold text-black">Security</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Supabase Row Level Security (RLS) restricts profile access to its owner.</li>
              <li>All traffic uses HTTPS; passwords are hashed and never stored in plain text.</li>
              <li>Rendered AI output is sanitized to reduce XSS risk.</li>
              <li>
                No system is fully secure. Protect your OpenRouter key and report suspected
                misuse promptly.
              </li>
            </ul>
          </section>

          <section id="rights">
            <h2 className="font-display text-xl font-bold text-black">Your rights</h2>
            <p className="mt-3">
              Depending on your location, you may request access, correction, export, or deletion
              of your personal data, and object to or restrict certain processing. We will respond
              within a reasonable time.
            </p>
          </section>

          <section id="contact">
            <h2 className="font-display text-xl font-bold text-black">Contact</h2>
            <p className="mt-3">
              Questions about this policy or a deletion request? Email us at{' '}
              <a
                href="mailto:hello@understood.chat"
                className="text-black underline underline-offset-4"
              >
                hello@understood.chat
              </a>
              .
            </p>
          </section>

          <section id="changes">
            <h2 className="font-display text-xl font-bold text-black">Changes</h2>
            <p className="mt-3">
              We may update this policy as the service evolves. Material changes will be
              reflected in the &ldquo;Last updated&rdquo; date above. Continued use after changes
              means you accept the updated policy.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
