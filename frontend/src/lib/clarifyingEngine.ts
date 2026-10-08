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
  // Merged double-questions sometimes lose the first "?" in streamed text
  // (e.g. "…fun build — and roughly what's your budget"). Catch the
  // tell-tale second-question markers even without a "?".
  if (/roughly\s+what|what's\s+your\s+budget/i.test(content)) return 'clarifying';
  if (/[—–]\s*and\s+\w| - and \w| \+ /.test(content) && /\b(what|which|how|should|is|are|do|can)\b/i.test(content)) {
    return 'clarifying';
  }
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
 * Extracts clarifying questions from an assistant reply (same signature as
 * before). Powers the ClarifyingCard quick-reply chips. Handles numbered /
 * bulleted / multi-line lists, and fans out merged double-questions joined
 * by a dash + "and", " + ", or a trailing "and roughly…" second question.
 * Returns up to 4 so a merged split never drops a real question.
 */
export function extractClarifyingQuestions(content: string): string[] {
  return splitIntoQuestions(content).slice(0, 4);
}

export type ClarifyingItem = { question: string; shortLabel: string; options: string[] };

/**
 * Rich variant of extractClarifyingQuestions: each question plus a compact
 * chip label and up to 5 short options parsed from its option zone
 * (em/en-dash, colon, or parenthetical list). Capped at 3 items per turn.
 */
export function extractClarifyingItems(content: string): ClarifyingItem[] {
  return splitIntoQuestions(content)
    .slice(0, 3)
    .map((question) => ({
      question,
      shortLabel: toShortLabel(question),
      options: extractOptions(question),
    }));
}

/**
 * Splits raw assistant text into clean "…?" questions. Breaks numbered lists
 * onto their own lines, splits on "?", then fans out merged double-questions
 * and strips list markers. Pure, no deps.
 */
function splitIntoQuestions(content: string): string[] {
  if (!content || typeof content !== 'string') return [];
  const withBreaks = content
    .replace(/(\d+[.)]\s+)/g, '\n$1')
    .replace(/•/g, '\n- ');
  const parts = withBreaks
    .split('?')
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const subs = splitMerged(part);
    for (const sub of subs) {
      const lines = sub
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const last = lines[lines.length - 1] !== undefined ? lines[lines.length - 1] : sub;
      const cleaned = last.replace(/^[-*•\d.)\s]+/, '').trim();
      if (!cleaned || cleaned.length <= 2) continue;
      // Capitalize fragments left over from a mid-sentence split
      // ("roughly what's…" -> "Roughly what's…").
      const titled = /^[a-z]/.test(cleaned)
        ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
        : cleaned;
      out.push(titled + '?');
    }
  }
  return out;
}

/** Fans out one "?"-terminated chunk that actually holds two questions. */
function splitMerged(chunk: string): string[] {
  // "…fun build — and roughly what's your budget" -> two halves.
  const dashAnd = chunk.split(/\s*[—–]\s*and\s+|\s+-\s+and\s+/i);
  if (dashAnd.length > 1) {
    const subs: string[] = [];
    for (const half of dashAnd) {
      const inner = splitMerged(half.trim());
      for (const s of inner) if (s) subs.push(s);
    }
    return subs;
  }
  const plus = chunk.split(/\s\+\s/);
  if (plus.length > 1) {
    const trimmed = plus.map((p) => p.trim());
    if (trimmed.every((p) => p.length > 3)) return trimmed;
  }
  // "…gift, or just a fun build and roughly what's your budget" (no dash).
  const m = chunk.match(/^([\s\S]*?)\b(and\s+roughly\s+[\s\S]*)$/i);
  if (m && m[1].trim().length > 10) return [m[1].trim(), m[2].trim()];
  return [chunk.trim()];
}

/** Compact chip label: cut before the option zone when it starts early, else ~48 chars at a word boundary + "?". */
function toShortLabel(question: string): string {
  const base = question.replace(/\?+\s*$/, '').trim();
  const zoneAt = base.search(/\s[—–:]\s/);
  if (zoneAt > 10 && zoneAt < 48) return base.slice(0, zoneAt).trim() + '?';
  const commaAt = base.indexOf(',');
  if (commaAt > 20 && commaAt < 48) return base.slice(0, commaAt).trim() + '?';
  if (base.length <= 48) return base + '?';
  const cut = base.slice(0, 48);
  const space = cut.lastIndexOf(' ');
  return (space > 20 ? cut.slice(0, space) : cut) + '?';
}

