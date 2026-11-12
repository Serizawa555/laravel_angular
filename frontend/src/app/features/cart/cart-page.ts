import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CartStore } from '../../stores/cart.store';
import { MoneyPipe } from '../../core/money.pipe';
import { LocaleService } from '../../core/locale.service';

@Component({
  selector: 'app-cart-page',
  imports: [RouterLink, TranslocoPipe, MoneyPipe],
  template: `
    <section class="mx-auto max-w-3xl p-4">
      <h1 class="text-2xl font-semibold text-ink">{{ 'nav.cart' | transloco }}</h1>

      @if (cart.items().length === 0) {
        <p class="mt-6 text-gray-500">{{ 'listing.empty' | transloco }}</p>
      } @else {
        <ul class="mt-4 divide-y">
          @for (item of cart.items(); track item.id) {
            <li class="flex items-center gap-4 py-3">
              <a [routerLink]="loc.link('p', item.product.slug)" class="h-16 w-16 shrink-0 rounded bg-gray-100"></a>
              <div class="min-w-0 flex-1">
                <a [routerLink]="loc.link('p', item.product.slug)" class="font-medium hover:underline">{{ item.product.name }}</a>
                <p class="text-xs text-gray-500">{{ optionList(item.variant.options) }}</p>
                <p class="text-sm">{{ item.unit_price | money }}</p>
              </div>
              <input
                type="number"
                min="0"
                max="99"
                class="w-16 rounded border px-2 py-1"
                [value]="item.quantity"
                (change)="update(item.id, $any($event.target).value)"
              />
              <span class="w-24 text-right font-medium">{{ item.line_total | money }}</span>
              <button class="text-gray-400 hover:text-red-500" (click)="cart.remove(item.id)" aria-label="Remove">✕</button>
            </li>
          }
        </ul>

        <div class="mt-6 flex items-center justify-between border-t pt-4">
          <span class="text-lg font-semibold">{{ cart.subtotal() | money }}</span>
          <a [routerLink]="loc.link('checkout')" class="btn btn-accent btn-lg">
            {{ 'nav.checkout' | transloco }} →
          </a>
        </div>
      }
    </section>
  `,
})
export class CartPage {
  readonly cart = inject(CartStore);
  readonly loc = inject(LocaleService);

  optionList(options: Record<string, string>): string {
    return Object.values(options).join(' · ');
  }

  update(id: number, value: string): void {
    this.cart.update(id, Math.max(0, Math.min(99, +value || 0)));
  }
}
