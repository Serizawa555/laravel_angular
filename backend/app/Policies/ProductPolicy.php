<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

/**
 * Server-side authorization for the product lifecycle (PROMPT §4). Superadmin bypasses all of this
 * via Gate::before. Permission names come from roles.json.
 */
class ProductPolicy
{
    /** Staff (editor+) may see the admin list, including drafts. */
    public function viewAny(User $user): bool
    {
        return $user->can('products.viewDrafts');
    }

    public function view(User $user, Product $product): bool
    {
        return $user->can('products.viewDrafts');
    }

    public function create(User $user): bool
    {
        return $user->can('products.create');
    }

    public function update(User $user, Product $product): bool
    {
        return $user->can('products.update');
    }

    public function publish(User $user): bool
    {
        return $user->can('products.publish');
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->can('products.delete');
    }

    public function restore(User $user, Product $product): bool
    {
        return $user->can('products.restore');
    }

    /** No role is granted this permission — only superadmin (via Gate::before). */
    public function forceDelete(User $user, Product $product): bool
    {
        return $user->can('products.forceDelete');
    }
}
