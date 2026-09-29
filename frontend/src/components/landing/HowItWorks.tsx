import { ArrowRight } from 'lucide-react';

const steps = [
  {
    number: 1,
    title: 'Start Free',
    text: 'Create an account or log in. No credit card, no setup friction.',
  },
  {
    number: 2,
    title: 'Onboarding',
    text: 'Tell us your name, age, and paste your OpenRouter key to unlock chat.',
  },
  {
    number: 3,
    title: 'Chat',
    text: 'Type something vague like “help me with diet” — get 2–3 follow-ups, then a precise answer.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">How it works</h2>
          <p className="mt-3 text-base text-gray-500">
            From vague prompt to precise answer in three steps.
          </p>
        </div>
        <ol className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          {steps.map((step, index) => (
            <li key={step.number} className="flex flex-1 flex-col md:flex-row md:items-center">
              <div className="flex-1 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <span className="font-display flex h-10 w-10 items-center justify-center rounded-full bg-black text-base font-bold text-white">
                  {step.number}
                </span>
                <h3 className="font-display mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{step.text}</p>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight
                  size={20}
                  aria-hidden
                  className="mx-auto my-3 shrink-0 text-black md:mx-3 md:my-0"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
