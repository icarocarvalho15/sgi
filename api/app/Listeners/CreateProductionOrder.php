<?php

namespace App\Listeners;

use App\Events\QuoteApproved;
use App\Models\ProductionOrder;
use App\Models\ProductionStatus;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class CreateProductionOrder
{
    public function __construct()
    {
        //
    }

    public function handle(QuoteApproved $event): void
    {
        $quote = $event->quote;
        
        if (ProductionOrder::where('quote_id', $quote->id)->exists()) {
            return;
        }

        $pendingStatus = ProductionStatus::where('name', 'Pendente')->first();
        
        if (!$pendingStatus) {
            Log::error('Status de produção "Pendente" não encontrado.');
            return;
        }

        ProductionOrder::create([
            'tenant_id' => $quote->tenant_id,
            'quote_id' => $quote->id,
            'customer_id' => $quote->customer_id,
            'user_id' => $quote->user_id,
            'status_id' => $pendingStatus->id,
            'due_date' => $quote->delivery_datetime,
            'notes' => $quote->notes,
        ]);
    }
}
