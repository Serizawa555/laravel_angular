import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LocaleService } from '../../core/locale.service';
import { CartStore } from '../../stores/cart.store';
import { FavoritesStore } from '../../stores/favorites.store';
import { extractError } from './login';

@Component({
  selector: 'app-register',
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-sm p-6">
      <h1 class="mb-4 text-2xl font-semibold">Create an account</h1>

      @if (formError()) {
        <p class="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{{ formError() }}</p>
      }

      <form (submit)="submit($event)" class="space-y-4">
        <div>
          <label class="block text-sm font-medium" for="name">Name</label>
          <input
            id="name"
            class="mt-1 w-full rounded border px-3 py-2"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
          />
        </div>

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
            autocomplete="new-password"
            class="mt-1 w-full rounded border px-3 py-2"
            [value]="password()"
            (input)="password.set($any($event.target).value)"
          />
        </div>

        <div>
          <label class="block text-sm font-medium" for="confirm">Confirm password</label>
          <input
            id="confirm"
            type="password"
            autocomplete="new-password"
            class="mt-1 w-full rounded border px-3 py-2"
            [value]="confirm()"
            (input)="confirm.set($any($event.target).value)"
          />
        </div>

        <button
          type="submit"
          [disabled]="submitting()"
          class="btn btn-primary w-full justify-center py-2.5 disabled:opacity-50"
        >
          {{ submitting() ? 'Creating…' : 'Create account' }}
        </button>
      </form>

      <p class="mt-4 text-sm">
        Already have an account?
        <a [routerLink]="loc.link('login')" class="underline">Log in</a>
      </p>
    </section>
  `,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cart = inject(CartStore);
  private readonly favorites = inject(FavoritesStore);
  readonly loc = inject(LocaleService);

  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirm = signal('');
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitting.set(true);
    this.formError.set(null);
    try {
      await this.auth.register({
        name: this.name(),
        email: this.email(),
        password: this.password(),
        password_confirmation: this.confirm(),
      });
      await Promise.all([this.favorites.syncOnLogin(), this.cart.load()]);
      await this.router.navigate(this.loc.link('account'));
    } catch (err) {
      this.formError.set(extractError(err));
    } finally {
      this.submitting.set(false);
    }
  }
}
