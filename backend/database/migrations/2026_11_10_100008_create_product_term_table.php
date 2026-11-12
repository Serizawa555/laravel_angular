<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Extra taxonomy tags on a product (beyond brand/segment columns).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_term', function (Blueprint $table) {
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('term_id')->constrained()->cascadeOnDelete();

            $table->primary(['product_id', 'term_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_term');
    }
};
