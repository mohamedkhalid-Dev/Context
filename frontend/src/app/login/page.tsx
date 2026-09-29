import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { createSupabaseServer } from '@/lib/supabaseServer';

export const metadata = {
  title: 'Log in',
  description: 'Log in to Context to start clarifying-first chats with your own OpenRouter key. Free, no credit card.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Server guard (mirrors middleware): authenticated users skip /login.
  try {
    const supabase = createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, onboarding_complete')
        .eq('user_id', user.id)
        .maybeSingle();
      const complete =
        profile !== null &&
        (profile as { onboarding_complete: boolean }).onboarding_complete === true;
      redirect(complete ? '/chat' : '/onboarding');
    }
  } catch (err) {
    // next/navigation redirect() throws — rethrow so the redirect works.
    // Any other error (e.g. missing env) falls through to render the form.
    if (err instanceof Error && /NEXT_REDIRECT/i.test(err.message)) throw err;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-black">Welcome back</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Log in to continue to Context.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
