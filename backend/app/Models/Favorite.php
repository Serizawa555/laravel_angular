<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Favorite extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'product_id', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}
