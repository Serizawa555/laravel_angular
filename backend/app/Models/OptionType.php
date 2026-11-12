<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Translatable\HasTranslations;

class OptionType extends Model
{
    use HasTranslations;

    protected $fillable = ['code', 'name'];

    /** @var list<string> */
    public array $translatable = ['name'];

    /** @return HasMany<OptionValue, $this> */
    public function values(): HasMany
    {
        return $this->hasMany(OptionValue::class);
    }
}
