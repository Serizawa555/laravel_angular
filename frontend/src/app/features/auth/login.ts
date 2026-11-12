import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { LocaleService } from '../../core/locale.service';
import { CartStore } from '../../stores/cart.store';
import { FavoritesStore } from '../../stores/favorites.store';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-sm p-6">
      <h1 class="mb-4 text-2xl font-semibold">Log in</h1>

      @if (formError()) {
        <p class="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{{ formError() }}</p>
      }

      <form (submit)="submit($event)" class="space-y-4">
        <div>
          <label class="block text-sm font-medium" for="email">Email</label>
          <input
            id="email"
            type="email"
            autocomplete="username"
            class="mt-1 w-full rounded border px-3 py-2"
            [value]="email()"
            (input)="email.set($any($event.target).value)"
          />
        </div>

        <div>
          <label class="block text-sm font-medium" for="password">Password</label>
          <input
            id="password"
            type="password"
            autocomplete="current-password"
            class="mt-1 w-full rounded border px-3 py-2"
            [value]="password()"
            (input)="password.set($any($event.target).value)"
          />
        </div>

        <button
          type="submit"
          [disabled]="submitting()"
          class="btn btn-primary w-full justify-center py-2.5 disabled:opacity-50"
        >
          {{ submitting() ? 'Logging in…' : 'Log in' }}
        </button>
      </form>

      <p class="mt-4 text-sm">
        No account?
        <a [routerLink]="loc.link('register')" class="underline">Register</a>
      </p>
    </section>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cart = inject(CartStore);
  private readonly favorites = inject(FavoritesStore);
  readonly loc = inject(LocaleService);

  readonly email = signal('');
  readonly password = signal('');
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitting.set(true);
    this.formError.set(null);
    try {
      await this.auth.login({ email: this.email(), password: this.password() });
      await Promise.all([this.favorites.syncOnLogin(), this.cart.load()]);
      const redirect = this.route.snapshot.queryParamMap.get('redirect');
      await (redirect ? this.router.navigateByUrl(redirect) : this.router.navigate(this.loc.link('account')));
    } catch (err) {
      this.formError.set(extractError(err));
    } finally {
      this.submitting.set(false);
    }
  }
}

/** Pull the first useful message out of a Laravel 422 / generic error response. */
export function extractError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string; errors?: Record<string, string[]> };
    const firstField = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;
    return firstField ?? body?.message ?? `Request failed (${err.status}).`;
  }
  return 'Something went wrong. Please try again.';
}
