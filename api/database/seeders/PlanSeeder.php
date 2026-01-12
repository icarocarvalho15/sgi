<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        Plan::updateOrCreate(
            ['slug' => 'bronze'],
            [
                'name' => 'Plano Bronze',
                'price' => 49.90,
                'max_users' => 3,
                'max_products' => 50,
                'max_storage_mb' => 100,
                'is_active' => true,
                'is_popular' => false,
                'description' => 'Ideal para quem está começando. Recursos essenciais.',
            ]
        );

        Plan::updateOrCreate(
            ['slug' => 'prata'],
            [
                'name' => 'Plano Prata',
                'price' => 99.90,
                'max_users' => 5,
                'max_products' => 500,
                'max_storage_mb' => 500,
                'is_active' => true,
                'is_popular' => true,
                'description' => 'Para pequenas empresas em crescimento. Mais liberdade.',
            ]
        );

        Plan::updateOrCreate(
            ['slug' => 'ouro'],
            [
                'name' => 'Plano Ouro',
                'price' => 199.90,
                'max_users' => -1,
                'max_products' => -1,
                'max_storage_mb' => 10240,
                'is_active' => true,
                'is_popular' => false,
                'description' => 'Para empresas consolidadas. Sem limites.',
            ]
        );
    }
}
