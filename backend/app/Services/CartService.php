<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;

/**
 * Resolves "the current cart": the user's cart when logged in, otherwise a guest cart keyed by a
 * long-lived cookie. On login the guest cart is merged into the user's (PROMPT §7.5).
 */
class CartService
{
    private const COOKIE = 'cart_token';

    private const COOKIE_DAYS = 60 * 24 * 30; // 30 days (minutes)

    public function resolve(Request $request): Cart
    {
        if ($user = $request->user()) {
            return Cart::firstOrCreate(['user_id' => $user->id]);
        }

        $token = $request->cookie(self::COOKIE);
        if ($token && $cart = Cart::where('guest_token', $token)->first()) {
            return $cart;
        }

        $token = Str::random(40);
        Cookie::queue(self::COOKIE, $token, self::COOKIE_DAYS);

        return Cart::create(['guest_token' => $token]);
    }

    /** Merge the guest cart (by cookie) into the freshly-authenticated user's cart. */
    public function mergeOnLogin(Request $request, User $user): void
    {
        $token = $request->cookie(self::COOKIE);
        if (! $token) {
            return;
        }

        $guest = Cart::with('items')->where('guest_token', $token)->first();
        if (! $guest) {
            return;
        }

        $userCart = Cart::firstOrCreate(['user_id' => $user->id]);

        foreach ($guest->items as $item) {
            $existing = CartItem::firstOrNew([
                'cart_id' => $userCart->id,
                'variant_id' => $item->variant_id,
            ]);
            $existing->quantity = ($existing->quantity ?? 0) + $item->quantity;
            $existing->unit_price_snapshot = $item->unit_price_snapshot;
            $existing->save();
        }

        $guest->delete();
        Cookie::queue(Cookie::forget(self::COOKIE));
    }
}
