import { redirect } from 'next/navigation';
import Link from 'next/link';
import OnboardingForm from '@/components/auth/OnboardingForm';
import { createSupabaseServer } from '@/lib/supabaseServer';

export const metadata = {
  title: 'Onboarding',
  description: 'Tell us your name, age and OpenRouter API key to personalize your experience.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  // Server guard (mirrors middleware): unauthenticated → /login, complete → /chat.
  try {
    const supabase = createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, onboarding_complete')
      .eq('user_id', user.id)
      .maybeSingle();
    const complete =
      profile !== null &&
      (profile as { onboarding_complete: boolean }).onboarding_complete === true;
    if (complete) redirect('/chat');
  } catch (err) {
    if (err instanceof Error && /NEXT_REDIRECT/i.test(err.message)) throw err;
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-white px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="font-display text-2xl font-bold text-black sm:text-3xl">Almost there</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Enter your details to unlock the chatbot.
          </p>
        </div>
        <OnboardingForm />
        <p className="mt-4 text-center text-xs leading-relaxed text-neutral-500">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="inline-flex min-h-[44px] items-center underline underline-offset-2 hover:text-black">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="inline-flex min-h-[44px] items-center underline underline-offset-2 hover:text-black">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
