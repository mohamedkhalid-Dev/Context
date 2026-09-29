<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * Server-side OpenRouter proxy (Step 4).
 * The per-user key is stored encrypted in `profiles.openrouter_key_enc`
 * (Laravel Crypt via ProfileController) and decrypted per request by
 * keyForUser(). Never log the raw key — it travels only in the
 * Authorization header.
 */
class OpenRouterService
{
    public function keyForUser(?string $userId): ?string
    {
        if (! $userId) return null;
        try {
            $enc = DB::table('profiles')->where('user_id', $userId)->value('openrouter_key_enc');
            if (! is_string($enc) || $enc === '') return null;
            return Crypt::decryptString($enc);
        } catch (\Exception) {
            // Never log the key or ciphertext — fail closed.
            return null;
        }
    }

    public function chat(string $apiKey, array $messages, ?string $model = null): string
    {
        // Never log $apiKey. It travels only in the Authorization header.
        $baseUrl = config('services.openrouter.base_url', 'https://openrouter.ai/api/v1');
        $model = $model ?: config('services.openrouter.model', 'openai/gpt-4o-mini');
        $timeout = (int) config('services.openrouter.timeout', 60);

        $res = Http::timeout($timeout)
            ->withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'HTTP-Referer' => config('app.url', 'http://localhost:3000'),
                'X-Title' => 'Understood Chat',
            ])
            ->post(rtrim($baseUrl, '/') . '/chat/completions', [
                'model' => $model,
                'messages' => $messages,
            ]);

        if (! $res->successful()) {
            // Do not include $apiKey in exceptions (leak protection).
            // Include the model id + provider snippet so the frontend can
            // tell the user explicitly which model failed and to switch.
            $status = $res->status();
            $snippet = mb_substr(trim(strip_tags((string) $res->body())), 0, 300);
            throw new \Exception("OpenRouter error {$status} for model {$model}: {$snippet}");
        }

        $content = $res->json('choices.0.message.content');
        if (! is_string($content) || trim($content) === '') {
            $errMsg = $res->json('error.message');
            $detail = is_string($errMsg) && $errMsg !== '' ? mb_substr($errMsg, 0, 200) : 'empty response';
            throw new \Exception("OpenRouter empty response for model {$model}: {$detail}");
        }

        return $content;
    }
}
