<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

/**
 * Secure file-upload template — NOT wired to any route.
 *
 * Guardrails for any future upload endpoint (e.g. POST /api/attachments):
 * - Extension whitelist + MIME check (never trust client filename/mime alone).
 * - Size limit enforced server-side.
 * - Filename randomization (hash + safe extension, no user input in path).
 * - Storage outside webroot (storage/app/uploads, never public/).
 * - No execution: no php/svg/html allowed, no mime sniffing, nosniff headers.
 *
 * Usage (future controller):
 *   $validated = $request->validated();
 *   $file = $request->file('file');
 *   $ext = strtolower($file->getClientOriginalExtension());
 *   $name = Str::random(40) . '.' . $ext;
 *   $path = $file->storeAs('uploads', $name); // storage/app/uploads (private)
 *   return response()->json(['path' => $path]);
 */
class FileUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Keep the same defense-in-depth as ChatRequest: middleware must
        // have set supabase_user.
        return $this->attributes->has('supabase_user');
    }

    public function rules(): array
    {
        return [
            // 5 MB max, whitelist only. No php/phtml/phar/svg/html/htm —
            // those must never be stored or served (execution risk).
            // `mimes` checks extension + server-sniffed MIME, `mimetypes`
            // double-checks the content type.
            'file' => [
                'required',
                'file',
                'max:5120', // kilobytes = 5 MB
                'mimes:png,jpg,jpeg,webp,gif,txt,md,csv,json,log,pdf',
                'mimetypes:image/png,image/jpeg,image/webp,image/gif,text/plain,text/markdown,text/csv,application/json,application/pdf',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.max' => 'File is too large (max 5 MB).',
            'file.mimes' => 'File type not accepted. Images, text, and PDF only — executables are blocked.',
            'file.mimetypes' => 'File content does not match its type.',
        ];
    }

    /**
     * Generate a safe random filename. Never use getClientOriginalName()
     * for storage — it is attacker-controlled (path traversal, double
     * extensions like shell.php.png, null bytes).
     */
    public static function randomName(string $extension): string
    {
        $ext = strtolower(trim($extension));
        $allowed = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'txt', 'md', 'csv', 'json', 'log', 'pdf'];
        if (! in_array($ext, $allowed, true)) {
            abort(422, 'File type not accepted.');
        }

        return Str::random(40) . '.' . $ext;
    }
}
