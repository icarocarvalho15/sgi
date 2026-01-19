<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Spatie\Activitylog\Models\Activity;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $tenant = $request->user()->tenant;

        $userIds = $tenant->users()->pluck('id');

        $logs = Activity::whereIn('causer_id', $userIds)
            ->with(['causer', 'subject'])
            ->latest()
            ->paginate(20);

        return response()->json($logs);
    }
}
