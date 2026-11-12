<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Translatable\HasTranslations;

class OptionValue extends Model
{
    use HasTranslations;

    protected $fillable = ['option_type_id', 'code', 'label', 'sort', 'meta'];

    /** @var list<string> */
    public array $translatable = ['label'];

    protected function casts(): array
    {
        return [
            'sort' => 'integer',
            'meta' => 'array',
        ];
    }

    /** @return BelongsTo<OptionType, $this> */
    public function optionType(): BelongsTo
    {
        return $this->belongsTo(OptionType::class);
    }

    /** @return BelongsToMany<ProductVariant, $this> */
    public function variants(): BelongsToMany
    {
        return $this->belongsToMany(ProductVariant::class, 'variant_option_value', 'option_value_id', 'variant_id');
    }
}
