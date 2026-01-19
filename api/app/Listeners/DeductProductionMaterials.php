<?php

namespace App\Listeners;

use App\Events\ProductionStarted;
use Illuminate\Support\Facades\Log;

class DeductProductionMaterials
{
    public function handle(ProductionStarted $event): void
    {
        Log::info("Produção iniciada para O.P. {$event->order->id} (Baixa de estoque será feita na conclusão).");
    }
}