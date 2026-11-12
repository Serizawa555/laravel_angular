<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

/**
 * Sanctum SPA (cookie) auth. The SPA first calls GET /sanctum/csrf-cookie, then these endpoints;
 * on success a session cookie authenticates subsequent /api requests (statefulApi middleware).
 */
class AuthController extends Controller
{
    public function __construct(private readonly CartService $carts) {}

    /** Register a shopper, log them in, return the user. */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->string('name'),
            'email' => $request->string('email'),
            'password' => Hash::make((string) $request->string('password')),
        ]);

        $user->assignRole('customer');

        $this->carts->mergeOnLogin($request, $user);
        Auth::login($user);
        $request->session()->regenerate();

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    /** Log in with email + password (throttled in LoginRequest). */
    public function login(LoginRequest $request): UserResource
    {
        $request->authenticate();

        /** @var User $user */
        $user = Auth::user();

        $this->carts->mergeOnLogin($request, $user);
        $request->session()->regenerate();

        return new UserResource($user);
    }

    /** Log out and invalidate the session. */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    }

    /** Current authenticated user + roles + permissions (for UI gating). */
    public function me(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        return new UserResource($user);
    }
}
