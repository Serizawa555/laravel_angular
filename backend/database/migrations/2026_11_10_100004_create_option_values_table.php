<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Values on an axis, e.g. Black (meta {hex}), 8 GB (meta {gb}). label translatable.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('option_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('option_type_id')->constrained()->cascadeOnDelete();
            $table->string('code');             // black | 8gb | 256gb
            $table->json('label');
            $table->integer('sort')->default(0);
            $table->jsonb('meta')->nullable();  // {"hex":"#1f1f1f"} or {"gb":8}
            $table->timestamps();

            $table->unique(['option_type_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('option_values');
    }
};
