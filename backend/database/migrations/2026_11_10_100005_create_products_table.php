<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('type')->index();                 // ProductType enum value
            $table->foreignId('brand_id')->nullable()->constrained('terms')->nullOnDelete();
            $table->foreignId('segment_id')->nullable()->constrained('terms')->nullOnDelete();

            $table->string('slug')->unique();
            $table->string('sku_base')->nullable();

            // Translatable JSON (EN default + RO).
            $table->json('name');
            $table->json('short_description')->nullable();
            $table->json('description')->nullable();

            // Type-specific technical fields, validated/rendered from attribute_definitions.
            $table->jsonb('specs')->nullable();

            $table->integer('base_price')->default(0);       // bani (1 MDL = 100 bani)
            $table->string('status')->default('draft')->index();
            $table->timestamp('published_at')->nullable();

            $table->boolean('is_featured')->default(false);
            $table->unsignedTinyInteger('featured_position')->nullable()->unique(); // 1..3 when set

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'status']);
        });

        // GIN index for querying type-specific specs (filters). Postgres only.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX products_specs_gin ON products USING gin (specs)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
