<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('production_orders', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_custom_item')->default(false);
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->unsignedBigInteger('internal_id')->nullable();
            $table->foreignId('quote_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('restrict');
            $table->foreignId('customer_id')->constrained()->onDelete('restrict');
            $table->foreignId('status_id')->nullable()->constrained('production_statuses')->onDelete('set null');
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamp('materials_deducted_at')->nullable();
            $table->index('internal_id');
            $table->unique(['tenant_id', 'internal_id']);
            $table->foreignId('product_id')->nullable();
            if (!Schema::hasColumn('production_orders', 'product_name')) {
                $table->string('product_name');
            }
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_orders');
    }
};
