<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'price',
        'max_users',
        'max_products',
        'max_storage_mb',
        'is_active',
        'is_popular',
        'description',
    ];

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }
}