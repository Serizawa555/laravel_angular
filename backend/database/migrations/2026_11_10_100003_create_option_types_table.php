<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Variant axes: color | ram | storage (PROMPT §3.2). `code` is the stable seed key.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('option_types', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();   // color | ram | storage
            $table->json('name');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('option_types');
    }
};
