import type { Attachment, Message } from './types';
import { attachmentContextBlock } from './attachments';

export type ClarifyingProfile = {
  name?: string;
  display_name?: string;
  age?: number;
  /** Optional free-form user preferences, appended to the system prompt. */
  customInstructions?: string | null;
};

/**
 * Builds the clarifying-first system prompt.
 *
 * The model must fully understand nuances before answering:
 *  1. Parse the user's intent (what they want + context given).
 *  2. Detect missing nuances: who / what / when / where / constraints /
 *     budget / skill-level / goal.
 *  3. Ask max 2-3 specific follow-up questions per turn. Never ask generic
 *     "tell me more" — every question must reference the user's actual input.
 *  4. Only after the user confirms or provides details, respond with a
 *     "What I understood:" summary + precise answer + 1 next step.
 *  5. Keep a concise, professional tone. No emojis.
 *  6. Image generation is prohibited (text-only assistant).
 */
export const IMAGE_GENERATION_UNAVAILABLE_MESSAGE =
  'Image generation is unavailable in Context. This service is not supported — I can help with text answers, describe images you upload, or explain visuals instead.';

/**
 * Local guard for image-generation requests. Runs before any OpenRouter
 * call so users get an instant, cost-free unavailable message.
 * Matches generation verbs + visual nouns (generate/create/make/draw an
 * image...), "draw me ...", "image generator", and known image-model names.
 * Does NOT match image understanding ("what do you see in this image?",
 * "describe my upload") — those use describe/explain/see verbs.
 */
export function isImageGenerationRequest(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const patterns = [
    /\b(generate|generating|generated|create|creating|created|make|making|draw|drawing|drew|paint|painting|render|rendering|produce|producing|design|designing)\b.{0,60}\b(images?|pictures?|photos?|illustrations?|artworks?|drawings?|paintings?|logos?|avatars?|posters?|banners?|icons?|memes?|comics?|wallpapers?|portraits?|sketches?|graphics?)\b/i,
    /\b(images?|pictures?|photos?)\s*(generation|generator)\b/i,
    /\b(draw|paint|sketch)\s+me\b/i,
    /\b(give|show)\s+me\s+(an?\s+)?(image|picture|photo|illustration|logo|avatar|poster)\b/i,
    /\bdall[-\s]?e|midjourney|stable\s+diffusion|\bimagen\b|firefly\s*image/i,
  ];
  return patterns.some((re) => re.test(content));
}

export function buildClarifyingSystemPrompt(profile?: ClarifyingProfile, hasAttachments?: boolean) {
  const displayName = profile?.display_name ?? profile?.name;
  const personal =
    displayName || profile?.age
      ? `The user's name is ${displayName ?? 'unknown'}${profile?.age ? `, age ${profile.age}` : ''}. Personalize briefly when natural.`
      : '';
  const custom = (profile?.customInstructions ?? '').trim().slice(0, 1000);
  const customBlock = custom
    ? `\nCustom instructions from the user (highest priority after safety, must be followed unless they conflict with the rules above):\n"""${custom}"""`
    : '';
  const attachmentsBlock = hasAttachments
    ? `\nThe user may attach images and files: describe what you see in images specifically (don't claim to see what's not there), use attached text as context for their request, and mention attached files by name.`
    : '';
  return `You are Context, a clarifying-first assistant. ${personal}
Rules:
1. Parse intent: identify what the user wants and what context they already gave.
2. Detect missing nuances: who / what / when / where / constraints / budget / skill-level / goal. If anything load-bearing is missing, do not guess.
3. Ask max 2-3 specific follow-up questions per turn, each referencing the user's actual input. Never ask generic "tell me more" or "can you elaborate?".
4. Only after the user confirms or provides the requested details (or says "just answer"), respond with: "What I understood:" (bullet summary) + a precise answer + exactly one suggested next step.
5. Keep a concise, professional tone. No emojis. If the request is already fully specified, answer directly with a 1-line understanding summary first.
6. Image generation is prohibited: you are text-only and cannot generate, create, or render images. If the user requests image generation, reply exactly with: "${IMAGE_GENERATION_UNAVAILABLE_MESSAGE}" Do not ask clarifying questions for image requests.
Example: vague "help me with diet" is missing age, goal (lose/maintain/gain), dietary restrictions, budget — ask those specifics first, never answer generically.${customBlock}${attachmentsBlock}`;
}

export function detectStage(content: string): Message['stage'] {
  if (!content) return 'confirmed';
  // Answered first: final answers contain the summary marker even when
  // they end with a single next-step question.
  if (/what\s+i\s+understood:/i.test(content)) return 'answered';
  // Any remaining question mark means the assistant is still clarifying.
  // Vague prompts like "help me with diet" must hit this branch (age/goal/restrictions).
  if (content.includes('?')) return 'clarifying';
  return 'confirmed';
}

/** A chat message bound for OpenRouter. User messages may carry attachments:
 *  images become vision `image_url` parts, other files become context text. */
export type OutgoingMessage = Pick<Message, 'role' | 'content'> & {
  attachments?: Attachment[];
};

type OpenRouterPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

function toOutbound(message: OutgoingMessage): { role: string; content: string | OpenRouterPart[] } {
  const attachments = message.attachments ?? [];
  const images = attachments.filter((a) => a.kind === 'image' && a.dataUrl);
  const contextBlocks = attachments
    .filter((a) => a.kind !== 'image')
    .map((a) => attachmentContextBlock(a));
  const text = [message.content, ...contextBlocks].filter(Boolean).join('\n\n');
  if (message.role !== 'user' || images.length === 0) {
    return { role: message.role, content: text };
  }
  const parts: OpenRouterPart[] = [{ type: 'text', text: text || 'What do you see in these images?' }];
  for (const image of images) {
    parts.push({ type: 'image_url', image_url: { url: image.dataUrl as string } });
  }
  return { role: message.role, content: parts };
}

export function toOpenRouterMessages(messages: OutgoingMessage[], profile?: ClarifyingProfile) {
  const hasAttachments = messages.some(
    (m) => m.role === 'user' && (m.attachments ?? []).length > 0
  );
  return [
    { role: 'system', content: buildClarifyingSystemPrompt(profile, hasAttachments) },
    ...messages.map(toOutbound),
  ];
}

/**
 * Extracts up to 3 clarifying questions from an assistant reply.
 * Powers the ClarifyingCard quick-reply chips. Handles plain sentences as
 * well as numbered / bulleted question lists.
 */
export function extractClarifyingQuestions(content: string): string[] {
  if (!content) return [];
  // Break numbered lists ("1. ...", "2) ...") onto their own lines first.
  const withBreaks = content.replace(/(\d+[.)]\s+)/g, '\n$1');
  const parts = withBreaks
    .split('?')
    .map((s) => s.trim())
    .filter(Boolean);
  const questions = parts
    .map((part) => {
      const lines = part
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const last = lines[lines.length - 1] ?? part;
      const cleaned = last.replace(/^[-*\u2022\d.)\s]+/, '').trim();
      return cleaned ? `${cleaned}?` : '';
    })
    .filter((q) => q.length > 4)
    .slice(0, 3);
  return questions;
}
