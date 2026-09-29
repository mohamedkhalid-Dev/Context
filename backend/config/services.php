<?php

return [
    'openrouter' => [
        'base_url' => env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
        'model' => env('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
        'timeout' => 60,
    ],
    'supabase' => [
        'jwt_secret' => env('SUPABASE_JWT_SECRET'),
        'url' => env('SUPABASE_URL'),
        // Issuer for HS256 JWTs: {SUPABASE_URL}/auth/v1
        'issuer' => env('SUPABASE_URL') ? rtrim(env('SUPABASE_URL'), '/') . '/auth/v1' : null,
    ],
];
