<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Terms within a vocabulary (Drupal terms). slug is unique per vocabulary; name translatable.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vocabulary_id')->constrained()->cascadeOnDelete();
            $table->json('name');
            $table->string('slug');
            $table->integer('weight')->default(0);
            $table->timestamps();

            $table->unique(['vocabulary_id', 'slug']);
            $table->index('slug');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terms');
    }
};
