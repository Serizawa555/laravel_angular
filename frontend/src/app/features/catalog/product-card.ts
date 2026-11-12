import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ProductCard } from '../../core/catalog.model';
import { MoneyPipe } from '../../core/money.pipe';
import { LocaleService } from '../../core/locale.service';
import { FavoritesStore } from '../../stores/favorites.store';
import { CartStore } from '../../stores/cart.store';
import { ToastService } from '../../core/toast.service';

const PLACEHOLDER = '/images/placeholder.svg';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, TranslocoPipe, MoneyPipe],
  template: `
    @let p = product();
    <!-- <article> root; the TITLE is a stretched link covering the card. Buttons are siblings
         with z-10 so they sit above it (valid HTML — no interactive nesting). -->
    <article
      class="group relative flex rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
      [class.flex-col]="!list()"
      [class.flex-row]="list()"
      [class.gap-4]="list()"
    >
      <button
        type="button"
        class="absolute right-2 top-2 z-10 rounded-full bg-white/90 px-2 py-0.5 text-lg leading-none shadow-sm transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-brand"
        [class.text-pink]="fav.isFavorite(p.id)"
        [class.text-gray-300]="!fav.isFavorite(p.id)"
        (click)="fav.toggle(p.id)"
        [attr.aria-pressed]="fav.isFavorite(p.id)"
        [attr.aria-label]="'product.add_to_favorites' | transloco"
      >{{ fav.isFavorite(p.id) ? '♥' : '♡' }}</button>

      <!-- Image (not a link; the stretched title link covers it) -->
      <div
        class="shrink-0 overflow-hidden rounded-lg bg-mist"
        [class.aspect-square]="!list()"
        [class.w-full]="!list()"
        [class.h-28]="list()"
        [class.w-28]="list()"
      >
        <img [src]="p.image || placeholder" [alt]="p.name" loading="lazy" class="h-full w-full object-contain p-2" />
      </div>

      <div class="mt-3 flex min-w-0 flex-1 flex-col" [class.mt-0]="list()">
        <p class="text-xs font-medium tracking-wide text-gray-400 uppercase">{{ p.brand }}</p>
        <a
          [routerLink]="loc.link('p', p.slug)"
          class="truncate font-semibold text-ink after:absolute after:inset-0 group-hover:text-brand focus-visible:underline"
        >{{ p.name }}</a>

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

        <span class="badge mt-2 self-start" [class.badge-green]="p.in_stock" [class.badge-gray]="!p.in_stock">
          {{ (p.in_stock ? 'product.in_stock' : 'product.out_of_stock') | transloco }}
        </span>

        <div class="mt-3 flex-1"></div>

        <!-- Action: out of stock | choose options (multi-variant) | quick add (single variant) -->
        @if (!p.in_stock) {
          <button
            type="button"
            disabled
            class="relative z-10 flex w-full cursor-not-allowed items-center justify-center rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-400"
            [title]="'product.out_of_stock' | transloco"
          >{{ 'product.out_of_stock' | transloco }}</button>
        } @else if (hasOptions()) {
          <a
            [routerLink]="loc.link('p', p.slug)"
            class="btn btn-ghost relative z-10 w-full justify-center"
          >{{ 'product.choose_options' | transloco }}</a>
        } @else {
          <button
            type="button"
            class="btn btn-accent relative z-10 w-full justify-center"
            [disabled]="adding()"
            (click)="quickAdd()"
            [title]="'product.add_to_cart' | transloco"
          >
            @if (adding()) {
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
              </svg>
            } @else {
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
                <path d="M2 3h3l2.2 11a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.5L22 7H6" />
              </svg>
              {{ 'product.add_to_cart' | transloco }}
            }
          </button>
        }
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<ProductCard>();
  readonly list = input(false);
  readonly loc = inject(LocaleService);
  readonly fav = inject(FavoritesStore);
  private readonly cart = inject(CartStore);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly placeholder = PLACEHOLDER;
  readonly adding = signal(false);

  /** Multiple variants → send the shopper to the PDP to choose, don't guess. */
  readonly hasOptions = computed(() => (this.product().variant_count ?? 1) > 1);

  async quickAdd(): Promise<void> {
    const p = this.product();
    if (!p.default_variant_id || this.adding()) return;
    this.adding.set(true);
    try {
      await this.cart.add(p.default_variant_id, 1);
      this.toasts.success(`${this.transloco.translate('toast.added')} — ${p.name}`, {
        label: this.transloco.translate('toast.view_cart'),
        link: this.loc.link('cart'),
      });
    } catch (err) {
      const message =
        err instanceof HttpErrorResponse
          ? (err.error?.message ?? this.transloco.translate('toast.add_failed'))
          : this.transloco.translate('toast.add_failed');
      this.toasts.error(message);
    } finally {
      this.adding.set(false);
    }
  }
}
