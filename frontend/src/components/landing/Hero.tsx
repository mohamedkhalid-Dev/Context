import Link from 'next/link';
import { ArrowRight, ShieldCheck, KeyRound, Lock } from 'lucide-react';

const trustItems = [
  { icon: ShieldCheck, label: 'Clarifying-first' },
  { icon: KeyRound, label: 'Bring your own OpenRouter key' },
  { icon: Lock, label: 'Local-first privacy' },
];

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500">
        <ShieldCheck size={14} aria-hidden /> Clarifying-first AI — no guessing
      </p>
      <h1 className="font-display mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
        AI that asks before it answers
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-gray-500">
        Unlike standard chatbots, Context asks specific follow-up questions to fully
        grasp the nuances of your request — then gives a precise answer.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-6 py-3 text-base font-medium text-white transition hover:bg-gray-900"
        >
          Start Free <ArrowRight size={18} aria-hidden />
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-black bg-white px-6 py-3 text-base font-medium text-black transition hover:bg-gray-50"
        >
          Log in
        </Link>
      </div>
      <ul className="mt-10 flex flex-col items-center justify-center gap-3 text-sm text-gray-500 sm:flex-row sm:gap-8">
        {trustItems.map((item) => (
          <li key={item.label} className="inline-flex items-center gap-2">
            <item.icon size={16} className="text-black" aria-hidden />
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
