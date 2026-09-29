<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/**
 * Step 3/4 — Onboarding key storage (spec-compliant):
 * Frontend POSTs { name, age, email, openrouter_api_key } here with a
 * Supabase JWT (SupabaseAuth + throttle). We validate `sk-or-` prefix,
 * encrypt via Crypt::encryptString (APP_KEY), and upsert to
 * `profiles.openrouter_key_enc`. Never log the raw key. The key is later
 * decrypted per-request by OpenRouterService::keyForUser() and never
 * exposed to the browser.
 */
class ProfileController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|min:2|max:100',
            'age' => 'required|integer|min:13|max:120',
            'email' => 'nullable|email|max:254',
            'openrouter_api_key' => 'nullable|string|min:10|max:500|starts_with:sk-or-',
        ]);

        $user = $request->attributes->get('supabase_user');
        $userId = $user['sub'] ?? $user['id'] ?? null;
        if (! $userId) {
            abort(401, 'Unauthenticated.');
        }

        // strip_tags + query bindings (no raw SQL) = XSS + SQL-injection safe.
        // e() is applied wherever the name is rendered in Blade/API output.
        // Never log $validated['openrouter_api_key'] — encrypt immediately.
        $row = [
            'user_id' => $userId,
            'name' => strip_tags($validated['name']),
            'age' => (int) $validated['age'],
            'email' => isset($validated['email']) ? strip_tags($validated['email']) : null,
            'onboarding_complete' => true,
        ];
        if (! empty($validated['openrouter_api_key'])) {
            $row['openrouter_key_enc'] = Crypt::encryptString($validated['openrouter_api_key']);
        }
        try {
            DB::table('profiles')->upsert($row, ['user_id']);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('profile store failed', ['user' => $userId]);
            return response()->json(['message' => 'Could not save profile. Try again.'], 500);
        }

        return response()->json(['ok' => true]);
    }
}
