<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// All API routes are versioned under /api/v1 (see PROMPT.md §5).
Route::prefix('v1')->group(function () {
    // Public health check — used by the Angular dev proxy to prove same-origin wiring.
    Route::get('/health', fn () => [
        'ok' => true,
        'app' => config('app.name'),
        'time' => now()->toIso8601String(),
    ]);

    // Returns the authenticated user (Sanctum SPA session). Foundation for milestone 2 auth.
    Route::get('/me', fn (Request $request) => $request->user())
        ->middleware('auth:sanctum');
});
