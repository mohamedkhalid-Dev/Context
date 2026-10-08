import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="mx-auto max-w-6xl overflow-x-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="rounded-2xl bg-black px-6 py-12 text-center text-white sm:px-12 sm:py-16">
        <h2
          id="cta-heading"
          className="font-display mx-auto max-w-2xl text-[clamp(1.5rem,5vw+0.75rem,2.25rem)] font-bold leading-tight"
        >
          Start understanding, not guessing.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-gray-200">
          Ask anything vague. We will ask the right questions — then nail the answer.
        </p>
        <Link
          href="/login"
          className="mx-auto mt-8 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-base font-medium text-black transition hover:bg-gray-100 sm:w-auto sm:min-w-[200px]"
        >
          Start Free <ArrowRight size={18} aria-hidden />
        </Link>
        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-gray-300">
          Free to start. By continuing you agree to our{' '}
          <Link
            href="/terms"
            className="inline-flex min-h-[44px] items-center underline hover:text-white"
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className="inline-flex min-h-[44px] items-center underline hover:text-white"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
