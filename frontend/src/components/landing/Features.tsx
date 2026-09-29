import { MessagesSquare, Brain, History, ShieldCheck, KeyRound, Zap } from 'lucide-react';
import Card from '@/components/ui/Card';

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
    icon: ShieldCheck,
    title: 'Local-first privacy',
    text: 'Chats stay in your browser first. Delete anytime, no dark patterns.',
  },
  {
    icon: KeyRound,
    title: 'BYO OpenRouter key',
    text: 'Bring your own key, pick your model. Your key, your control.',
  },
  {
    icon: Zap,
    title: 'Fast streaming',
    text: 'Token-by-token streaming answers with a clean, responsive interface.',
  },
];

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Built to understand first</h2>
        <p className="mt-3 text-base text-gray-500">
          Most chatbots guess. Context clarifies — then answers with precision.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title}>
            <f.icon size={22} className="mb-3" aria-hidden />
            <h3 className="font-display font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{f.text}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
