-- 001: profiles (one row per Supabase auth user).
-- Local-first: columns user_id (uuid PK, FK auth.users), name (text),
-- age (13-120), email (nullable), onboarding_complete (bool),
-- created_at, updated_at. RLS keeps rows owner-only.
-- NOTE: no openrouter_key_enc here — key lives in browser localStorage only
-- (see README "Local-first privacy truth"). OPTIONAL server-side fallback
-- uses 005_add_openrouter_key_enc.sql only if Laravel proxy is enabled.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) >= 2),
  age int not null check (age between 13 and 120),
  email text null check (email is null or char_length(email) between 5 and 254),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Co-locate RLS so applying 001 alone is never open.
alter table public.profiles enable row level security;
