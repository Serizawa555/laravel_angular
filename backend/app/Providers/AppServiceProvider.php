<?php

namespace App\Providers;

use App\Models\User;
use App\Payments\MockPaymentGateway;
use App\Payments\PaymentGateway;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Swap this binding for a real provider later (PROMPT §6).
        $this->app->bind(PaymentGateway::class, MockPaymentGateway::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Superadmin bypasses every gate/policy check (PROMPT §4). Drupal analog: user 1.
        Gate::before(fn (User $user) => $user->hasRole('superadmin') ? true : null);

        // Catch N+1 queries in development (PROMPT §11 — performance).
        Model::preventLazyLoading(! $this->app->isProduction());
    }
}
