import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section aria-labelledby="cta-heading" className="mx-auto max-w-6xl px-4 py-20">
      <div className="rounded-2xl bg-black px-6 py-16 text-center text-white sm:px-12">
        <h2 id="cta-heading" className="font-display mx-auto max-w-2xl text-3xl font-bold sm:text-4xl">
          Start understanding, not guessing.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-gray-200">
          Ask anything vague. We will ask the right questions — then nail the answer.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-base font-medium text-black transition hover:bg-gray-100"
        >
          Start Free <ArrowRight size={18} />
        </Link>
        <p className="mt-4 text-xs text-gray-300">
          Free to start. By continuing you agree to our{' '}
          <Link href="/terms" className="underline hover:text-white">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-white">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
