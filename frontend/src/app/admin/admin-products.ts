import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../core/admin.service';
import { AdminProduct } from '../core/admin.model';
import { AuthService } from '../core/auth.service';
import { LocaleService } from '../core/locale.service';
import { MoneyPipe } from '../core/money.pipe';

@Component({
  selector: 'app-admin-products',
  imports: [RouterLink, MoneyPipe],
  template: `
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">Products</h1>
      @if (auth.can('products.create')) {
        <a [routerLink]="loc.link('admin', 'products', 'new')" class="btn btn-primary">+ New product</a>
      }
    </div>

    <table class="admin-table mt-5">
      <thead>
        <tr><th>Name</th><th>Type</th><th>Status</th><th class="text-right">Price</th><th></th></tr>
      </thead>
      <tbody>
        @for (p of products(); track p.id) {
          <tr>
            <td class="font-medium text-gray-900">{{ p.name.en }}</td>
            <td class="text-gray-500">{{ p.type }}</td>
            <td>
              <span class="badge" [class.badge-green]="p.status === 'published'" [class.badge-gray]="p.status !== 'published'">{{ p.status }}</span>
              @if (p.deleted_at) { <span class="badge badge-amber ml-1">deleted</span> }
            </td>
            <td class="text-right tabular-nums">{{ p.base_price | money }}</td>
            <td class="text-right whitespace-nowrap">
              <a [routerLink]="loc.link('admin', 'products', p.id)" class="font-medium text-indigo-600 hover:underline">Edit</a>
              @if (auth.can('products.publish')) {
                @if (p.status === 'published') {
                  <button class="btn btn-ghost ml-2 px-2 py-0.5 text-xs" (click)="unpublish(p)">Unpublish</button>
                } @else {
                  <button class="btn btn-primary ml-2 px-2 py-0.5 text-xs" (click)="publish(p)">Publish</button>
                }
              }
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class AdminProducts {
  private readonly admin = inject(AdminService);
  readonly auth = inject(AuthService);
  readonly loc = inject(LocaleService);
  readonly products = signal<AdminProduct[]>([]);

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.products.set((await this.admin.products('?page[size]=100')).data);
  }

  async publish(p: AdminProduct): Promise<void> {
    await this.admin.publish(p.id);
    this.load();
  }

  async unpublish(p: AdminProduct): Promise<void> {
    await this.admin.unpublish(p.id);
    this.load();
  }
}
