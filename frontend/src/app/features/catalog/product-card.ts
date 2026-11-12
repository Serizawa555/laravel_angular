import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ProductCard } from '../../core/catalog.model';
import { MoneyPipe } from '../../core/money.pipe';
import { LocaleService } from '../../core/locale.service';
import { FavoritesStore } from '../../stores/favorites.store';
import { CartStore } from '../../stores/cart.store';

const PLACEHOLDER = '/images/placeholder.svg';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, TranslocoPipe, MoneyPipe],
  template: `
    @let p = product();
    <a
      [routerLink]="loc.link('p', p.slug)"
      class="group relative flex rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
      [class.flex-col]="!list()"
      [class.flex-row]="list()"
      [class.gap-4]="list()"
    >
      <button
        type="button"
        class="absolute right-2 top-2 z-10 rounded-full bg-white/90 px-2 py-0.5 text-lg leading-none shadow-sm transition hover:scale-110"
        [class.text-pink]="fav.isFavorite(p.id)"
        [class.text-gray-300]="!fav.isFavorite(p.id)"
        (click)="toggleFav($event)"
        [attr.aria-pressed]="fav.isFavorite(p.id)"
        aria-label="Toggle favorite"
      >{{ fav.isFavorite(p.id) ? '♥' : '♡' }}</button>

      <!-- Image -->
      <div
        class="shrink-0 overflow-hidden rounded-lg bg-mist"
        [class.aspect-square]="!list()"
        [class.w-full]="!list()"
        [class.h-28]="list()"
        [class.w-28]="list()"
      >
        <img
          [src]="p.image || placeholder"
          [alt]="p.name"
          loading="lazy"
          class="h-full w-full object-contain p-2"
        />
      </div>

      <div class="mt-3 flex min-w-0 flex-1 flex-col" [class.mt-0]="list()">
        <p class="text-xs font-medium tracking-wide text-gray-400 uppercase">{{ p.brand }}</p>
        <h3 class="truncate font-semibold text-ink group-hover:text-brand">{{ p.name }}</h3>

        @if (list() && p.short_description) {
          <p class="mt-1 line-clamp-2 text-sm text-gray-500">{{ p.short_description }}</p>
        }

        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-xs text-gray-400">{{ 'product.from' | transloco }}</span>
          <span class="text-lg font-bold text-ink">{{ p.from_price | money }}</span>
          @if (p.compare_at_price) {
            <span class="text-xs text-gray-400 line-through">{{ p.compare_at_price | money }}</span>
          }
        </div>

        <div class="mt-2 flex items-center justify-between gap-2">
          <span class="badge" [class.badge-green]="p.in_stock" [class.badge-gray]="!p.in_stock">
            {{ (p.in_stock ? 'product.in_stock' : 'product.out_of_stock') | transloco }}
          </span>

          <button
            type="button"
            class="btn btn-accent px-2.5 py-1.5 disabled:opacity-40"
            [disabled]="!p.in_stock || !p.default_variant_id || adding()"
            (click)="quickAdd($event)"
            [attr.aria-label]="'product.add_to_cart' | transloco"
            [title]="'product.add_to_cart' | transloco"
          >🛒 +</button>
        </div>
      </div>
    </a>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<ProductCard>();
  readonly list = input(false);
  readonly loc = inject(LocaleService);
  readonly fav = inject(FavoritesStore);
  private readonly cart = inject(CartStore);

  readonly placeholder = PLACEHOLDER;
  readonly adding = signal(false);

  toggleFav(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.fav.toggle(this.product());
  }

  async quickAdd(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const variantId = this.product().default_variant_id;
    if (!variantId || this.adding()) return;
    this.adding.set(true);
    try {
      await this.cart.add(variantId, 1);
    } finally {
      this.adding.set(false);
    }
  }
}
