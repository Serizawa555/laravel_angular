import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LocaleService } from '../core/locale.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-[80vh] bg-gray-50">
      <div class="mx-auto flex max-w-6xl flex-col gap-6 p-6 md:flex-row">
        <aside class="w-full shrink-0 self-start rounded-xl bg-slate-900 p-4 text-slate-200 md:w-56">
          <p class="px-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">Back office</p>
          <p class="mb-4 px-3 text-sm text-slate-400">{{ auth.user()?.name }}</p>
          <nav class="flex flex-col gap-1 text-sm">
            @for (item of items; track item.path) {
              @if (!item.perm || auth.can(item.perm)) {
                <a
                  [routerLink]="loc.link('admin', item.path)"
                  routerLinkActive="bg-indigo-600 text-white"
                  class="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <span aria-hidden="true">{{ item.icon }}</span> {{ item.label }}
                </a>
              }
            }
          </nav>
          <a [routerLink]="loc.link()" class="mt-4 block px-3 text-xs text-slate-500 hover:text-slate-300">← Back to shop</a>
        </aside>

        <main class="min-w-0 flex-1">
          <div class="card">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `,
})
export class AdminShell {
  readonly loc = inject(LocaleService);
  readonly auth = inject(AuthService);

  readonly items = [
    { path: 'products', label: 'Products', icon: '📦', perm: null },
    { path: 'featured', label: 'Featured', icon: '⭐', perm: 'featured.manage' },
    { path: 'orders', label: 'Orders', icon: '🧾', perm: 'orders.viewAny' },
    { path: 'users', label: 'Users', icon: '👤', perm: 'users.manage' },
    { path: 'taxonomies', label: 'Taxonomies', icon: '🏷️', perm: 'taxonomies.manage' },
    { path: 'attributes', label: 'Attributes', icon: '🧬', perm: 'attributes.manage' },
    { path: 'activity', label: 'Activity', icon: '📜', perm: 'activitylog.view' },
  ] as const;
}
