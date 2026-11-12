<?php

use App\Http\Controllers\Api\V1\Admin\ActivityController;
use App\Http\Controllers\Api\V1\Admin\AdminOrderController;
use App\Http\Controllers\Api\V1\Admin\AdminProductController;
use App\Http\Controllers\Api\V1\Admin\AdminTaxonomyController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\AttributeDefinitionController;
use App\Http\Controllers\Api\V1\Admin\FeaturedController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\FavoriteController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\TaxonomyController;
use Illuminate\Support\Facades\Route;

// All API routes are versioned under /api/v1 (see PROMPT.md §5).
Route::prefix('v1')->group(function () {
    // Public health check — used by the Angular dev proxy to prove same-origin wiring.
    Route::get('/health', fn () => [
        'ok' => true,
        'app' => config('app.name'),
        'time' => now()->toIso8601String(),
    ]);

    // --- Public catalog ---
    Route::get('/products/featured', [ProductController::class, 'featured']);
    Route::get('/products/facets', [ProductController::class, 'facets']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{slug}', [ProductController::class, 'show']);
    Route::get('/taxonomies', [TaxonomyController::class, 'index']);

    // --- Auth (Sanctum SPA, session + CSRF) ---
    Route::post('/register', [AuthController::class, 'register'])->middleware('guest');
    Route::post('/login', [AuthController::class, 'login'])->middleware('guest');

    // --- Cart (works for guests via cookie, and for logged-in users) ---
    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart/items', [CartController::class, 'storeItem']);
    Route::patch('/cart/items/{item}', [CartController::class, 'updateItem']);
    Route::delete('/cart/items/{item}', [CartController::class, 'destroyItem']);

    // --- Checkout (guests allowed) + order JSON by number ---
    Route::post('/checkout', [CheckoutController::class, 'checkout'])->middleware('throttle:10,1');
    Route::get('/orders/{number}/json', [CheckoutController::class, 'json']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        // --- Favorites (synced; auth required) ---
        Route::get('/favorites', [FavoriteController::class, 'index']);
        Route::post('/favorites', [FavoriteController::class, 'store']);
        Route::post('/favorites/sync', [FavoriteController::class, 'sync']);
        Route::delete('/favorites/{product}', [FavoriteController::class, 'destroy']);

        // --- Orders (owner) ---
        Route::get('/orders', [CheckoutController::class, 'index']);
        Route::get('/orders/{number}', [CheckoutController::class, 'show']);
    });

    // --- Admin (back office). Products use policies; the rest use can:<permission>. ---
    Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
        // Products (lifecycle authorized per-action in the controller via ProductPolicy)
        Route::get('/products', [AdminProductController::class, 'index']);
        Route::post('/products', [AdminProductController::class, 'store']);
        Route::get('/products/{id}', [AdminProductController::class, 'show']);
        Route::put('/products/{id}', [AdminProductController::class, 'update']);
        Route::post('/products/{id}/publish', [AdminProductController::class, 'publish']);
        Route::post('/products/{id}/unpublish', [AdminProductController::class, 'unpublish']);
        Route::post('/products/{id}/restore', [AdminProductController::class, 'restore']);
        Route::delete('/products/{id}', [AdminProductController::class, 'destroy']);
        Route::post('/products/{id}/media', [AdminProductController::class, 'uploadMedia']);
        Route::delete('/products/{id}/media/{media}', [AdminProductController::class, 'deleteMedia']);

        Route::middleware('can:featured.manage')->group(function () {
            Route::get('/featured', [FeaturedController::class, 'index']);
            Route::put('/featured', [FeaturedController::class, 'update']);
        });

        Route::middleware('can:orders.viewAny')->group(function () {
            Route::get('/orders', [AdminOrderController::class, 'index']);
            Route::get('/orders/{number}', [AdminOrderController::class, 'show']);
        });

        Route::middleware('can:users.manage')->group(function () {
            Route::get('/users', [AdminUserController::class, 'index']);
            Route::put('/users/{user}/roles', [AdminUserController::class, 'updateRoles']);
        });

        Route::middleware('can:taxonomies.manage')->group(function () {
            Route::get('/taxonomies', [AdminTaxonomyController::class, 'index']);
            Route::post('/terms', [AdminTaxonomyController::class, 'storeTerm']);
            Route::put('/terms/{term}', [AdminTaxonomyController::class, 'updateTerm']);
            Route::delete('/terms/{term}', [AdminTaxonomyController::class, 'destroyTerm']);
        });

        Route::middleware('can:attributes.manage')->group(function () {
            Route::get('/attribute-definitions', [AttributeDefinitionController::class, 'index']);
            Route::post('/attribute-definitions', [AttributeDefinitionController::class, 'store']);
            Route::put('/attribute-definitions/{attribute_definition}', [AttributeDefinitionController::class, 'update']);
            Route::delete('/attribute-definitions/{attribute_definition}', [AttributeDefinitionController::class, 'destroy']);
        });

        Route::get('/activity', [ActivityController::class, 'index'])->middleware('can:activitylog.view');
    });
});
