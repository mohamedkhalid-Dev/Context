<?php

// Session cookie flags — Secure + HttpOnly + SameSite=lax.
// Supabase Auth cookies are managed by @supabase/ssr on the frontend (see
// frontend/src/middleware.ts); these Laravel flags cover the OPTIONAL
// backend fallback so both layers agree.
return [
    'driver' => env('SESSION_DRIVER', 'cookie'),
    'secure' => env('SESSION_SECURE_COOKIE', true),
    'http_only' => env('SESSION_HTTP_ONLY', true),
    'same_site' => env('SESSION_SAME_SITE', 'lax'),
];
