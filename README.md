# Context

Clarifying-first chatbot: asks specific follow-up questions to fully understand nuances before answering.

Workflow: Landing (`Start Free`) → `/login` (Supabase Auth) → `/onboarding` (name, age, OpenRouter key) → `/chat`.

**Local-first privacy truth:** Supabase stores ONLY `public.profiles(user_id, name, age, email, onboarding_complete)`. The OpenRouter API key lives ONLY in browser localStorage (`understoodchat:openrouter_key`) and chat history ONLY in `understoodchat:conversations` + `understoodchat:active_conversation` (see `frontend/src/lib/storage.ts`). The key is sent ONLY to OpenRouter over HTTPS — never to Supabase or Laravel, never logged.

## Requirements

- Node 20+, npm
- Supabase Cloud project (Auth + Postgres)
- PHP 8.2+ + Composer — only if you enable the OPTIONAL Laravel fallback (disabled by default; direct-to-OpenRouter is primary)

## Setup

### 1. Supabase (run ONLY these two files)

1. Create project at supabase.com (this repo uses `https://tlpthofcazqsnlgnqkze.supabase.co`).
2. Enable Email auth (Authentication > Providers > Email).
3. In SQL Editor, run in order:
   - `supabase/migrations/001_create_profiles.sql`
   - `supabase/policies.sql`
4. Do NOT run `002_create_conversations.sql` / `003_create_messages.sql` — they are deprecated (history is localStorage-only).
5. Manual hardening (Dashboard):
   - Authentication > Settings > enable **Leaked password protection** (fixes advisor WARN).
   - Optionally apply `supabase/migrations/004_hardening_fixes.sql` in SQL Editor (fixes `control_rules` RLS initplan + `touch_updated_at` search_path — non-destructive).

### 2. Frontend (primary app)

```bash
cd frontend
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# NEXT_PUBLIC_BACKEND_URL (only needed for optional Laravel fallback),
# NEXT_PUBLIC_OPENROUTER_MODEL (default: openrouter/auto)
npm install
npm run dev
```

Open http://localhost:3000

### 3. Backend (OPTIONAL disabled fallback)

Direct-to-OpenRouter is primary. Enable Laravel only if you prefer server-side key injection.

```bash
cd backend
composer install
# create backend/.env manually (no example file committed — never commit it),
# then fill SUPABASE_JWT_SECRET, APP_KEY
php artisan serve --port=8000
```

Routes (all hardened: `SupabaseAuth` JWT verify + `throttle:60,1` + `ChatRequest` validation + `e()`/`strip_tags` escaping, no key logging): `POST /api/chat`, `POST /api/profile/key`, `GET /api/health`.

## Env vars

| File | Var | Required | Notes |
|------|-----|----------|-------|
| `frontend/.env.local` | `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `frontend/.env.local` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon/publishable key (public-safe) |
| `frontend/.env.local` | `NEXT_PUBLIC_BACKEND_URL` | fallback only | Laravel URL; unused in direct mode |
| `frontend/.env.local` | `NEXT_PUBLIC_OPENROUTER_MODEL` | no | Default `openrouter/auto` |
| `backend/.env` | `SUPABASE_JWT_SECRET` | fallback only | JWT verify secret — never commit |
| `backend/.env` | `APP_KEY` | fallback only | Laravel app key — never commit |

Never commit `.env` / `.env.local` (see `.gitignore`). `.env.example` contains only public placeholder keys.

## Usage guide

1. Click **Start Free** on `/` → `/login` → register or log in.
2. On `/onboarding`, enter name (min 2 chars), age (13–120), and OpenRouter key (`sk-or-...` from openrouter.ai/keys). Profile (name/age/email) saves to Supabase; key saves to this browser only.
3. Chat at `/chat`: try a vague prompt like “help me with diet” — the bot asks 2–3 specific follow-ups (goal, restrictions, budget) before answering.
4. Answer the follow-ups → get a “What I understood:” summary + precise answer.
5. History, New chat, Profile & API key, Log out live in the sidebar. History stays on the device; use `/chat/[id]` clean URLs per conversation.

## Security

- Supabase RLS: `profiles` policy `own profile only` uses `(select auth.uid()) = user_id` (per-row initplan-safe). See `supabase/policies.sql` + manual fix `004_hardening_fixes.sql` for `control_rules`.
- Frontend XSS: plain-text render (`MessageBubble` uses `{content}`, no `dangerouslySetInnerHTML`) + `sanitizeContent()` strips `script/iframe/object/embed`, `on*` handlers, `javascript:` URIs. If markdown rendering is added later, sanitize HTML with DOMPurify first.
- Validation: Zod (`validation.ts`: name/age/email + `sk-or-` key + 4000-char chat limit) + Laravel `ChatRequest` (messages 1–50, content 1–4000, `conversation_id` uuid) + `throttle:60,1`.
- SQL injection: Supabase query builder + Laravel query bindings only — no raw SQL with user input. Test: submit `'; DROP TABLE profiles;--` as name/message → stored as literal text or rejected, table intact.
- Secrets: `.env` / `.env.local` / `backend/.env` gitignored; OpenRouter key never leaves the device except to OpenRouter; never logged.

