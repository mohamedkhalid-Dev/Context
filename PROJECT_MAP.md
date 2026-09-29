# Context — Project File Map

> Core idea: a chatbot that does more than standard ones by consistently asking the user for specific details about their input, ensuring the AI fully understands nuances before answering.

## 1. Project Overview

**Name:** Context
**Workflow:**
1. Landing Page (`/`) → User clicks **“Start Free”**
2. → Login Page (`/login`) via Supabase Auth
3. → Onboarding (`/onboarding`) → enter `name`, `age`, `OpenRouter API key`
4. → Chatbot Interface (`/chat`) — clarifying-first chatbot

**Design constraints:**
- Color scheme: Black & White only (`#000000 / #FFFFFF` + grays `#F5F5F5`, `#1A1A1A`, `#737373` for borders/disabled)
- Font: **Inter** (body + UI) + **Space Grotesk** (headings - optional). Both sophisticated, highly legible, not childish.
- Icons: **Lucide** only (well-known, line-style, sophisticated). No emoji icons, no cartoon sets. e.g. `MessageSquare, Brain, ArrowRight, ShieldCheck, KeyRound, User, LogOut, Send, Loader2`.
- Stack: Frontend React (Next.js App Router) / Backend Laravel (thin proxy for OpenRouter) / Database Supabase (Auth + Postgres + RLS)
- SEO: meta tags, clean URLs, `sitemap.xml`, `robots.txt`
- Security: `.env` never committed, OpenRouter key encrypted server-side, password hashing via Supabase Auth, XSS/SQL-injection protection, Supabase RLS

## 2. Six-Step Build Plan

### Step 1 — Project Setup + Black-White Design System
- Scaffold `frontend/` with Next.js + TypeScript + Tailwind CSS
- Set Tailwind theme to grayscale only, Inter font, Lucide-react
- Create reusable `Button`, `Input`, `Card`, `Navbar`, `Footer`
- Create folder structure below, `README.md`, `.gitignore`, `.env.example`
- Add `sitemap.xml`, `robots.txt`, base meta tags in `layout.tsx`
- Verify: `npm run dev` loads responsive landing page on mobile + desktop

### Step 2 — Landing → Login (Supabase Auth)
- Create Supabase project, enable Email/Password
- Tables: `auth.users` (managed) + `public.profiles` (see §4)
- Routes:
  - `/` landing with **Start Free** → `router.push('/login')`
  - `/login` → Supabase `signUp` / `signIn`, session guard, clear error messages (e.g. “Invalid email or password” not just “Error 500”)
- Middleware: unauthenticated → `/login`, authenticated without profile → `/onboarding`, complete → `/chat`
- Verify: new user can register, login, logout, session persists

### Step 3 — Onboarding: Name, Age, OpenRouter Key
- Route `/onboarding` (protected, one-time)
- Form fields: `name` (string, min 2), `age` (int 13–120), `openrouter_api_key` (starts with `sk-or-`, validated, password-type input)
- On submit: upsert to `public.profiles`, then `router.push('/chat')`
- Security: send key to Laravel backend to encrypt before storing; never log key; RLS: user can only read/write own profile
- UX: explain why key is needed + link to openrouter.ai/keys, show `ShieldCheck` trust note
- Verify: refresh after onboarding stays on `/chat`, profile row exists

### Step 4 — Clarifying Engine (The Differentiator)
- Core prompt system in `clarifyingEngine.ts` + Laravel `ClarifyingPrompt.php`:
  1. Parse user intent
  2. Detect missing nuances (who/what/when/where/constraints/budget/skill-level/goal)
  3. Ask max 2–3 specific follow-up questions per turn (never generic “tell me more”)
  4. Only after user confirms or provides details → give final answer + summary of understood context
- OpenRouter integration: frontend → Laravel `POST /api/chat` → OpenRouter (`POST https://openrouter.ai/api/v1/chat/completions`) → return. Key injected server-side from profile, never exposed to browser after onboarding.
- Store: `conversations` + `messages` tables, with `clarification_stage: clarifying | confirmed | answered`
- Verify: send vague prompt “help me with diet” → bot asks age/goal/restrictions before answering

### Step 5 — Chatbot Interface (`/chat`)
- Layout: left sidebar (history, new chat, profile, logout) + main chat window + input box
- Components: `ChatWindow`, `MessageBubble`, `ClarifyingCard` (renders follow-up questions as selectable chips + free text), `TypingIndicator`, `ApiKeyStatus`
- Features: streaming responses, markdown render (sanitized), copy/regenerate, mobile responsive, empty-state with examples
- Error handling: “Invalid OpenRouter key”, “Rate limit — try again in 30s”, “No internet” — all user-friendly
- Verify: full flow on mobile 360px + desktop, <2s first-token target

