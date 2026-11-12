<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Which option values make up a variant, e.g. Black + 8 GB + 256 GB.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('variant_option_value', function (Blueprint $table) {
            $table->foreignId('variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('option_value_id')->constrained('option_values')->cascadeOnDelete();

            $table->primary(['variant_id', 'option_value_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('variant_option_value');
    }
};