/**
 * Parses clickable options from one question. The option zone is the text
 * after the last em/en-dash or colon (else the whole question). Comma /
 * "or" separated tokens become options; a "(…)" group holding commas or
 * slashes is split into its own options ("(motor/battery, remote control)"
 * -> motor, battery, remote control), while a qualifier group is compressed
 * ("(3D-printed or kit parts)" -> "(3D-printed/kit)") and attached to its
 * head noun ("plastic (3D-printed/kit)"). Capped at 5, each <= 28 chars.
 */
function extractOptions(question: string): string[] {
  if (!question) return [];
  const noQ = question.replace(/\?+\s*$/, '').trim();
  const zoneMatch = noQ.match(/.*[—–:]\s*([\s\S]+)$/);
  const zone = (zoneMatch ? zoneMatch[1] : noQ).trim();
  const outer = zone.replace(/\([^)]*\)/g, ' ').trim();

  const tokens: string[] = [];
  const outerParts = outer.split(/\s*,\s*|\s+or\s+/i);
  for (const t of outerParts) {
    const c = cleanOption(t, true);
    if (c) tokens.push(c);
  }

  const parenRe = /\(([^)]+)\)/g;
  let pm: RegExpExecArray | null;
  while ((pm = parenRe.exec(zone)) !== null) {
    const inner = pm[1];
    if (/[,/]/.test(inner)) {
      pushInnerOptions([inner], tokens);
    } else {
      const qualifier = inner
        .replace(/\s+or\s+/gi, '/')
        .replace(/\bkit\s+parts\b/gi, 'kit')
        .replace(/\s+parts?\b/gi, '')
        .trim();
      const headMatch = zone.slice(0, pm.index).match(/([A-Za-z0-9][\w-]*)\s*$/);
      const head = headMatch ? cleanOption(headMatch[1], true) : '';
      const idx = head ? indexOfLower(tokens, head) : -1;
      if (head && idx >= 0 && qualifier) {
        tokens[idx] = truncateOption(head + ' (' + qualifier + ')');
      } else if (qualifier) {
        tokens.push(truncateOption(qualifier));
      }
    }
  }

  const seen: string[] = [];
  const out: string[] = [];
  for (const t of tokens) {
    if (t.length < 2) continue;
    if (indexOfLower(seen, t) >= 0) continue;
    seen.push(t);
    out.push(t);
    if (out.length >= 5) break;
  }
  return out;
}

/** Splits one "(a/b, c)" inner group into flat options. */
function pushInnerOptions(inners: string[], out: string[]): void {
  for (const inner of inners) {
    const pieces = inner.split(/\s*,\s*|\s+or\s+|\s*\/\s*/i);
    for (const piece of pieces) {
      const c = cleanOption(piece, false);
      if (c) out.push(c);
    }
  }
}

/** Strips interrogative prefixes, articles, leading "or", trailing "etc." / punctuation. */
function cleanOption(raw: string, stripPrefix: boolean): string {
  let t = raw.trim().replace(/^[•\-*]+\s*/, '');
  t = t.replace(/\betc\.?$/i, '').replace(/[?.!;:\s]+$/g, '').trim();
  t = t.replace(/^(or|and)\s+/i, '').trim();
  if (stripPrefix) {
    t = t
      .replace(/^(should it be|is this for|is it|are they|do you want( to use)?|what about)\s+/i, '')
      .replace(/^(a|an|the)\s+/i, '')
      .trim();
  } else {
    t = t.replace(/^(a|an|the)\s+/i, '').trim();
  }
  t = t.replace(/\s+/g, ' ');
  if (!t || /^[-—–]+$/.test(t)) return '';
  return truncateOption(t);
}

function truncateOption(t: string): string {
  const s = t.trim();
  if (s.length <= 28) return s;
  const cut = s.slice(0, 28);
  const space = cut.lastIndexOf(' ');
  return (space > 10 ? cut.slice(0, space) : cut).trim();
}

function indexOfLower(arr: string[], v: string): number {
  const needle = v.toLowerCase();
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].toLowerCase() === needle) return i;
  }
  return -1;
}
