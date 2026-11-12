import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { CatalogService } from '../../core/catalog.service';
import { OptionValueRef, ProductCard, ProductDetail, Variant } from '../../core/catalog.model';
import { MoneyPipe } from '../../core/money.pipe';
import { ProductCardComponent } from '../catalog/product-card';
import { CartStore } from '../../stores/cart.store';
import { FavoritesStore } from '../../stores/favorites.store';
import { RecentlyViewedStore } from '../../stores/recently-viewed.store';

@Component({
  selector: 'app-product',
  imports: [TranslocoPipe, MoneyPipe, ProductCardComponent],
  template: `
    @if (product(); as p) {
      <section class="mx-auto max-w-5xl p-4">
        <div class="grid gap-8 md:grid-cols-2">
          <!-- Gallery -->
          <div class="aspect-square overflow-hidden rounded-2xl bg-mist">
            <img [src]="p.image || placeholder" [alt]="p.name" class="h-full w-full object-contain p-6" />
          </div>

          <!-- Summary + variant selector -->
          <div>
            <p class="text-sm font-medium tracking-wide text-gray-400 uppercase">{{ p.brand?.name }}</p>
            <h1 class="text-3xl font-bold text-ink">{{ p.name }}</h1>
            @if (p.segment) {
              <span class="badge badge-gray mt-2">{{ p.segment.name }}</span>
            }

            <div class="mt-4 flex items-baseline gap-2">
              <span class="text-3xl font-bold text-brand">{{ price() | money }}</span>
              @if (compareAt()) {
                <span class="text-sm text-gray-400 line-through">{{ compareAt() | money }}</span>
              }
            </div>

            <p class="mt-1 text-sm" [class.text-green-600]="stock() > 0" [class.text-red-500]="stock() === 0">
              @if (stock() === 0) {
                {{ 'product.out_of_stock' | transloco }}
              } @else if (stock() <= 3) {
                {{ 'product.low_stock' | transloco: { count: stock() } }}
              } @else {
                {{ 'product.in_stock' | transloco }}
              }
            </p>

            @if (p.short_description) {
              <p class="mt-3 text-gray-600">{{ p.short_description }}</p>
            }

            <!-- Variant axes -->
            @for (axis of axes(); track axis) {
              <fieldset class="mt-4">
                <legend class="text-sm font-medium">{{ ('facet.' + axis) | transloco }}</legend>
                <div class="mt-2 flex flex-wrap gap-2">
                  @for (opt of optionsFor(axis); track opt.code) {
                    <button
                      class="rounded-lg border px-3 py-1.5 text-sm font-medium transition"
                      [class.border-brand]="selected()[axis] === opt.code"
                      [class.bg-brand-50]="selected()[axis] === opt.code"
                      [class.text-brand]="selected()[axis] === opt.code"
                      [class.border-gray-300]="selected()[axis] !== opt.code"
                      [class.opacity-40]="!available(axis, opt.code)"
                      [disabled]="!available(axis, opt.code)"
                      (click)="choose(axis, opt.code)"
                    >
                      @if (axis === 'color' && opt.meta?.hex) {
                        <span class="mr-1 inline-block h-3 w-3 rounded-full border align-middle" [style.background]="opt.meta!.hex"></span>
                      }
                      {{ opt.label }}
                    </button>
                  }
                </div>
              </fieldset>
            }

            <!-- Actions -->
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <label class="flex items-center gap-1 text-sm">
                {{ 'product.quantity' | transloco }}
                <input
                  type="number"
                  min="1"
                  max="99"
                  class="w-16 rounded border px-2 py-1"
                  [value]="qty()"
                  (input)="qty.set(+$any($event.target).value || 1)"
                />
              </label>
              <button
                class="btn btn-accent btn-lg disabled:opacity-40"
                [disabled]="stock() === 0 || !selectedVariant() || adding()"
                (click)="addToCart()"
              >
                {{ 'product.add_to_cart' | transloco }}
              </button>
              <button
                class="rounded-lg border px-3 py-2.5 text-lg transition"
                [class.border-pink]="isFav()"
                [class.text-pink]="isFav()"
                [class.border-gray-300]="!isFav()"
                [class.text-gray-400]="!isFav()"
                (click)="toggleFavorite()"
                [attr.aria-pressed]="isFav()"
                aria-label="Toggle favorite"
              >
                {{ isFav() ? '♥' : '♡' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Description -->
        @if (p.description) {
          <div class="mt-10">
            <h2 class="text-lg font-semibold text-ink">{{ 'product.description' | transloco }}</h2>
            <p class="mt-2 whitespace-pre-line text-gray-700">{{ p.description }}</p>
          </div>
        }

        <!-- Specs -->
        @if (p.spec_groups.length) {
          <div class="mt-10">
            <h2 class="text-lg font-semibold text-ink">{{ 'product.specs' | transloco }}</h2>
            @for (group of p.spec_groups; track group.group) {
              <div class="mt-4">
                <h3 class="text-sm font-medium text-gray-500">{{ group.group }}</h3>
                <table class="mt-1 w-full text-sm">
                  <tbody>
                    @for (row of group.rows; track row.key) {
                      <tr class="border-b">
                        <td class="py-1.5 pr-4 text-gray-600">{{ row.label }}</td>
                        <td class="py-1.5 font-medium">{{ specValue(row.value) }}{{ row.unit ? ' ' + row.unit : '' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- Compatibility -->
        @if (p.compatible.length) {
          <div class="mt-10">
            <h2 class="text-lg font-semibold text-ink">
              {{ (p.type === 'phone' ? 'product.accessories' : 'product.fits') | transloco }}
            </h2>
            <div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              @for (c of p.compatible; track c.id) {
                <app-product-card [product]="c" />
              }
            </div>
          </div>
        }

        <!-- Related -->
        @if (p.related.length) {
          <div class="mt-10">
            <h2 class="text-lg font-semibold text-ink">{{ 'product.related' | transloco }}</h2>
            <div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              @for (r of p.related; track r.id) {
                <app-product-card [product]="r" />
              }
            </div>
          </div>
        }
      </section>
    }
  `,
})
export class ProductPage {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartStore);
  private readonly favorites = inject(FavoritesStore);
  private readonly recent = inject(RecentlyViewedStore);
  private readonly params = toSignal(this.route.paramMap, { requireSync: true });

  readonly product = signal<ProductDetail | null>(null);
  readonly selected = signal<Record<string, string>>({});
  readonly qty = signal(1);
  readonly adding = signal(false);
  readonly placeholder = '/images/placeholder.svg';

  /** Axes present on this product's variants (color / ram / storage), in a stable order. */
  readonly axes = computed(() => {
    const order = ['color', 'ram', 'storage'];
    const present = new Set<string>();
    for (const v of this.product()?.variants ?? []) {
      Object.keys(v.options).forEach((a) => present.add(a));
    }
    return order.filter((a) => present.has(a));
  });

  /** The variant matching all current selections (if any). */
  readonly selectedVariant = computed<Variant | undefined>(() =>
    this.product()?.variants.find((v) => this.matches(v, this.selected())),
  );

  readonly price = computed(() => this.selectedVariant()?.price ?? this.product()?.from_price ?? 0);
  readonly compareAt = computed(() => this.selectedVariant()?.compare_at_price ?? null);
  readonly stock = computed(() => this.selectedVariant()?.stock ?? 0);

  constructor() {
    // Reload when the slug changes; seed the selection from the default variant.
    effect(() => {
      const slug = this.params().get('slug');
      if (!slug) return;
      this.catalog.product(slug).subscribe((r) => {
        this.product.set(r.data);
        const def = r.data.variants.find((v) => v.is_default) ?? r.data.variants[0];
        this.selected.set(def ? { ...def.options } : {});
        this.recent.add(this.asCard(r.data));
      });
    });
  }

  optionsFor(axis: string): OptionValueRef[] {
    const seen = new Map<string, OptionValueRef>();
    for (const v of this.product()?.variants ?? []) {
      for (const ov of v.option_values) {
        if (ov.type === axis && !seen.has(ov.code)) seen.set(ov.code, ov);
      }
    }
    return [...seen.values()];
  }

  /** A value is available if, combined with the other current selections, an in-stock variant exists. */
  available(axis: string, code: string): boolean {
    const probe = { ...this.selected(), [axis]: code };
    return (this.product()?.variants ?? []).some(
      (v) => v.stock > 0 && Object.entries(probe).every(([a, c]) => v.options[a] === c),
    );
  }

  choose(axis: string, code: string): void {
    if (!this.available(axis, code)) return;
    this.selected.update((s) => ({ ...s, [axis]: code }));
  }

  isFav(): boolean {
    const p = this.product();
    return p ? this.favorites.isFavorite(p.id) : false;
  }

  async addToCart(): Promise<void> {
    const variant = this.selectedVariant();
    if (!variant) return;
    this.adding.set(true);
    try {
      await this.cart.add(variant.id, this.qty());
    } finally {
      this.adding.set(false);
    }
  }

  toggleFavorite(): void {
    const p = this.product();
    if (p) this.favorites.toggle(p.id);
  }

  private asCard(p: ProductDetail): ProductCard {
    const inStock = p.variants.filter((v) => v.stock > 0);
    const defaultVariant = (inStock.length ? inStock : p.variants).find((v) => v.is_default) ?? inStock[0];
    return {
      id: p.id,
      slug: p.slug,
      type: p.type,
      name: p.name,
      short_description: p.short_description,
      brand: p.brand?.name ?? null,
      brand_slug: p.brand?.slug ?? null,
      segment: p.segment?.name ?? null,
      from_price: p.from_price,
      compare_at_price: null,
      in_stock: inStock.length > 0,
      is_featured: p.is_featured,
      featured_position: null,
      image: p.image,
      default_variant_id: defaultVariant?.id ?? null,
      variant_count: p.variants.length,
    };
  }

  specValue(value: unknown): string {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    return String(value ?? '');
  }

  private matches(v: Variant, sel: Record<string, string>): boolean {
    const keys = Object.keys(sel);
    return keys.length > 0 && keys.every((a) => v.options[a] === sel[a]);
  }
}
