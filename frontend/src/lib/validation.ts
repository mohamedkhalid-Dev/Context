import { z } from 'zod';

// Supabase profile fields only: name, age, email (stored in public.profiles).
// Matches DB checks: name >= 2 chars, age 13-120, email nullable 5-254 chars.
export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  age: z.number().min(13, 'You must be at least 13.').max(120, 'Please enter a valid age.'),
  email: z
    .string()
    .min(5, 'Please enter a valid email address.')
    .max(254, 'Email is too long.')
    .email('Please enter a valid email address.')
    .nullable()
    .optional(),
});

// OpenRouter key format — validated client-side with Zod, stored ONLY in
// browser localStorage (`understoodchat:openrouter_key`), sent ONLY to
// OpenRouter over HTTPS. Never to Supabase/Laravel, never logged.
export const openRouterKeySchema = z
  .string()
  .min(10, 'API key looks too short.')
  .startsWith('sk-or-', 'OpenRouter keys start with sk-or-. Get one at openrouter.ai/keys.');

// Combined onboarding form (profile -> Supabase profiles(name, age, email),
// key -> browser localStorage only).
export const onboardingSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  age: z.number().min(13, 'You must be at least 13.').max(120, 'Please enter a valid age.'),
  openrouter_api_key: openRouterKeySchema,
});

export const chatMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty.').max(4000, 'Message is too long (max 4000 chars).'),
});

// --- Attachments (local-only, sent only to OpenRouter with the message) ---
// Images go to the model as vision input (downscaled data URLs).
// Text files are inlined as truncated plain text. All other files travel
// as metadata only (name/size/type) — never parsed, never uploaded.
export const MAX_ATTACHMENTS_PER_MESSAGE = 4;
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB per image (pre-downscale)
export const MAX_TEXT_FILE_BYTES = 512 * 1024; // 500 KB per text file
export const MAX_TEXT_PREVIEW_CHARS = 12000; // inlined text per file
export const MAX_ATTACHMENT_IMAGE_DIM = 1024; // downscale target (px)
export const ALLOWED_IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export const ALLOWED_TEXT_EXTENSIONS = [
  'txt', 'md', 'markdown', 'csv', 'json', 'jsonl', 'tsv', 'log',
  'js', 'ts', 'tsx', 'jsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'h',
  'cpp', 'cs', 'css', 'html', 'xml', 'yml', 'yaml', 'toml', 'ini', 'sh',
] as const;
// Never accept executables / installers / disk images, even renamed.
export const BLOCKED_EXTENSIONS = [
  'exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'apk', 'bat', 'cmd', 'com',
  'scr', 'ps1', 'vbs', 'jar', 'dll', 'sys', 'iso', 'img',
] as const;
// Single source of truth for client length checks (useChat, ChatInput, ClarifyingCard).
export const MAX_MESSAGE_LENGTH = 4000;

// Custom Instructions: optional free-form system-prompt add-on
// (e.g. tone, language, verbosity). Local-only, max 1000 chars.
export const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 1000;
export const customInstructionsSchema = z
  .string()
  .max(
    MAX_CUSTOM_INSTRUCTIONS_LENGTH,
    `Custom instructions must be under ${MAX_CUSTOM_INSTRUCTIONS_LENGTH} characters.`
  )
  .refine((v) => !/<script|javascript\s*:|on\w+\s*=/i.test(v), {
    message: 'Custom instructions contain unsupported content. Remove HTML/scripts and try again.',
  });

// Browser localStorage keys — single source of truth for device-local data:
// - `openrouterKey`: OpenRouter API key (local-only, sent only to OpenRouter).
// - `openrouterModel`: selected OpenRouter model id (see lib/openRouterModels.ts).
// - `conversations`: chat history (local-only, never Supabase).
// - `profileCache`: non-sensitive profile (name/age/email) for UI only.
// - `customInstructions`: free-form system-prompt add-on (local-only).
export const STORAGE_KEYS = {
  openrouterKey: 'understoodchat:openrouter_key',
  openrouterModel: 'understoodchat:openrouter_model',
  conversations: 'understoodchat:conversations',
  profileCache: 'understoodchat:profile_cache',
  customInstructions: 'understoodchat:custom_instructions',
} as const;