### Step 6 — Hardening, SEO, Docs & Deploy
- Security: enable Supabase RLS on all tables, Laravel validation + rate-limit (`throttle:60,1`), XSS sanitize output (`DOMPurify` + Laravel `e()`), test SQL injection
- Performance: Next.js image/font optimization, loading skeletons, Lighthouse >90
- SEO: title/description/OG tags, clean URLs (`/`, `/login`, `/chat`), `sitemap.xml`, `robots.txt`
- Docs: `README.md` (overview, Node 20+, PHP 8.2+, Supabase setup, install & run, env vars, usage guide)
- Deploy: Vercel (frontend) + Laravel Forge/Render (backend) + Supabase Cloud
- Final check: `supabase_get_advisors` for security/performance, full E2E: Start Free → Login → Onboarding → Chat

## 3. Project File Map

```text
anderstood-chat/
│
├── frontend/                          # Next.js (React) — UI only, no secrets
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout: Inter font, B/W theme, SEO meta
│   │   │   ├── page.tsx               # Landing: Hero + Start Free → /login
│   │   │   ├── globals.css            # Tailwind + CSS vars: --black, --white, --gray
│   │   │   ├── login/
│   │   │   │   └── page.tsx           # Login / Register via Supabase
│   │   │   ├── onboarding/
│   │   │   │   └── page.tsx           # Name, Age, OpenRouter Key form
│   │   │   ├── chat/
│   │   │   │   ├── page.tsx           # Protected chatbot interface
│   │   │   │   └── [id]/page.tsx      # Single conversation view (clean URL)
│   │   │   └── api/
│   │   │       └── health/route.ts    # Frontend health check only (no OpenRouter key here)
│   │   │
│   │   ├── components/
│   │   │   ├── landing/
│   │   │   │   ├── Navbar.tsx         # Logo + Start Free button (ArrowRight icon)
│   │   │   │   ├── Hero.tsx           # Headline + Start Free CTA
│   │   │   │   ├── Features.tsx       # 3 cards: Clarifying, Nuance, Memory (Lucide icons)
│   │   │   │   └── Footer.tsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx      # Email/password + error messages
│   │   │   │   └── OnboardingForm.tsx # Name, Age, KeyRound icon + validation
│   │   │   ├── chat/
│   │   │   │   ├── ChatWindow.tsx     # Message list + streaming
│   │   │   │   ├── MessageBubble.tsx  # User (black) vs AI (white w/ border)
│   │   │   │   ├── ClarifyingCard.tsx # Follow-up questions as chips + input
│   │   │   │   ├── ChatInput.tsx      # Send icon, Enter to send
│   │   │   │   ├── Sidebar.tsx        # History, New Chat, User, LogOut
│   │   │   │   └── TypingIndicator.tsx# Loader2 spinner
│   │   │   └── ui/
│   │   │       ├── Button.tsx         # Black primary / white secondary variants
│   │   │       ├── Input.tsx
│   │   │       ├── Card.tsx
│   │   │       └── ErrorAlert.tsx     # User-friendly errors
│   │   │
│   │   ├── lib/
│   │   │   ├── supabaseClient.ts      # createBrowserClient (NEXT_PUBLIC_SUPABASE_URL/KEY)
│   │   │   ├── supabaseServer.ts      # Server-side client for middleware/guards
│   │   │   ├── clarifyingEngine.ts    # Builds clarifying system prompt, parses stage
│   │   │   ├── chatApi.ts             # Calls Laravel POST /api/chat (no key in frontend)
│   │   │   ├── validation.ts          # Zod schemas: age, name, sk-or- key
│   │   │   └── types.ts               # Profile, Conversation, Message types
│   │   │
│   │   ├── hooks/
│   │   │   ├── useSession.ts          # Auth state
│   │   │   ├── useProfile.ts          # Fetch profiles row, onboarding complete?
│   │   │   └── useChat.ts             # Send message, stream, stage handling
│   │   │
│   │   └── middleware.ts              # Route guards: /login, /onboarding, /chat
│   │
│   ├── public/
│   │   ├── logo.svg                   # Monochrome wordmark (no childish mascot)
│   │   ├── og-image.png               # Black-white OG card
│   │   ├── sitemap.xml
│   │   ├── robots.txt
│   │   └── favicon.ico
│   │
│   ├── package.json                   # next, react, @supabase/ssr, lucide-react, zod
│   ├── tailwind.config.ts             # colors: only black/white/gray, fontFamily: Inter
│   ├── tsconfig.json
│   ├── next.config.js
│   └── .env.local                     # NEVER commit — NEXT_PUBLIC_SUPABASE_URL, BACKEND_URL
│       └── .env.example               # Template without secrets (commit this)
│
├── backend/                           # Laravel — secure proxy + validation
│   ├── routes/
│   │   └── api.php                    # POST /api/chat, POST /api/profile/key, GET /api/health
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── ChatController.php     # Auth via Supabase JWT → decrypt key → OpenRouter
│   │   │   │   └── ProfileController.php  # Encrypt + store OpenRouter key
│   │   │   ├── Middleware/
│   │   │   │   └── SupabaseAuth.php       # Verify Supabase JWT
│   │   │   └── Requests/
│   │   │       └── ChatRequest.php        # Validate messages[], conversationId
│   │   ├── Services/
│   │   │   ├── OpenRouterService.php      # Guzzle call to openrouter.ai
│   │   │   └── ClarifyingPrompt.php       # System prompt: ask specifics first
│   │   └── Models/
│   │       └── (thin — main schema lives in Supabase)
│   ├── config/
│   │   └── services.php               # openrouter base_url, timeout
│   ├── .env                           # NEVER commit — SUPABASE_JWT_SECRET, ENCRYPTION_KEY
│   └── composer.json
│
├── supabase/                          # Database as source of truth
│   ├── migrations/
│   │   ├── 001_create_profiles.sql    # id (uuid FK auth.users), name, age, openrouter_key_enc, created_at
│   │   ├── 002_create_conversations.sql # id, user_id, title, created_at
│   │   └── 003_create_messages.sql    # id, conversation_id, role, content, stage, created_at
│   └── policies.sql                   # RLS: users can only access own rows
│
├── README.md                          # Overview, requirements (Node 20+, PHP 8.2+, Supabase), install & run, usage
├── PROJECT_MAP.md                     # This file
└── .gitignore                         # .env, .env.local, vendor/, node_modules/, .next/
```

