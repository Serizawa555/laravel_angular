<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Term;
use App\Models\Vocabulary;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AdminTaxonomyController extends Controller
{
    /**
     * GET /admin/taxonomies — vocabularies + terms (all locales for editing).
     *
     * @return array<string, mixed>
     */
    public function index(): array
    {
        return [
            'data' => Vocabulary::with(['terms' => fn ($q) => $q->orderBy('weight')])->get()
                ->map(fn (Vocabulary $v) => [
                    'id' => $v->id,
                    'code' => $v->code,
                    'name' => $v->getTranslations('name'),
                    'terms' => $v->terms->map(fn (Term $t) => [
                        'id' => $t->id,
                        'slug' => $t->slug,
                        'name' => $t->getTranslations('name'),
                        'weight' => $t->weight,
                    ]),
                ]),
        ];
    }

    public function storeTerm(Request $request): Term
    {
        $data = $this->validateTerm($request);

        return Term::create($data);
    }

    public function updateTerm(Request $request, Term $term): Term
    {
        $term->update($this->validateTerm($request, $term));

        return $term;
    }

    public function destroyTerm(Term $term): Response
    {
        $term->delete();

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function validateTerm(Request $request, ?Term $term = null): array
    {
        return $request->validate([
            'vocabulary_id' => ['required', 'integer', 'exists:vocabularies,id'],
            'name' => ['required', 'array'],
            'name.en' => ['required', 'string'],
            'name.ro' => ['nullable', 'string'],
            'slug' => ['required', 'string', 'max:255'],
            'weight' => ['integer'],
        ]);
    }
}
