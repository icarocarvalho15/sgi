<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\QuoteItemController;
use App\Http\Controllers\Api\ProductionOrderController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PaymentMethodController;
use App\Http\Controllers\Api\PaymentTermController;
use App\Http\Controllers\Api\DeliveryMethodController;
use App\Http\Controllers\Api\QuoteStatusController;
use App\Http\Controllers\Api\ProductionStatusController;
use App\Http\Controllers\Api\NegotiationSourceController;
use App\Http\Controllers\Api\AccountReceivableController;
use App\Http\Controllers\Api\AccountPayableController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReceivableInstallmentController;
use App\Http\Controllers\Api\ProductComponentController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\AuditController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/user', function (Request $request) {
        $user = $request->user();
        $permissions = $user->getPermissionsViaRoles()->pluck('name')->unique()->values()->all();
        $user->permissions = $permissions;
        $user->role = $user->getRoleNames()->first();
        unset($user->roles);
        $user->settings = $user->tenant;
        return $user;
    });

    Route::get('/products/{product}/components', [ProductComponentController::class, 'index']);
    Route::post('/products/{product}/components', [ProductComponentController::class, 'store']);
    Route::delete('/product-components/{component}', [ProductComponentController::class, 'destroy']);

    Route::get('/products/export', [ProductController::class, 'export']);
    Route::apiResource('products', ProductController::class);
    
    Route::get('/customers/export', [CustomerController::class, 'export']);
    Route::apiResource('customers', CustomerController::class);
    Route::patch('/customers/{customer}/document', [CustomerController::class, 'updateDocument']);

    Route::get('/quotes/export', [QuoteController::class, 'export']);
    Route::get('/quotes/{quote}/pdf', [QuoteController::class, 'generatePdf']);
    Route::apiResource('quotes', QuoteController::class);
    Route::post('quotes/{quote}/items', [QuoteItemController::class, 'store']);
    Route::put('quotes/{quote}/items/{quote_item}', [QuoteItemController::class, 'update']);
    Route::delete('quotes/{quote}/items/{quote_item}', [QuoteItemController::class, 'destroy']);
    Route::post('/quotes/{quote}/send-email', [QuoteController::class, 'sendEmail']);
    Route::delete('quote-items/{quote_item}/file', [QuoteItemController::class, 'destroyFile']);
    Route::patch('/quotes/{quote}/status', [QuoteController::class, 'updateStatus']);

    Route::get('/production-orders/export', [ProductionOrderController::class, 'export']);
    Route::get('/production-orders/{productionOrder}/work-order-pdf', [ProductionOrderController::class, 'generateWorkOrderPdf']);
    Route::get('/production-orders/{productionOrder}/delivery-protocol-pdf', [ProductionOrderController::class, 'generateDeliveryProtocolPdf']);
    Route::apiResource('production-orders', ProductionOrderController::class);

    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);

    Route::get('/settings', [SettingsController::class, 'show']);    
    Route::post('/settings', [SettingsController::class, 'update']);

    Route::post('/stock-movements', [StockMovementController::class, 'store']);
    Route::get('/products/{product}/stock-movements', [StockMovementController::class, 'history']);

    Route::apiResource('users', UserController::class);
    Route::post('/user/profile', [ProfileController::class, 'updateProfile']);
    Route::put('/user/password', [ProfileController::class, 'updatePassword']);

    Route::apiResource('categories', CategoryController::class);

    Route::apiResource('roles', RoleController::class);
    Route::get('/permissions', [RoleController::class, 'getPermissions']);

    Route::apiResource('payment-methods', PaymentMethodController::class);

    Route::apiResource('payment-terms', PaymentTermController::class);

    Route::apiResource('delivery-methods', DeliveryMethodController::class);
    
    Route::apiResource('quote-statuses', QuoteStatusController::class);

    Route::apiResource('production-statuses', ProductionStatusController::class);

    Route::apiResource('negotiation-sources', NegotiationSourceController::class);

    Route::get('/accounts-receivable/export', [AccountReceivableController::class, 'export']);
    Route::apiResource('accounts-receivable', AccountReceivableController::class);
    Route::post('/accounts-receivable/{accountReceivable}/register-payment', [AccountReceivableController::class, 'registerPayment']);

    Route::get('/accounts-payable/export', [AccountPayableController::class, 'export']);
    Route::apiResource('accounts-payable', AccountPayableController::class);
    Route::post('/accounts-payable/{accountPayable}/register-payment', [AccountPayableController::class, 'registerPayment']);

    Route::get('/reports/sales-by-customer/export', [ReportController::class, 'exportSalesByCustomer']);
    Route::get('/reports/items-sold-by-day/export', [ReportController::class, 'exportItemsSoldByDay']);
    Route::get('/reports/sales-by-period', [ReportController::class, 'salesByPeriod']);
    Route::get('/reports/sales-by-customer', [ReportController::class, 'salesByCustomer']);
    Route::get('/reports/items-sold-by-day', [ReportController::class, 'itemsSoldByDay']);
    Route::get('/reports/cash-flow', [ReportController::class, 'cashFlow']);
    Route::get('/reports/realized-cash-flow', [ReportController::class, 'realizedCashFlow']);

    Route::post('/receivable-installments/{installment}/register-payment', [ReceivableInstallmentController::class, 'registerPayment']);
    
    Route::get('/tenant/plan-usage', [TenantController::class, 'usage']);

    Route::get('/audit-logs', [AuditController::class, 'index']);
});
