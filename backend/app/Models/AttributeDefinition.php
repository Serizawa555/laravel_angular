<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ProductType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Spatie\Translatable\HasTranslations;

class AttributeDefinition extends Model
{
    use HasTranslations;

    protected $fillable = [
        'product_type', 'key', 'label', 'data_type', 'unit',
        'options', 'group', 'is_filterable', 'is_required', 'sort',
    ];

    /** @var list<string> */
    public array $translatable = ['label'];

    protected function casts(): array
    {
        return [
            'product_type' => ProductType::class,
            'options' => 'array',
            'is_filterable' => 'boolean',
            'is_required' => 'boolean',
            'sort' => 'integer',
        ];
    }

    /** @param Builder<AttributeDefinition> $query */
    public function scopeForType(Builder $query, ProductType $type): void
    {
        $query->where('product_type', $type->value)->orderBy('sort');
    }
}
