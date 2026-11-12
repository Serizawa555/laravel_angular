<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminUserController extends Controller
{
    /** Roles an admin may assign (never superadmin). */
    private const ASSIGNABLE = ['customer', 'editor', 'admin'];

    /**
     * GET /admin/users
     *
     * @return array<string, mixed>
     */
    public function index(): array
    {
        return [
            'data' => User::with('roles')->orderBy('name')->get()->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'roles' => $u->getRoleNames()->values(),
            ]),
        ];
    }

    /**
     * PUT /admin/users/{user}/roles { roles: [] } — admin may assign editor/admin, never superadmin.
     *
     * @return array<string, mixed>
     */
    public function updateRoles(Request $request, User $user): array
    {
        // Admins cannot modify a superadmin account (PROMPT §4).
        if ($user->hasRole('superadmin')) {
            throw ValidationException::withMessages(['roles' => 'Cannot modify a superadmin.']);
        }

        $data = $request->validate([
            'roles' => ['array'],
            'roles.*' => [Rule::in(self::ASSIGNABLE)],
        ]);

        $user->syncRoles($data['roles'] ?? []);

        return [
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames()->values(),
            ],
        ];
    }
}
