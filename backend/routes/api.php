<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ProfileController;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::middleware(['supabase.auth', 'throttle:60,1'])->group(function () {
    Route::post('/chat', [ChatController::class, 'send']);
    Route::post('/profile/key', [ProfileController::class, 'store']);
});
