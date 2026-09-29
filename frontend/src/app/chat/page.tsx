'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatWindow from '@/components/chat/ChatWindow';
import Sidebar from '@/components/chat/Sidebar';
import { useSession } from '@/hooks/useSession';
import { useProfile } from '@/hooks/useProfile';
import { getActiveConversationId } from '@/lib/storage';

export default function ChatPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const { profile, loading: profileLoading } = useProfile();
  const [activeId, setActiveId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!sessionLoading && !session) router.push('/login');
    else if (!profileLoading && session && !profile?.onboarding_complete) {
      router.push('/onboarding');
    }
  }, [session, profile, sessionLoading, profileLoading, router]);

  useEffect(() => {
    setActiveId(getActiveConversationId() ?? undefined);
  }, []);

  if (sessionLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-sm space-y-2 px-4" aria-busy="true" aria-label="Loading workspace">
          <div className="h-4 animate-pulse rounded bg-neutral-200" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
          <p className="pt-2 text-center text-sm text-neutral-500">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen bg-white text-black">
      <Sidebar activeId={activeId} />
      <main className="flex min-w-0 flex-1 flex-col">
        <ChatWindow
          conversationId={activeId}
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
