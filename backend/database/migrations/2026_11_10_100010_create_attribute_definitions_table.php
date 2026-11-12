<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Definitions that drive the dynamic spec form + PDP spec table + SpecsValidator (PROMPT §3.3).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attribute_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('product_type');                 // ProductType value this applies to
            $table->string('key');                          // specs JSON key, e.g. battery_mah
            $table->json('label');                          // translatable
            $table->string('data_type');                    // string|int|decimal|bool|enum|list
            $table->string('unit')->nullable();             // mAh, ", MP, h, g
            $table->jsonb('options')->nullable();           // for enum/list data types
            $table->string('group')->nullable();            // Display | Camera | Battery ...
            $table->boolean('is_filterable')->default(false);
            $table->boolean('is_required')->default(false);
            $table->integer('sort')->default(0);
            $table->timestamps();

            $table->unique(['product_type', 'key']);
            $table->index('product_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attribute_definitions');
    }
};
