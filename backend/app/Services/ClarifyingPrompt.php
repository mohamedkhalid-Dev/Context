<?php

namespace App\Services;

/**
 * Clarifying-first system prompt (Step 4 — the differentiator).
 *
 * Mirrors `frontend/src/lib/clarifyingEngine.ts` 6-rule prompt so both
 * layers enforce the same behaviour: parse intent, detect missing nuances,
 * ask max 2-3 specific follow-ups, then answer with a "What I understood:"
 * summary. Rule 6 prohibits image generation (text-only). Never expose or
 * log the OpenRouter key here.
 */
class ClarifyingPrompt
{
    /** Text-only assistant: image generation is prohibited. */
    public const IMAGE_GENERATION_UNAVAILABLE_MESSAGE =
        'Image generation is unavailable in Understood Chat. This service is not supported — I can help with text answers, describe images you upload, or explain visuals instead.';

    /**
     * Local guard for image-generation requests. Mirrors the frontend
     * `isImageGenerationRequest()` so the Laravel fallback short-circuits
     * before any OpenRouter call. Does not match image understanding
     * ("what do you see in this image?").
     */
    public function isImageGenerationRequest(?string $content): bool
    {
        if (! is_string($content) || trim($content) === '') return false;
        $patterns = [
            '/\b(generate|generating|generated|create|creating|created|make|making|draw|drawing|drew|paint|painting|render|rendering|produce|producing|design|designing)\b.{0,60}\b(images?|pictures?|photos?|illustrations?|artworks?|drawings?|paintings?|logos?|avatars?|posters?|banners?|icons?|memes?|comics?|wallpapers?|portraits?|sketches?|graphics?)\b/i',
            '/\b(images?|pictures?|photos?)\s*(generation|generator)\b/i',
            '/\b(draw|paint|sketch)\s+me\b/i',
            '/\b(give|show)\s+me\s+(an?\s+)?(image|picture|photo|illustration|logo|avatar|poster)\b/i',
            '/\bdall[-\s]?e|midjourney|stable\s+diffusion|\bimagen\b|firefly\s*image/i',
        ];
        foreach ($patterns as $re) {
            if (preg_match($re, $content) === 1) return true;
        }
        return false;
    }

    public function systemPrompt(?array $profile = null): string
    {
        $personal = '';
        $name = $profile['name'] ?? $profile['display_name'] ?? null;
        $age = $profile['age'] ?? null;
        if ($name || $age) {
            $personal = ' The user\'s name is ' . ($name ?? 'unknown')
                . ($age ? ', age ' . (int) $age : '') . '. Personalize briefly when natural.';
        }
        $custom = '';
        $rawCustom = $profile['custom_instructions'] ?? $profile['customInstructions'] ?? null;
        if (is_string($rawCustom) && trim($rawCustom) !== '') {
            $clean = mb_substr(trim(strip_tags($rawCustom)), 0, 1000);
            $custom = ' Custom instructions from the user (highest priority after safety): """' . $clean . '"""';
        }

        return 'You are Understood Chat, a clarifying-first assistant.' . $personal . ' '
            . 'Rules: (1) Parse intent: what the user wants + context given. '
            . '(2) Detect missing nuances: who/what/when/where/constraints/budget/skill-level/goal. '
            . 'If anything load-bearing is missing, do not guess. '
            . 'Example: vague "help me with diet" is missing age, goal (lose/maintain/gain), '
            . 'dietary restrictions, budget — ask those specifics first. '
            . '(3) Ask max 2-3 specific follow-up questions per turn, referencing the user\'s actual input. '
            . 'Never say generic "tell me more" or "can you elaborate?". '
            . '(4) Only after details arrive or user says "just answer", reply with '
            . '"What I understood:" bullet summary + precise answer + exactly one next step. '
            . 'If the request is already fully specified, answer directly with a 1-line understanding summary first. '
            . '(5) Professional, concise tone. No emojis. '
            . '(6) Image generation is prohibited: you are text-only and cannot generate, create, or render images. '
            . 'If the user requests image generation, reply exactly with: "' . self::IMAGE_GENERATION_UNAVAILABLE_MESSAGE . '" '
            . 'Do not ask clarifying questions for image requests.' . $custom;
    }

    public function withSystemPrompt(array $messages, ?array $profile = null): array
    {
        // Avoid duplicate system prompts (prevents prompt injection stacking)
        foreach ($messages as $m) {
            if (($m['role'] ?? '') === 'system') return $this->sanitizeMessages($messages);
        }

        return array_merge(
            [['role' => 'system', 'content' => $this->systemPrompt($profile)]],
            $this->sanitizeMessages($messages)
        );
    }

    /**
     * Strip HTML tags + trim + enforce length. Do NOT HTML-escape (e())
     * here — that would corrupt the prompt sent to OpenRouter. Escaping
     * belongs at render time (Blade e() / frontend sanitizer).
     */
    protected function sanitizeMessages(array $messages): array
    {
        // Defense-in-depth: drop any client-supplied system role, keep only user/assistant.
        $filtered = array_values(array_filter($messages, fn ($m) => in_array($m['role'] ?? '', ['user', 'assistant'], true)));
        return array_map(fn ($m) => [
            'role' => $m['role'],
            'content' => mb_substr(trim(strip_tags($m['content'] ?? '')), 0, 4000),
        ], $filtered);
    }
}
