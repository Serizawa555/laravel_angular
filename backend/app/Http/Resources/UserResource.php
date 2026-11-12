<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'roles' => $this->getRoleNames()->values(),
            // Flat permission list drives Angular's UI gating (buttons/menu). The API still
            // enforces access server-side — this is UX only. Superadmin gets ['*'].
            'permissions' => $this->hasRole('superadmin')
                ? ['*']
                : $this->getAllPermissions()->pluck('name')->values(),
        ];
    }
}