## Troubleshooting

- **Missing key** (“No OpenRouter API key found”): re-enter it in Onboarding or Profile & API key; check `localStorage` key `understoodchat:openrouter_key`.
- **Invalid key** (401/402): verify the key at openrouter.ai/keys, check credits, re-paste (must start `sk-or-`).
- **Rate limit** (429): wait 30s and retry.
- **RLS / permission error on save**: log out and log in again (refresh session), then retry onboarding.
- **Offline** (“No internet”): check network; history still loads from localStorage.
- **Blocked localStorage**: allow site storage in the browser, otherwise key/history cannot persist.

## Deploy

- **Frontend (Vercel):** import `frontend/` as the project Root Directory, framework preset Next.js (Node 20+, see `frontend/.nvmrc` + `engines`). Set env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (your `https://<app>.vercel.app` or custom domain, used for canonical/OG tags), plus `NEXT_PUBLIC_OPENROUTER_MODEL` optionally (and `NEXT_PUBLIC_BACKEND_URL` only if you enable the optional Laravel fallback). Build command `npm run build`, output `.next`. Every push to `main` auto-deploys; preview deployments cover PRs. Auth note: `/` (landing) is public-only — middleware + server guard redirect logged-in users to `/chat` (complete profile) or `/onboarding` (incomplete), so anonymous visitors and bots still get the full SEO page.
- **Backend (Laravel Forge / Render, OPTIONAL):** disabled by default — only needed if you prefer server-side OpenRouter key injection over direct device-key mode. On Forge/Render set `SUPABASE_JWT_SECRET`, `APP_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`. Expose `POST /api/chat`, `POST /api/profile/key`, `GET /api/health` behind `supabase.auth` + `throttle:60,1`, then point `NEXT_PUBLIC_BACKEND_URL` at it.
- **Database (Supabase Cloud):** project already live (`https://tlpthofcazqsnlgnqkze.supabase.co`). Apply `supabase/migrations/001_create_profiles.sql` then `supabase/policies.sql` once; apply `004_hardening_fixes.sql` manually for advisor WARNs; enable leaked-password protection in Auth settings. No other migrations (002/003 deprecated — history is localStorage-only).
- **Performance target:** Lighthouse >90 via `next/font` (Inter + Space Grotesk, `display: swap`), `compress` + AVIF/WebP in `next.config.js`, route-level `loading.tsx` skeletons + inline chat skeletons, no remote fonts/images by default.

## Design

- Black & white only (`#0A0A0A` / `#FFFFFF` + grays)
- Fonts: Inter (body) + Space Grotesk (headings), loaded via `next/font` with `display: swap`
- Icons: Lucide only (no emoji)
- SEO: title/description/OG + Twitter cards, canonical `https://understood.chat/`, clean URLs (`/`, `/login`, `/chat`, `/chat/[id]`), `sitemap.xml` + `robots.txt` (`/chat`, `/onboarding`, `/api/` disallowed)
