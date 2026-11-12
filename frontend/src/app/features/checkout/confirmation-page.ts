import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CheckoutService } from '../../core/checkout.service';
import { OrderJson } from '../../core/order.model';
import { MoneyPipe } from '../../core/money.pipe';

@Component({
  selector: 'app-confirmation-page',
  imports: [MoneyPipe],
  template: `
    @if (order(); as o) {
      <section class="mx-auto max-w-3xl p-4">
        <h1 class="text-2xl font-semibold">Thank you! 🎉</h1>
        <p class="mt-1 text-gray-600">
          Order <strong>{{ o.order_number }}</strong> —
          <span [class.text-green-600]="o.status === 'paid'">{{ o.status }}</span>
        </p>

        <ul class="mt-4 divide-y">
          @for (item of o.items; track item.order_item_id) {
            <li class="flex justify-between py-2 text-sm">
              <span>{{ item.name }} × {{ item.quantity }} <span class="text-gray-400">{{ opts(item.options) }}</span></span>
              <span>{{ item.line_total | money }}</span>
            </li>
          }
        </ul>
        <p class="mt-3 flex justify-between border-t pt-3 text-lg font-semibold">
          <span>Total</span><span>{{ o.totals.total | money }}</span>
        </p>

        <div class="mt-8">
          <div class="flex items-center justify-between">
            <h2 class="font-medium">Order JSON</h2>
            <button class="rounded border px-3 py-1 text-sm" (click)="download(o)">Download JSON</button>
          </div>
          <pre class="mt-2 overflow-auto rounded bg-gray-900 p-4 text-xs text-gray-100">{{ pretty() }}</pre>
        </div>
      </section>
    }
  `,
})
export class ConfirmationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly checkout = inject(CheckoutService);
  private readonly params = toSignal(this.route.paramMap, { requireSync: true });

  readonly order = signal<OrderJson | null>(null);
  readonly pretty = computed(() => (this.order() ? JSON.stringify(this.order(), null, 2) : ''));

  constructor() {
    const number = this.params().get('number');
    if (number) {
      this.checkout.orderJson(number).then((o) => this.order.set(o));
    }
  }

  opts(options: Record<string, string> | null): string {
    return options ? Object.values(options).join(' · ') : '';
  }

  download(order: OrderJson): void {
    const blob = new Blob([JSON.stringify(order, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.order_number}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
