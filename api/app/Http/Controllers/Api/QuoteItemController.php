<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Quote;
use App\Models\QuoteItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class QuoteItemController extends Controller
{
    public function store(Request $request, Quote $quote)
    {
        $this->authorize('create', [QuoteItem::class, $quote]);

        $validated = $request->validate([
            'product_id' => 'nullable|exists:products,id',
            'product_name' => 'required_without:product_id|string|max:255',
            'unit_sale_price' => 'required_without:product_id|numeric|min:0',
            'unit_cost_price' => 'nullable|numeric|min:0',
            'quantity' => 'required|integer|min:1',
            'is_custom_item' => 'boolean',
        ]);

        if (!empty($validated['product_id'])) {
            $product = Product::find($validated['product_id']);

            $item = $quote->items()->where('product_id', $product->id)->first();

            if ($item) {
                $item->increment('quantity', $validated['quantity']);
            } else {
                $costPrice = $product->isService() ? 0 : $product->cost_price;
                $salePrice = $product->sale_price;
                $profitMargin = 0;
                if ($salePrice > 0) {
                    $lucro = $salePrice - $costPrice;
                    $profitMargin = ($lucro / $salePrice) * 100;
                }
                
                $item = $quote->items()->create([
                    'tenant_id' => $quote->tenant_id,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $validated['quantity'],
                    'unit_cost_price' => $costPrice,
                    'unit_sale_price' => $salePrice,
                    'is_custom_item' => false,
                    'discount_percentage' => 0,
                    'profit_margin' => $profitMargin,
                    'total_price' => $validated['quantity'] * $salePrice,
                ]);
            }
        }
        else {
            $costPrice = $request->input('unit_cost_price', 0);
            $salePrice = $request->input('unit_sale_price');
            
            $profitMargin = 0;
            if ($salePrice > 0) {
                $lucro = $salePrice - $costPrice;
                $profitMargin = ($lucro / $salePrice) * 100;
            }

            $item = $quote->items()->create([
                'tenant_id' => $quote->tenant_id,
                'product_id' => null,
                'product_name' => $validated['product_name'],
                'quantity' => $validated['quantity'],
                'unit_cost_price' => $costPrice,
                'unit_sale_price' => $salePrice,
                'is_custom_item' => true,
                'discount_percentage' => 0,
                'profit_margin' => $profitMargin,
                'total_price' => $validated['quantity'] * $salePrice,
            ]);
        }
        
        $item->updateTotalPrice();
        $quote->recalculateTotals();
        
        return $quote->load(['items.product', 'status', 'paymentMethod', 'deliveryMethod', 'negotiationSource']);
    }

    public function update(Request $request, Quote $quote, QuoteItem $quote_item)
    {
        $this->authorize('update', [$quote_item, $quote]);

        $rules = [
            'quantity' => 'sometimes|required|integer|min:1',
            'unit_sale_price' => 'sometimes|required|numeric|min:0',
            'discount_percentage' => 'sometimes|required|numeric|min:0|max:100',
            'profit_margin' => 'sometimes|required|numeric|min:0|max:99.99',
            'notes' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf,jpg,png,jiff,tiff,zip,psd,cdr,ai,eps|max:524288',
        ];

        if ($quote_item->is_custom_item) {
            $rules['product_name'] = 'sometimes|required|string|max:255';
        }

        $validatedData = $request->validate($rules);

        $costPrice = $quote_item->unit_cost_price;

        if ($request->has('profit_margin') && !$request->has('unit_sale_price')) {
            $margin = $validatedData['profit_margin'] / 100;
            if ($margin < 1 && $costPrice > 0) {
                $validatedData['unit_sale_price'] = $costPrice / (1 - $margin);
            }
        } elseif ($request->has('unit_sale_price')) {
            $salePrice = $validatedData['unit_sale_price'];
            if ($salePrice > 0 && $costPrice >= 0) {
                $validatedData['profit_margin'] = (($salePrice - $costPrice) / $salePrice) * 100;
            } else {
                $validatedData['profit_margin'] = 0;
            }
        }

        if ($request->hasFile('file')) {
            if ($quote_item->file_path) {
                Storage::disk('public')->delete($quote_item->file_path);
            }
            $path = $request->file('file')->store('quote_items_files', 'public');
            $validatedData['file_path'] = $path;
        }

        $quote_item->update($validatedData);

        $discount = $quote_item->unit_sale_price * ($quote_item->discount_percentage / 100);
        $priceWithDiscount = $quote_item->unit_sale_price - $discount;
        $quote_item->total_price = $quote_item->quantity * $priceWithDiscount;
        $quote_item->save();

        $quote->recalculateTotals();

        return $quote->load(['items.product', 'status', 'paymentMethod', 'deliveryMethod', 'negotiationSource']);
    }

    public function destroy(Quote $quote, QuoteItem $quote_item)
    {
        $this->authorize('delete', [$quote_item, $quote]);
        
        if ($quote_item->file_path) {
            Storage::disk('public')->delete($quote_item->file_path);
        }

        $quote_item->delete();

        $quote->recalculateTotals();
        
        return $quote->load(['items.product', 'status', 'paymentMethod', 'deliveryMethod', 'negotiationSource']);
    }

    public function destroyFile(QuoteItem $quote_item)
    {
        $this->authorize('update', [$quote_item, $quote_item->quote]);

        if ($quote_item->file_path) {
            Storage::disk('public')->delete($quote_item->file_path);
            $quote_item->file_path = null;
            $quote_item->save();
        }
        
        return $quote_item->quote->load(['items.product', 'status', 'paymentMethod', 'deliveryMethod', 'negotiationSource']);
    }
}