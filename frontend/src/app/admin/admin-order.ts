import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../core/admin.service';
import { OrderJson } from '../core/order.model';
import { MoneyPipe } from '../core/money.pipe';

@Component({
  selector: 'app-admin-order',
  imports: [MoneyPipe],
  template: `
    @if (order(); as o) {
      <h1 class="text-xl font-semibold text-gray-900">Order {{ o.order_number }}</h1>
      <p class="mt-1 text-sm">
        <span class="badge" [class.badge-green]="o.status === 'paid'" [class.badge-gray]="o.status !== 'paid'">{{ o.status }}</span>
        · {{ o.customer.name }} ({{ o.customer.email }})
      </p>

      <table class="admin-table mt-4">
        <tbody>
          @for (i of o.items; track i.order_item_id) {
            <tr>
              <td class="py-2">{{ i.name }} <span class="text-xs text-gray-400">{{ opts(i.options) }}</span></td>
              <td class="text-center">× {{ i.quantity }}</td>
              <td class="text-right">{{ i.line_total | money }}</td>
            </tr>
          }
        </tbody>
      </table>
      <p class="mt-3 flex justify-between border-t pt-3 font-semibold"><span>Total</span><span>{{ o.totals.total | money }}</span></p>

      <pre class="mt-6 overflow-auto rounded bg-gray-900 p-4 text-xs text-gray-100">{{ pretty() }}</pre>
    }
  `,
})
export class AdminOrder {
  private readonly route = inject(ActivatedRoute);
  private readonly admin = inject(AdminService);
  readonly order = signal<OrderJson | null>(null);
  readonly pretty = computed(() => (this.order() ? JSON.stringify(this.order(), null, 2) : ''));

  constructor() {
    const number = this.route.snapshot.paramMap.get('number');
    if (number) this.admin.order(number).then((r) => this.order.set(r.data));
  }

  opts(options: Record<string, string> | null): string {
    return options ? Object.values(options).join(' · ') : '';
  }
}
