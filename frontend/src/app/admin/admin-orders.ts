import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../core/admin.service';
import { AdminOrderRow } from '../core/admin.model';
import { MoneyPipe } from '../core/money.pipe';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-admin-orders',
  imports: [RouterLink, MoneyPipe],
  template: `
    <h1 class="text-xl font-semibold text-gray-900">Orders</h1>
    <table class="admin-table mt-4">
      <thead><tr><th class="py-2">Number</th><th>Customer</th><th>Status</th><th class="text-right">Total</th></tr></thead>
      <tbody>
        @for (o of orders(); track o.number) {
          <tr class="border-b">
            <td class="py-2 font-mono text-xs">
              <a [routerLink]="loc.link('admin', 'orders', o.number)" class="underline">{{ o.number }}</a>
            </td>
            <td>{{ o.name }} <span class="text-gray-400">{{ o.email }}</span></td>
            <td>{{ o.status }}</td>
            <td class="text-right">{{ o.total | money }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class AdminOrders {
  private readonly admin = inject(AdminService);
  readonly loc = inject(LocaleService);
  readonly orders = signal<AdminOrderRow[]>([]);

  constructor() {
    this.admin.orders().then((r) => this.orders.set(r.data));
  }
}
