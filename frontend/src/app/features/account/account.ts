import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LocaleService } from '../../core/locale.service';

@Component({
  selector: 'app-account',
  imports: [RouterLink],
  template: `
    @let u = auth.user();
    @if (u) {
      <section class="mx-auto max-w-lg p-6">
        <h1 class="mb-4 text-2xl font-semibold">My account</h1>
        <dl class="space-y-2">
          <div class="flex gap-2">
            <dt class="w-24 font-medium">Name</dt>
            <dd>{{ u.name }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="w-24 font-medium">Email</dt>
            <dd>{{ u.email }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="w-24 font-medium">Roles</dt>
            <dd>{{ u.roles.join(', ') || '—' }}</dd>
          </div>
        </dl>

        @if (auth.can('products.update')) {
          <p class="mt-4 rounded bg-amber-50 p-2 text-sm">
            You have staff access — the admin area lands in a later milestone.
          </p>
        }

        <p class="mt-6">
          <a [routerLink]="loc.link('orders')" class="underline">My orders →</a>
        </p>

        <button
          (click)="logout()"
          class="mt-4 rounded border px-4 py-2 hover:bg-gray-50"
        >
          Log out
        </button>
      </section>
    }
  `,
})
export class Account {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loc = inject(LocaleService);

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(this.loc.link('login'));
  }
}
