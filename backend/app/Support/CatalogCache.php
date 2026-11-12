<?php

declare(strict_types=1);

namespace App\Support;

use Closure;
use Illuminate\Support\Facades\Cache;

/**
 * Version-keyed cache for public catalog reads (PROMPT §10). A single `catalog:version` counter is
 * bumped whenever a product/variant/term changes, which instantly invalidates every derived key —
 * works on any cache store (no tag support required). Keys include the locale.
 */
class CatalogCache
{
    private const VERSION_KEY = 'catalog:version';

    private const TTL = 600; // seconds

    public function version(): int
    {
        return (int) Cache::get(self::VERSION_KEY, 1);
    }

    /** Invalidate everything by bumping the version. */
    public function bump(): void
    {
        Cache::forever(self::VERSION_KEY, $this->version() + 1);
    }

    /** @param Closure(): mixed $callback */
    public function remember(string $name, Closure $callback): mixed
    {
        $key = 'catalog:v'.$this->version().':'.app()->getLocale().':'.$name;

        return Cache::remember($key, self::TTL, $callback);
    }
}