## 4. Database (Supabase)

```sql
-- profiles: one row per user, created after login
profiles(id uuid PK FK auth.users, name text, age int, openrouter_key_enc text, onboarding_complete bool default false)

-- conversations: chat sessions
conversations(id uuid PK, user_id uuid FK profiles, title text, created_at timestamptz)

-- messages: full history + clarifying stage
messages(id uuid PK, conversation_id uuid FK, role text [user|assistant], content text, stage text [clarifying|confirmed|answered], created_at timestamptz)
```

RLS example:
```sql
alter table profiles enable row level security;
create policy "own profile only" on profiles for all using (auth.uid() = id);
```

## 5. Key Routes & Workflow Mapping

| UI Step | File | Action |
|---------|------|--------|
| Landing Start Free | `frontend/src/app/page.tsx` + `Navbar.tsx` | `router.push('/login')` |
| Login | `frontend/src/app/login/page.tsx` | `supabase.auth.signUp/signIn` → if no profile → `/onboarding` else `/chat` |
| Onboarding | `frontend/src/app/onboarding/page.tsx` | Validate name/age/`sk-or-...` → `POST /api/profile/key` (Laravel encrypts) → `/chat` |
| Chat | `frontend/src/app/chat/page.tsx` | `POST /api/chat` via `chatApi.ts` → stream reply, render `ClarifyingCard` when `stage=clarifying` |
| Auth guard | `frontend/src/middleware.ts` | Redirect logic for all 3 states |

## 6. Design Tokens (Black & White)

```ts
// tailwind.config.ts
colors: {
  black: '#0A0A0A',
  white: '#FFFFFF',
  gray: { 50:'#FAFAFA', 100:'#F5F5F5', 200:'#E5E5E5', 500:'#737373', 900:'#1A1A1A' }
}
fontFamily: { sans: ['Inter','system-ui'], display: ['Space Grotesk','Inter'] }
```

- Primary button: black bg / white text. Secondary: white bg / black border.
- No colors for success/error? Use black check (`CheckCircle2`) + border styles + text for errors, keep monochrome. If needed, use gray shades only to stay in scheme.
- Icons (Lucide): `ArrowRight` (Start Free), `LogIn`, `KeyRound` (API key), `User` (profile), `MessageSquare` (chat), `Brain` (nuance engine), `ShieldCheck` (security note), `Send`, `Plus`, `LogOut`.

## 7. Env Separation

```bash
# frontend/.env.example (commit)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# backend/.env (never commit)
SUPABASE_JWT_SECRET=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
APP_KEY=
```

## 8. What to Build First (MVP order)

1. `frontend/` landing + login + Supabase Auth
2. `profiles` table + onboarding form
3. Laravel `POST /api/chat` proxy + `ClarifyingPrompt.php`
4. `/chat` UI with clarifying loop
5. RLS + validation + error messages + SEO + README + deploy

---
Generated for “anderstood chat” — black-white, Inter + Lucide, Next.js + Laravel + Supabase.
