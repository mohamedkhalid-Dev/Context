-- 004_hardening_fixes.sql — MANUAL: apply in Supabase Dashboard > SQL Editor.
-- Do NOT re-create conversations/messages (migrations 002/003 are deprecated).
-- Fixes known advisor WARNs; non-destructive (CREATE OR REPLACE + DROP/CREATE POLICY).
--
-- 1) Fix performance WARN auth_rls_initplan on public.control_rules policy "own rules":
--    wrap auth.uid() in (select ...) so it is evaluated once, not per row.
drop policy if exists "own rules" on public.control_rules;
create policy "own rules" on public.control_rules
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
--
-- 2) Fix security WARN function_search_path_mutable on public.touch_updated_at:
--    pin search_path so the trigger function cannot be hijacked via search_path.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end
$$;
--
-- 3) Confirm profiles policy already uses the fast pattern (no change needed):
--    "own profile only" on public.profiles uses ((select auth.uid()) = user_id).
--
-- 4) Manual Dashboard step (cannot be done via SQL):
--    Authentication > Settings > Enable "Leaked password protection"
--    (fixes WARN auth_leaked_password_protection).
--
-- INFO only (safe to ignore): unused indexes idx_profiles_email, idx_rules_enabled.
-- Keep them for now; drop later only if query patterns confirm they stay unused.
