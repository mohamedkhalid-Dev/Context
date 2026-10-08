import Link from 'next/link';
import { ArrowRight, ShieldCheck, KeyRound, Lock } from 'lucide-react';

const trustItems = [
  { icon: ShieldCheck, label: 'Clarifying-first' },
  { icon: KeyRound, label: 'Bring your own OpenRouter key' },
  { icon: Lock, label: 'Local-first privacy' },
];

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl overflow-x-hidden px-4 py-12 text-center sm:px-6 sm:py-24 lg:px-8">
      <p className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500">
        <ShieldCheck size={14} aria-hidden className="shrink-0" /> Clarifying-first AI — no
        guessing
      </p>
      <h1 className="font-display text-hero mx-auto max-w-3xl font-bold">
        AI that asks before it answers
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
        Unlike standard chatbots, Context asks specific follow-up questions to fully grasp
        the nuances of your request — then gives a precise answer.
      </p>
      <div className="mx-auto mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
        <Link
          href="/login"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-black px-6 py-3 text-base font-medium text-white transition hover:bg-gray-900 sm:w-auto"
        >
          Start Free <ArrowRight size={18} aria-hidden />
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-black bg-white px-6 py-3 text-base font-medium text-black transition hover:bg-gray-50 sm:w-auto"
        >
          Log in
        </Link>
      </div>
      <ul className="mt-10 flex flex-col items-center justify-center gap-3 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
        {trustItems.map((item) => (
          <li key={item.label} className="inline-flex min-h-[44px] items-center gap-2">
            <item.icon size={16} className="shrink-0 text-black" aria-hidden />
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
