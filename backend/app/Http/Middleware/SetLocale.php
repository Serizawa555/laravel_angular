<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets the app locale from Accept-Language (Angular sends it from the URL locale).
 * Public responses are then returned in that locale (PROMPT §5).
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $supported = config('shop.locales');
        $locale = $request->getPreferredLanguage($supported) ?? config('shop.default_locale');

        app()->setLocale($locale);

        return $next($request);
    }
}
