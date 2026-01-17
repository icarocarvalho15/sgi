<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->decimal('price', 10, 2);
            $table->integer('max_users')->default(1);
            $table->integer('max_products')->default(50);
            $table->integer('max_customers')->default(100);
            $table->integer('max_storage_mb')->default(100);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_popular')->default(false);
            $table->text('description')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
