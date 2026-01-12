<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('users.manage');
    }

    public function view(User $user, User $model): bool
    {
        return $user->can('users.manage') && $user->tenant_id === $model->tenant_id;
    }

    public function create(User $user): bool
    {
        return $user->can('users.manage') && $user->tenant->canCreate('user');
    }
    
    public function update(User $user, User $model): bool
    {
        return $user->can('users.manage') && $user->tenant_id === $model->tenant_id;
    }

    public function delete(User $user, User $model): bool
    {
        return $user->can('users.manage') && $user->tenant_id === $model->tenant_id;
    }
}
