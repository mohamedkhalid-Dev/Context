import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://context-teal-nine.vercel.app';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms for using Context: BYO OpenRouter key, acceptable use, third-party model disclaimers and liability limits.',
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: {
    title: 'Terms of Service — Context',
    description: 'Terms for using Context: BYO OpenRouter key, acceptable use and liability limits.',
    url: `${SITE_URL}/terms`,
    siteName: 'Context',
    type: 'website',
  },
};

const sections = [
  { id: 'acceptance', label: 'Acceptance' },
  { id: 'service', label: 'Service description' },
  { id: 'accounts', label: 'Accounts & eligibility' },
  { id: 'acceptable-use', label: 'Acceptable use' },
  { id: 'openrouter', label: 'OpenRouter third-party' },
  { id: 'ip', label: 'Intellectual property' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'liability', label: 'Limitation of liability' },
  { id: 'termination', label: 'Termination' },
  { id: 'changes', label: 'Changes' },
  { id: 'governing', label: 'Governing & contact' },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-black">
      <Navbar />
      <main className="mx-auto max-w-3xl overflow-x-hidden px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-gray-500 hover:text-black"
        >
          <ArrowLeft size={16} /> Back to home
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-black text-white">
            <FileText size={20} />
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Service
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
            on your device only, using browser local storage — they are never sent to
            our database.
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
          <section id="acceptance">
            <h2 className="font-display text-xl font-bold text-black">Acceptance</h2>
            <p className="mt-3">
              By accessing or using Context, you agree to these Terms. If you do not
              agree, do not use the service.
            </p>
          </section>

          <section id="service">
            <h2 className="font-display text-xl font-bold text-black">Service description</h2>
            <p className="mt-3">
              Context is a clarifying-first chatbot: it asks specific follow-up
              questions to understand nuance before answering. The service uses a bring-your-own
              OpenRouter key model — you supply your own API key, stored only in your
              browser&apos;s localStorage. Supabase stores only your profile (name, age, email).
            </p>
          </section>

          <section id="accounts">
            <h2 className="font-display text-xl font-bold text-black">Accounts &amp; eligibility</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>You must be at least 13 years old to use the service.</li>
              <li>You are responsible for keeping your login credentials confidential.</li>
              <li>Provide accurate profile information and keep it up to date.</li>
            </ul>
          </section>

          <section id="acceptable-use">
            <h2 className="font-display text-xl font-bold text-black">Acceptable use</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Do not abuse, disrupt, or attempt to bypass security or access controls.</li>
              <li>Do not use the service for illegal, harmful, or infringing activity.</li>
              <li>Do not submit sensitive data you have no right to share.</li>
              <li>Do not resell or misrepresent the service as your own.</li>
            </ul>
          </section>

          <section id="openrouter">
            <h2 className="font-display text-xl font-bold text-black">OpenRouter third-party</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>AI responses are powered by OpenRouter using your own key.</li>
              <li>You are responsible for safeguarding your key and any usage costs it incurs.</li>
              <li>You must comply with OpenRouter&apos;s terms and any model providers&apos; policies.</li>
              <li>We do not control third-party availability, pricing, or output.</li>
            </ul>
          </section>

          <section id="ip">
            <h2 className="font-display text-xl font-bold text-black">Intellectual property</h2>
            <p className="mt-3">
              The Context interface, design, and code are our property and protected by
              applicable law. You retain rights to content you submit. You grant us only the
              limited rights needed to operate the service for you.
            </p>
          </section>

          <section id="disclaimers">
            <h2 className="font-display text-xl font-bold text-black">Disclaimers</h2>
            <p className="mt-3">
              AI responses may be inaccurate, incomplete, or outdated. They are not professional
              advice (legal, medical, financial, or otherwise). Verify important information
              independently. The service is provided &ldquo;as is&rdquo; without warranties of any
              kind.
            </p>
          </section>

          <section id="liability">
            <h2 className="font-display text-xl font-bold text-black">Limitation of liability</h2>
            <p className="mt-3">
              To the maximum extent permitted by law, Context is not liable for indirect,
              incidental, or consequential damages, including costs arising from your OpenRouter
              key usage or reliance on AI output. Our total liability is limited to the amounts
              you paid to us for the service, if any.
            </p>
          </section>

          <section id="termination">
            <h2 className="font-display text-xl font-bold text-black">Termination</h2>
            <p className="mt-3">
              You may stop using the service at any time and delete locally stored data by
              clearing site data. We may suspend or terminate accounts that violate these Terms
              or threaten the security of the service.
            </p>
          </section>

          <section id="changes">
            <h2 className="font-display text-xl font-bold text-black">Changes</h2>
            <p className="mt-3">
              We may update these Terms as the service evolves. Material changes will be
              reflected in the &ldquo;Last updated&rdquo; date above. Continued use after changes
              means you accept the updated Terms.
            </p>
          </section>

          <section id="governing">
            <h2 className="font-display text-xl font-bold text-black">Governing &amp; contact</h2>
            <p className="mt-3">
              These Terms are governed by applicable law in the jurisdiction where the service is
              operated, without regard to conflict-of-law rules. Questions? Email us at{' '}
              <a
                href="mailto:hello@understood.chat"
                className="text-black underline underline-offset-4"
              >
                hello@understood.chat
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
