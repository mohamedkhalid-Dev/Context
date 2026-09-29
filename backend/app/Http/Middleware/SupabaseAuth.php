<?php

namespace App\Http\Middleware;

use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;

class SupabaseAuth
{
    public function handle(Request $request, Closure $next)
    {
        $header = $request->header('Authorization', '');
        if (! str_starts_with($header, 'Bearer ')) {
            return response()->json(['message' => 'Unauthenticated. Please log in again.'], 401);
        }

        $token = substr($header, 7);

        try {
            // Fail fast if secret missing (never use env() at runtime under config:cache).
            $secret = config('services.supabase.jwt_secret');
            if (empty($secret)) {
                \Illuminate\Support\Facades\Log::error('SUPABASE_JWT_SECRET missing');
                return response()->json(['message' => 'Authentication misconfigured.'], 500);
            }
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            $claims = (array) $decoded;
            // Defense-in-depth: verify iss/aud when configured.
            $expectedIss = config('services.supabase.issuer');
            if ($expectedIss && isset($claims['iss']) && $claims['iss'] !== $expectedIss) {
                return response()->json(['message' => 'Unauthenticated. Please log in again.'], 401);
            }
            if (isset($claims['aud']) && $claims['aud'] !== 'authenticated') {
                return response()->json(['message' => 'Unauthenticated. Please log in again.'], 401);
            }
            $request->attributes->set('supabase_user', $claims);
        } catch (\Firebase\JWT\ExpiredException $e) {
            return response()->json(['message' => 'Session expired. Please log in again.'], 401);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Unauthenticated. Please log in again.'], 401);
        }

        return $next($request);
    }
}
