<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TenantController extends Controller
{
    public function usage(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        if (!$tenant || !$tenant->plan) {
            return response()->json([
                'message' => 'Nenhum plano vinculado a esta empresa.',
                'plan_name' => 'Sem Plano',
                'features' => []
            ], 404);
        }

        $plan = $tenant->plan;

        $usersCount = $tenant->users()->count();
        $productsCount = $tenant->products()->count(); 
        
        $calculatePercent = function ($current, $max) {
            if ($max === -1) return 0;
            if ($max <= 0) return 100;
            return round(($current / $max) * 100);
        };

        return response()->json([
            'tenant_name' => $tenant->company_fantasy_name ?? $tenant->name,
            'plan_name' => $plan->name,
            'features' => [
                'users' => [
                    'label' => 'Usuários',
                    'current' => $usersCount,
                    'max' => $plan->max_users,
                    'percent' => $calculatePercent($usersCount, $plan->max_users),
                    'is_unlimited' => $plan->max_users === -1,
                ],
                'products' => [
                    'label' => 'Produtos',
                    'current' => $productsCount,
                    'max' => $plan->max_products,
                    'percent' => $calculatePercent($productsCount, $plan->max_products),
                    'is_unlimited' => $plan->max_products === -1,
                ]
            ]
        ]);
    }
}