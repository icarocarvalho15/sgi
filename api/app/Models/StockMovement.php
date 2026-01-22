<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use App\Events\StockMovementCreated;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class StockMovement extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'quantity',
        'type',
        'notes',
        'cost_price',
    ];

    /**
     * @var array
     */
    protected $dispatchesEvents = [
        'created' => StockMovementCreated::class,
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new TenantScope);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
    
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'quantity',
                'type',
                'notes',
                'cost_price',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => "Estoque do Produto foi {$eventName}");
    }
}