-- RLS (Step 4): users can only access their own rows.
-- profiles: owner-only. conversations/messages: owner-only via user_id /
-- parent conversation. The conditional block creates conversation/message
-- policies only if those tables exist, so fresh + pre-existing DBs both pass.
alter table public.profiles enable row level security;

drop policy if exists "own profile only" on public.profiles;
create policy "own profile only" on public.profiles
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Defensive: if conversations/messages tables exist, lock them to the owner.
-- (select auth.uid()) wrapper keeps the initplan fast (no per-row re-eval).
do $$
begin
  if to_regclass('public.conversations') is not null then
    execute 'alter table public.conversations enable row level security';
    execute 'drop policy if exists "own conversations" on public.conversations';
    execute 'create policy "own conversations" on public.conversations for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)';
  end if;
  if to_regclass('public.messages') is not null then
    execute 'alter table public.messages enable row level security';
    execute 'drop policy if exists "own messages" on public.messages';
    -- messages inherit ownership via the parent conversation
    execute 'create policy "own messages" on public.messages for all using (exists (select 1 from public.conversations c where c.id = conversation_id and (select auth.uid()) = c.user_id)) with check (exists (select 1 from public.conversations c where c.id = conversation_id and (select auth.uid()) = c.user_id))';
  end if;
end
$$;
