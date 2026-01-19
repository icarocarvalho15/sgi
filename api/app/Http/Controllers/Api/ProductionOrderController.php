<?php

namespace App\Http\Controllers\Api;

use App\Models\StockMovement;
use App\Events\OrderCompleted;
use App\Events\ProductionStarted;
use App\Http\Controllers\Controller;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Customer;
use App\Models\User;
use App\Models\Product;
use App\Models\ProductionOrder;
use App\Models\ProductionStatus;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class ProductionOrderController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', ProductionOrder::class);

        $user = $request->user();
        
        $query = ProductionOrder::query();

        if (!$user->can('production_orders.view_all')) {
            $query->where('user_id', $user->id);
        }

        if ($request->has('search') && $request->input('search') != '') {
            $searchTerm = $request->input('search');
            $query->where(function ($q) use ($searchTerm) {
                $q->where('id', 'like', "%{$searchTerm}%")
                  ->orWhere('quote_id', 'like', "%{$searchTerm}%")
                  ->orWhereHas('customer', function ($subQ) use ($searchTerm) {
                      $subQ->where('name', 'like', "%{$searchTerm}%");
                  });
            });
        }

        $query->with(['customer', 'user', 'quote.items.product.components.component', 'status']);
        
        $query->latest();

        return $query->paginate(15);
    }

    public function store(Request $request)
    {
        //
    }

    public function show(ProductionOrder $productionOrder)
    {
        //
    }

    public function update(Request $request, ProductionOrder $productionOrder)
    {
        if (in_array($productionOrder->status?->name, ['Cancelado', 'Concluído'])) {
            abort(403, 'Ordens finalizadas ou canceladas não podem ser modificadas.');
        }
        $this->authorize('update', $productionOrder);

        $oldStatusName = $productionOrder->status?->name;

        $statusValidation = $request->validate(['status_id' => 'required|exists:production_statuses,id']);
        $newStatus = ProductionStatus::find($statusValidation['status_id']);

        if ($newStatus && $newStatus->name === 'Cancelado') {
             $validated = $request->validate([
                'status_id' => 'required|exists:production_statuses,id',
                'cancellation_reason' => 'required|string|max:500',
            ]);
        } else {
             $validated = $request->validate(['status_id' => 'required|exists:production_statuses,id']);
        }

        $productionOrder->update($validated);
        $productionOrder->refresh();
        $newStatusName = $productionOrder->status?->name;

        if ($newStatusName === 'Concluído' && is_null($productionOrder->materials_deducted_at)) {
            
            $productionOrder->completed_at = now();
            $productionOrder->materials_deducted_at = now();
            $productionOrder->saveQuietly();

            if ($productionOrder->quote && $productionOrder->quote->items) {
                $productionOrder->load('quote.items.product.components.component');

                foreach ($productionOrder->quote->items as $item) {
                    if (!$item->product) continue;

                    if ($item->product->isService() && $item->product->components->isNotEmpty()) {
                        foreach ($item->product->components as $component) {
                            $ingredient = $component->component;
                            
                            if ($ingredient) {
                                $qtyNeeded = $item->quantity * $component->quantity_used;
                                $this->deductStock($ingredient, $qtyNeeded, $productionOrder, $item->product_name);
                            }
                        }
                    }
                    
                    elseif ($item->product->isProduct()) {
                         $this->deductStock($item->product, $item->quantity, $productionOrder, $item->product_name);
                    }
                }
            }
        }

        if ($oldStatusName !== 'Concluído' && $newStatusName === 'Concluído') {
            OrderCompleted::dispatch($productionOrder);
        }
        if ($oldStatusName !== 'Em Produção' && $newStatusName === 'Em Produção') {
            ProductionStarted::dispatch($productionOrder);
        }

        return $productionOrder->load(['customer', 'user', 'quote.items.product', 'status']);
    }

    private function deductStock($product, $quantity, $order, $itemName)
    {
        $oldStock = $product->quantity_in_stock;
        $newStock = $oldStock - $quantity;

        $movement = new StockMovement();
        $movement->fill([
            'tenant_id'  => $order->tenant_id,
            'product_id' => $product->id,
            'quantity'   => -$quantity,
            'type'       => 'Saída por Produção',
            'notes'      => "Baixa p/ O.P. #{$order->internal_id} (Item: {$itemName})",
        ]);
        $movement->saveQuietly();
        
        $product->quantity_in_stock = $newStock;
        
        if (method_exists($product, 'disableLogging')) {
            $product->disableLogging();
        }
        
        $product->saveQuietly(); 

        activity()
            ->performedOn($product)
            ->causedBy(auth()->user())
            ->withProperties([
                'attributes' => ['quantity_in_stock' => $newStock],
                'old' => ['quantity_in_stock' => $oldStock]
            ])
            ->event('production_finished') 
            ->log("Baixa automática: O.P. #{$order->internal_id} Concluída");
    }

    public function destroy(ProductionOrder $productionOrder)
    {
        $this->authorize('delete', $productionOrder);
        $productionOrder->delete();
        return response()->noContent();
    }

    public function generateWorkOrderPdf(Request $request, ProductionOrder $productionOrder)
    {
        $this->authorize('view', $productionOrder);

        $productionOrder->load(['customer', 'user', 'quote.items.product', 'status']);
        
        $order = $productionOrder;
                
        $settings = $request->user()->tenant; 

        $pdf = Pdf::loadView('pdf.work_order', [
            'order' => $order,
            'settings' => $settings
        ]);
        return $pdf->stream('ordem-servico-'.$order->id.'.pdf');
    }

    public function generateDeliveryProtocolPdf(Request $request, ProductionOrder $productionOrder)
    {
        $this->authorize('view', $productionOrder);

        $productionOrder->load(['customer', 'user', 'quote.items.product', 'status']);

        $order = $productionOrder;
        
        $settings = $request->user()->tenant;
        
        $pdf = Pdf::loadView('pdf.delivery_protocol', [
            'order' => $order,
            'settings' => $settings
        ]);
        return $pdf->stream('protocolo-entrega-'.$productionOrder->id.'.pdf');
    }

    public function export(Request $request)
    {
        $this->authorize('viewAny', ProductionOrder::class);

        $user = $request->user();
        $fileName = 'ordens_de_producao.csv';

        $query = ProductionOrder::query();
        if (!$user->can('production_orders.view_all')) {
            $query->where('user_id', $user->id);
        }
        $orders = $query->with(['customer', 'user', 'status'])->get();

        $headers = [
            "Content-type"        => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $callback = function() use($orders) {
            $file = fopen('php://output', 'w');
            fputs($file, $bom =( chr(0xEF) . chr(0xBB) . chr(0xBF) ));

            $columns = ['Nº Pedido', 'Nº Orçamento', 'Cliente', 'Vendedor', 'Status', 'Data do Pedido'];
            fputcsv($file, $columns, ';');

            foreach ($orders as $order) {
                $row = [
                    $order->id,
                    $order->quote_id,
                    $order->customer->name,
                    $order->user->name,
                    $order->getTranslatedStatus(),
                    (new \DateTime($order->created_at))->format('d/m/Y'),
                ];
                fputcsv($file, $row, ';');
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
