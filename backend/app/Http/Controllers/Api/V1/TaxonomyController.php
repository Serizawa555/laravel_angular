<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\TermResource;
use App\Models\Vocabulary;
use App\Support\CatalogCache;

class TaxonomyController extends Controller
{
    public function __construct(private readonly CatalogCache $cache) {}

    /**
     * GET /taxonomies — vocabularies + their terms, for building filter UIs (cached per locale).
     *
     * @return array<string, mixed>
     */
    public function index(): array
    {
        $data = $this->cache->remember('taxonomies', function () {
            return Vocabulary::with(['terms' => fn ($q) => $q->orderBy('weight')])->get()
                ->map(fn (Vocabulary $vocab) => [
                    'code' => $vocab->code,
                    'name' => $vocab->name,
                    'terms' => TermResource::collection($vocab->terms)->resolve(),
                ])->all();
        });

        return ['data' => $data];
    }
}
