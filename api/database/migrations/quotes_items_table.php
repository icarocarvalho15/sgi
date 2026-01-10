<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quote_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('quote_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->nullable();

            if (!Schema::hasColumn('quote_items', 'product_name')) {
                $table->string('product_name');
            }

            $table->integer('quantity');
            $table->decimal('unit_cost_price', 10, 2);
            $table->decimal('unit_sale_price', 10, 2);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('total_price', 10, 2);

            $table->decimal('profit_margin', 5, 2)->nullable();

            $table->text('notes')->nullable();
            $table->string('file_path')->nullable();

            $table->decimal('cost_price', 10, 2)->default(0);

            $table->boolean('is_custom_item')->default(false);

            $table->decimal('commission_percentage', 5, 2)->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_items');
    }
};
