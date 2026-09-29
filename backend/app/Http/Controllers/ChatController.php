<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChatRequest;
use App\Services\OpenRouterService;
use App\Services\ClarifyingPrompt;

/**
 * Step 4 primary path: frontend POSTs { messages, conversation_id } with a
 * Supabase JWT → SupabaseAuth verifies → per-user OpenRouter key is
 * decrypted server-side (never exposed) → ClarifyingPrompt injects the
 * system prompt → OpenRouterService proxies to OpenRouter.
 * Conversation history persistence lives in Supabase (conversations/messages).
 */
class ChatController extends Controller
{
    public function __construct(
        protected OpenRouterService $openRouter,
        protected ClarifyingPrompt $prompt
    ) {}

    public function send(ChatRequest $request)
    {
        $user = $request->attributes->get('supabase_user');
        $validated = $request->validated();
        $userId = $user['sub'] ?? $user['id'] ?? null;
        if (! $userId) {
            abort(401, 'Unauthenticated.');
        }

        // Rule: image generation is prohibited (text-only assistant).
        // Short-circuit with a clear unavailable message — no OpenRouter cost.
        $lastUserContent = null;
        foreach (array_reverse($validated['messages'] ?? []) as $m) {
            if (($m['role'] ?? '') === 'user') {
                $lastUserContent = $m['content'] ?? null;
                break;
            }
        }
        if ($this->prompt->isImageGenerationRequest(is_string($lastUserContent) ? $lastUserContent : null)) {
            return response()->json(['reply' => ClarifyingPrompt::IMAGE_GENERATION_UNAVAILABLE_MESSAGE]);
        }

        // Retrieve decrypted OpenRouter key for this user (stored via ProfileController, Crypt-encrypted)
        $apiKey = $this->openRouter->keyForUser($userId);
        if (! $apiKey) {
            return response()->json([
                'message' => 'No OpenRouter API key found. Please add one in Settings → API key.',
            ], 402);
        }

        // Optional personalization (name/age/custom_instructions) — never the key.
        $profile = null;
        try {
            $row = \Illuminate\Support\Facades\DB::table('profiles')->where('user_id', $userId)->first();
            if ($row) $profile = ['name' => $row->name ?? null, 'age' => $row->age ?? null];
        } catch (\Exception) {
            $profile = null;
        }
        // Custom Instructions arrive device-local from the frontend (validated, max 1000).
        $custom = $validated['custom_instructions'] ?? null;
        if (is_string($custom) && trim($custom) !== '') {
            $profile = array_merge($profile ?? [], ['custom_instructions' => mb_substr(trim(strip_tags($custom)), 0, 1000)]);
        }
        // Optional per-request model override (validated in ChatRequest).
        $model = $validated['model'] ?? null;

        $messages = $this->prompt->withSystemPrompt($validated['messages'], $profile);

        try {
            $reply = $this->openRouter->chat($apiKey, $messages, is_string($model) ? $model : null);
        } catch (\Exception $e) {
            $msg = $e->getMessage();
            $modelLabel = is_string($model) && $model !== '' ? "The model “{$model}”" : 'The selected model';
            if (str_contains($msg, '401') || str_contains($msg, '403')) {
                return response()->json(['message' => 'Invalid OpenRouter key. Check it in Settings → API key and try again.'], 402);
            }
            if (str_contains($msg, '402') || stripos($msg, 'credits') !== false) {
                return response()->json(['message' => 'OpenRouter refused the request: out of credits (402). Top up at openrouter.ai/credits or switch to a free model. Please switch models using the Model picker and try again.'], 402);
            }
            if (str_contains($msg, '404') || stripos($msg, 'no endpoints') !== false || stripos($msg, 'no available provider') !== false) {
                return response()->json(['message' => "{$modelLabel} is unavailable (no active endpoints). It may have been removed or has no healthy providers — common with free models. Please switch models using the Model picker and try again."], 502);
            }
            if (str_contains($msg, '429') || stripos($msg, 'rate') !== false) {
                return response()->json(['message' => "{$modelLabel} is rate-limited (429). Free models are heavily rate-limited. Wait 30s and retry, or switch models using the Model picker."], 429);
            }
            if (stripos($msg, 'empty response') !== false) {
                return response()->json(['message' => "{$modelLabel} returned an empty response. Free models do this when overloaded. Please switch models using the Model picker and try again."], 502);
            }
            if (str_contains($msg, '500') || str_contains($msg, '502') || str_contains($msg, '503') || stripos($msg, 'overload') !== false || stripos($msg, 'provider') !== false) {
                return response()->json(['message' => "{$modelLabel} failed to respond (provider error). Free models go down often. Please switch models using the Model picker and try again."], 502);
            }
            return response()->json(['message' => "{$modelLabel} failed to respond. Please switch models using the Model picker and try again."], 502);
        }

        return response()->json(['reply' => $reply]);
    }
}
