// Local-first schema:
// - Supabase `public.profiles` stores ONLY (user_id uuid PK FK auth.users,
//   name text, age int 13-120, email text nullable, onboarding_complete bool,
//   created_at, updated_at). No API keys, no chat history.
// - OpenRouter key + conversation history live ONLY in browser localStorage
//   (see lib/storage.ts: `understoodchat:openrouter_key`,
//   `understoodchat:conversations`).

export type Profile = {
  user_id?: string;
  id?: string;
  name?: string;
  // Alias kept for compat with in-flight clarifying code that used display_name.
  display_name?: string;
  age: number;
  email?: string | null;
  onboarding_complete?: boolean;
};

/** Local-only conversation — history stays on device (see lib/storage.ts). */
export type Conversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
};

/** Local-only message. stage: clarifying (asking) | confirmed (interim) | answered (final + "What I understood:" summary). */
export type Message = {
  id: string;
  conversation_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  stage?: 'clarifying' | 'confirmed' | 'answered';
  created_at?: string;
  /** User-attached images/files. Local-only, never uploaded anywhere except
   *  images (as data URLs) sent to OpenRouter with the chat request. */
  attachments?: Attachment[];
};

/** A file attached to a user message. Images carry a downscaled `dataUrl`
 *  (vision input + thumbnail). Text files carry truncated `textContent`
 *  (inlined into the prompt). Other files carry metadata only. */
export type AttachmentKind = 'image' | 'text' | 'file';

export type Attachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: AttachmentKind;
  /** Downscaled image payload (data URL). Present for `image` kind only. */
  dataUrl?: string;
  /** Extracted plain text (truncated). Present for `text` kind only. */
  textContent?: string;
};
