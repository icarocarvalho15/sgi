<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('products.view');
    }

    public function view(User $user, Product $product): bool
    {
        return $user->can('products.view');
    }

    public function create(User $user): bool
    {
        return $user->can('products.create') && $user->tenant->canCreate('product');
    }

    public function update(User $user, Product $product): bool
    {
        return $user->can('products.edit');
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->can('products.delete');
    }

    public function viewStockHistory(User $user, Product $product): bool
    {
        return true;
    }

}