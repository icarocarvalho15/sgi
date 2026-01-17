<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'plan_id',
        'subscription_status',
        'subscription_expires_at',
        'name',
        'status',
        'is_active' => 'boolean',
        'legal_name',
        'company_fantasy_name',
        'cnpj',
        'email',
        'phone',
        'website',
        'cep',
        'street',
        'number',
        'complement',
        'neighborhood',
        'city',
        'state',
        'logo_path',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function hasReachedLimit($limitType, $currentCount)
    {
        if (!$this->plan) return false;
        
        $limit = $this->plan->{$limitType};
        
        if ($limit === -1) return false;
        
        return $currentCount >= $limit;
    }

    public function canCreate($resource)
    {
        if (!$this->plan) return false;

        $limits = [
            'user' => 'max_users',
            'product' => 'max_products',
            'customer' => 'max_customers',
        ];

        if (!array_key_exists($resource, $limits)) return true;

        $column = $limits[$resource];
        $limit = $this->plan->{$column};

        if ($limit === -1) return true;

        $currentCount = match ($resource) {
            'user' => $this->users()->count(),
            'product' => $this->products()->count(),
            'customer' => $this->customers()->count(),
            default => 0,
        };

        return $currentCount < $limit;
    }
}