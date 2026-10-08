import { CheckCircle2 } from 'lucide-react';
import Card from '@/components/ui/Card';

const examples = [
  {
    topic: 'Diet',
    vagueInput: '“help me with diet”',
    questions: ['What is your goal?', 'Any dietary restrictions?', 'How much cooking time?'],
    summary: 'Understood: vegetarian, weight-loss goal, 20-minute meals — here is your weekly plan…',
  },
  {
    topic: 'Coding',
    vagueInput: '“help me debug my app”',
    questions: ['Which stack?', 'What is the exact error?', 'What have you tried?'],
    summary: 'Understood: Next.js app, hydration error on login page — here is the fix…',
  },
  {
    topic: 'Travel',
    vagueInput: '“plan a trip to Japan”',
    questions: ['When and for how long?', 'What is your budget?', 'Cities or nature?'],
    summary: 'Understood: 10 days in spring, mid-range budget, cities first — here is your itinerary…',
  },
];

export default function Examples() {
  return (
    <section
      aria-label="Examples"
      className="mx-auto max-w-6xl overflow-x-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
        <h2 className="font-display text-section font-bold">Vague in, precise out</h2>
        <p className="mt-3 text-base text-gray-500">
          See how clarifying questions turn ambiguity into answers that fit.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {examples.map((example) => (
          <Card key={example.topic}>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {example.topic}
              </p>
              <p className="mt-2 break-words rounded-md bg-gray-100 px-3 py-2 text-sm font-medium">
                {example.vagueInput}
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-500">
                Clarifying questions
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {example.questions.map((question) => (
                  <li
                    key={question}
                    className="break-words rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-black"
                  >
                    {question}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2 rounded-md border border-gray-200 bg-white p-3">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />
                <p className="min-w-0 break-words text-sm text-gray-500">
                  <span className="font-medium text-black">{example.summary}</span>
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
