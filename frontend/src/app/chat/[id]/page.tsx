'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatWindow from '@/components/chat/ChatWindow';
import Sidebar from '@/components/chat/Sidebar';
import { useSession } from '@/hooks/useSession';
import { useProfile } from '@/hooks/useProfile';
import { getConversation, setActiveConversationId } from '@/lib/storage';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const { session, loading: sessionLoading } = useSession();
  const { profile, loading: profileLoading } = useProfile();

  // Wire the route to the localStorage conversation; unknown ids fall back to /chat.
  useEffect(() => {
    if (!conversationId) return;
    const existing = getConversation(conversationId);
    if (!existing) {
      router.replace('/chat');
      return;
    }
    setActiveConversationId(conversationId);
  }, [conversationId, router]);

  useEffect(() => {
    if (!sessionLoading && !session) router.push('/login');
    else if (!profileLoading && session && !profile?.onboarding_complete) {
      router.push('/onboarding');
    }
  }, [session, profile, sessionLoading, profileLoading, router]);

  if (sessionLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-sm space-y-2 px-4" aria-busy="true" aria-label="Loading conversation">
          <div className="h-4 animate-pulse rounded bg-neutral-200" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
          <p className="pt-2 text-center text-sm text-neutral-500">Loading conversation…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen bg-white text-black">
      <Sidebar activeId={conversationId} />
      <main className="flex min-w-0 flex-1 flex-col">
        <ChatWindow
          conversationId={conversationId}
          profile={
            profile
              ? { name: profile.name ?? profile.display_name, age: profile.age }
              : undefined
          }
        />
      </main>
    </div>
  );
}
