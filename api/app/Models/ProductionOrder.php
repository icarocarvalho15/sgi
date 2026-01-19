<?php

namespace App\Models;

use App\Listeners\DeductProductionMaterials;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

class ProductionOrder extends Model
{
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'internal_id',
        'quote_id',
        'user_id',
        'customer_id',
        'status_id',
        'completed_at',
        'notes',
        'cancellation_reason',
        'materials_deducted_at',
        'product_name',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
            'materials_deducted_at' => 'datetime',
        ];
    }

    protected $dispatchesEvents = [
        'updated' => DeductProductionMaterials::class,
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new TenantScope);
        
        static::creating(function (ProductionOrder $order) {
            if (is_null($order->internal_id)) {
                $tenantId = $order->tenant_id;
                
                if ($tenantId) {
                    $maxId = ProductionOrder::where('tenant_id', $tenantId)->max('internal_id');
                    $order->internal_id = ($maxId ?? 0) + 1;
                }
            }
        });
    }
    
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function getTranslatedStatus(): string
    {
        return $this->status?->name ?? 'N/A';
    }

    public function status(): BelongsTo
    {
        return $this->belongsTo(ProductionStatus::class);
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}