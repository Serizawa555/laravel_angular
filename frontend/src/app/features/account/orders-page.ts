import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CheckoutService } from '../../core/checkout.service';
import { OrderSummary } from '../../core/order.model';
import { MoneyPipe } from '../../core/money.pipe';
import { LocaleService } from '../../core/locale.service';

@Component({
  selector: 'app-orders-page',
  imports: [RouterLink, TranslocoPipe, MoneyPipe],
  template: `
    <section class="mx-auto max-w-3xl p-4">
      <h1 class="text-2xl font-semibold text-ink">Orders</h1>

      @if (orders().length === 0) {
        <p class="mt-6 text-gray-500">{{ 'listing.empty' | transloco }}</p>
      } @else {
        <table class="mt-4 w-full text-sm">
          <tbody>
            @for (o of orders(); track o.number) {
              <tr class="border-b">
                <td class="py-2">
                  <a [routerLink]="loc.link('order', o.number)" class="underline">{{ o.number }}</a>
                </td>
                <td class="py-2">{{ o.status }}</td>
                <td class="py-2 text-right">{{ o.total | money }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
})
export class OrdersPage {
  private readonly checkout = inject(CheckoutService);
  readonly loc = inject(LocaleService);
  readonly orders = signal<OrderSummary[]>([]);

  constructor() {
    this.checkout.myOrders().then((o) => this.orders.set(o));
  }
}
