<?php

// CORS — restrictive by default. Only the configured frontend origin may
// call the API with credentials. Never use '*' with supports_credentials=true.
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET', 'POST'],
    // Single frontend origin from FRONTEND_URL env (no trailing slash).
    // Production: https://<app>.vercel.app or custom domain.
    // Local dev override: http://localhost:3000.
    'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:3000')],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    'exposed_headers' => [],
    'max_age' => 86400,
    // Required for Supabase JWT in Authorization header from browser.
    'supports_credentials' => true,
];
