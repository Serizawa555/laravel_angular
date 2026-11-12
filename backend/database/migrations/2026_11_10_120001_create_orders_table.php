<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();           // ORD-YYYYMMDD-NNNN
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('email');
            $table->string('name');
            $table->string('phone')->nullable();
            $table->jsonb('shipping_address')->nullable();
            $table->string('currency', 3)->default('MDL');
            $table->integer('subtotal');                   // bani
            $table->integer('shipping')->default(0);
            $table->integer('total');
            $table->string('status')->default('pending');  // pending|paid|failed|cancelled
            $table->string('payment_status')->nullable();
            $table->string('payment_reference')->nullable();
            $table->string('locale', 5)->default('en');
            $table->timestamps();

            $table->index('user_id');
            $table->index('status');
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->string('sku');
            $table->json('name_snapshot');                 // product name per locale at purchase time
            $table->jsonb('options_snapshot')->nullable(); // {color, ram, storage}
            $table->integer('unit_price');
            $table->integer('quantity');
            $table->integer('line_total');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
