<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class AccountReceivable extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'accounts_receivables';

    protected $fillable = [
        'tenant_id',
        'quote_id',
        'customer_id',
        'production_order_id',
        'total_amount',
        'paid_amount',
        'due_date',
        'paid_at',
        'status'
    ];

    protected $casts = [
        'due_date' => 'date',
        'paid_at' => 'date',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new TenantScope);
    }
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function installments(): HasMany
    {
        return $this->hasMany(ReceivableInstallment::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'tenant_id',
                'quote_id',
                'customer_id',
                'production_order_id',
                'total_amount',
                'paid_amount',
                'due_date',
                'paid_at',
                'status'
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => "Conta a Receber foi {$eventName}");
    }
}