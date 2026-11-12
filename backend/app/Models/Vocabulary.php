<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Translatable\HasTranslations;

class Vocabulary extends Model
{
    use HasTranslations;

    protected $fillable = ['code', 'name'];

    /** @var list<string> */
    public array $translatable = ['name'];

    /** @return HasMany<Term, $this> */
    public function terms(): HasMany
    {
        return $this->hasMany(Term::class);
    }
}
