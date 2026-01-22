<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Customer extends Model
{
    use HasFactory, LogsActivity;
    
    protected $fillable = [
        'tenant_id',
        'internal_id',
        'type',
        'document',
        'name',
        'legal_name',
        'email',
        'phone',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function (Customer $customer) {
            if (is_null($customer->internal_id)) {
                $tenantId = $customer->tenant_id ?? Auth::user()->tenant_id;                
                if ($tenantId) {
                    $maxId = Customer::where('tenant_id', $tenantId)->max('internal_id');
                    $customer->internal_id = ($maxId ?? 0) + 1;
                }
            }
        });
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'type',
                'document',
                'name',
                'legal_name',
                'email',
                'phone',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => "Cliente foi {$eventName}");
    }
}