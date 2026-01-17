<?php

namespace App\Policies;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CustomerPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('customers.view');
    }

    public function view(User $user, Customer $customer): bool
    {
        return $user->can('customers.view');
    }

    public function create(User $user): bool
    {
        return $user->can('customers.create') && $user->tenant->canCreate('customer');
    }

    public function update(User $user, Customer $customer): bool
    {
        return $user->can('customers.edit');
    }
    
    public function delete(User $user, Customer $customer): bool
    {
        return $user->can('customers.delete');
    }
}