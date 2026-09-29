<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Defense-in-depth: middleware must have set supabase_user.
        return $this->attributes->has('supabase_user');
    }

    public function rules(): array
    {
        return [
            'messages' => 'required|array|min:1|max:50',
            // Never accept client-supplied system prompts (prompt-injection stacking).
            'messages.*.role' => 'required|in:user,assistant',
            'messages.*.content' => 'required|string|min:1|max:4000',
            'conversation_id' => 'nullable|uuid',
            // Optional device-local overrides from Settings.
            'model' => 'nullable|string|min:1|max:200',
            'custom_instructions' => 'nullable|string|min:1|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'messages.*.content.max' => 'Message is too long (max 4000 characters).',
        ];
    }
}
