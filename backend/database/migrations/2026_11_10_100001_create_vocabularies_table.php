<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Generic taxonomy (Drupal vocabularies). `code` is the stable seed key; `name` is translatable JSON.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vocabularies', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();   // product_type | brand | segment | connection | case_material
            $table->json('name');               // {"en": "...", "ro": "..."}
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vocabularies');
    }
};
