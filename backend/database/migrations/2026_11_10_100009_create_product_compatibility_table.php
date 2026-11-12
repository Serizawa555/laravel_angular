<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// "This accessory fits this phone" (PROMPT §3.2). Both sides are products.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_compatibility', function (Blueprint $table) {
            $table->foreignId('accessory_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('phone_id')->constrained('products')->cascadeOnDelete();

            $table->primary(['accessory_id', 'phone_id']);
            $table->index('phone_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_compatibility');
    }
};
