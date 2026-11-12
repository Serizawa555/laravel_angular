import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoPipe } from '@jsverse/transloco';
import { CartStore } from '../../stores/cart.store';
import { CheckoutService } from '../../core/checkout.service';
import { MoneyPipe } from '../../core/money.pipe';
import { LocaleService } from '../../core/locale.service';

@Component({
  selector: 'app-checkout-page',
  imports: [TranslocoPipe, MoneyPipe],
  template: `
    <section class="mx-auto max-w-3xl p-4">
      <h1 class="text-2xl font-semibold text-ink">Checkout</h1>

      @if (cart.items().length === 0) {
        <p class="mt-6 text-gray-500">{{ 'listing.empty' | transloco }}</p>
      } @else {
        @if (error()) {
          <p class="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{{ error() }}</p>
        }

        <form (submit)="submit($event)" class="mt-4 grid gap-6 md:grid-cols-2">
          <div class="space-y-3">
            <h2 class="font-medium">Contact</h2>
            <input class="field" placeholder="Name" [value]="f.name()" (input)="f.name.set($any($event.target).value)" />
            <input class="field" placeholder="Email" type="email" [value]="f.email()" (input)="f.email.set($any($event.target).value)" />
            <input class="field" placeholder="Phone" [value]="f.phone()" (input)="f.phone.set($any($event.target).value)" />

            <h2 class="pt-2 font-medium">Shipping</h2>
            <input class="field" placeholder="Address" [value]="f.line1()" (input)="f.line1.set($any($event.target).value)" />
            <input class="field" placeholder="City" [value]="f.city()" (input)="f.city.set($any($event.target).value)" />

            <h2 class="pt-2 font-medium">Payment (mock)</h2>
            <input class="field" placeholder="Card number (try 4242 4242 4242 4242)" [value]="f.card()" (input)="f.card.set($any($event.target).value)" />
            <p class="text-xs text-gray-500">4242… succeeds · 4000 0000 0000 0002 is declined.</p>
          </div>

          <div>
            <h2 class="font-medium">Summary</h2>
            <ul class="mt-2 divide-y text-sm">
              @for (item of cart.items(); track item.id) {
                <li class="flex justify-between py-2">
                  <span>{{ item.product.name }} × {{ item.quantity }}</span>
                  <span>{{ item.line_total | money }}</span>
                </li>
              }
            </ul>
            <p class="mt-3 flex justify-between border-t pt-3 text-lg font-semibold">
              <span>Total</span><span>{{ cart.subtotal() | money }}</span>
            </p>
            <button type="submit" [disabled]="submitting()" class="btn btn-accent mt-4 w-full justify-center py-2.5 disabled:opacity-50">
              {{ submitting() ? '…' : 'Pay' }}
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class CheckoutPage {
  readonly cart = inject(CartStore);
  private readonly checkout = inject(CheckoutService);
  private readonly router = inject(Router);
  private readonly loc = inject(LocaleService);

  readonly f = {
    name: signal(''),
    email: signal(''),
    phone: signal(''),
    line1: signal(''),
    city: signal(''),
    card: signal(''),
  };
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitting.set(true);
    this.error.set(null);
    try {
      const order = await this.checkout.checkout({
        name: this.f.name(),
        email: this.f.email(),
        phone: this.f.phone() || undefined,
        shipping_address: { line1: this.f.line1(), city: this.f.city(), country: 'MD' },
        card: { number: this.f.card() },
      });
      await this.cart.load();
      await this.router.navigate(this.loc.link('order', order.order_number));
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse
          ? (err.error?.message ?? 'Checkout failed.')
          : 'Checkout failed.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
