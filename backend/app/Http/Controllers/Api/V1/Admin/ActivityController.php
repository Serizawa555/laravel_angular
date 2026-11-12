<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Spatie\Activitylog\Models\Activity;

class ActivityController extends Controller
{
    /**
     * GET /admin/activity — recent audit-log entries (PROMPT §8).
     *
     * @return array<string, mixed>
     */
    public function index(): array
    {
        $rows = [];
        foreach (Activity::with('causer')->latest()->limit(100)->get() as $a) {
            $rows[] = [
                'id' => $a->id,
                'description' => $a->description,       // created | updated | deleted
                'log_name' => $a->log_name,
                'subject_type' => class_basename($a->subject_type ?? ''),
                'subject_id' => $a->subject_id,
                'causer' => $a->causer?->getAttribute('name'),
                'changes' => $a->properties,
                'created_at' => $a->created_at?->toIso8601String(),
            ];
        }

        return ['data' => $rows];
    }
}
