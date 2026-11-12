import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { CatalogService } from '../../core/catalog.service';
import { Facets, Paginated, ProductCard } from '../../core/catalog.model';
import { MoneyPipe } from '../../core/money.pipe';
import { ProductCardComponent } from './product-card';

type View = 'grid' | 'list';
const TERM_AXES = ['brand', 'segment'] as const;
const OPTION_AXES = ['color', 'ram', 'storage'] as const;
const AXES = [...TERM_AXES, ...OPTION_AXES] as const;

@Component({
  selector: 'app-listing',
  imports: [TranslocoPipe, MoneyPipe, ProductCardComponent],
  template: `
    <section class="mx-auto max-w-6xl p-4">
      <div class="flex flex-col gap-6 md:flex-row">
        <!-- Filters -->
        <aside class="w-full shrink-0 self-start rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:w-64">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-ink">{{ 'listing.filters' | transloco }}</h2>
            <button class="text-xs font-medium text-brand hover:underline" (click)="clearAll()">{{ 'listing.clear' | transloco }}</button>
          </div>

          @let f = facets();
          @if (f) {
            @if (!presetType && f.type.length) {
              <fieldset class="mt-4">
                <legend class="text-sm font-medium">{{ 'facet.type' | transloco }}</legend>
                @for (t of f.type; track t.value) {
                  <label class="mt-1 flex items-center gap-2 text-sm">
                    <input type="checkbox" [checked]="has('type', t.value)" (change)="toggle('type', t.value)" />
                    {{ 'type.' + t.value | transloco }} <span class="text-gray-400">({{ t.count }})</span>
                  </label>
                }
              </fieldset>
            }

            @for (axis of termAxes; track axis) {
              @if (f[axis].length) {
                <fieldset class="mt-4">
                  <legend class="text-sm font-medium">{{ 'facet.' + axis | transloco }}</legend>
                  @for (t of f[axis]; track t.slug) {
                    <label class="mt-1 flex items-center gap-2 text-sm">
                      <input type="checkbox" [checked]="has(axis, t.slug)" (change)="toggle(axis, t.slug)" />
                      {{ t.name }} <span class="text-gray-400">({{ t.count }})</span>
                    </label>
                  }
                </fieldset>
              }
            }

            @for (axis of optionAxes; track axis) {
              @if (f[axis].length) {
                <fieldset class="mt-4">
                  <legend class="text-sm font-medium">{{ 'facet.' + axis | transloco }}</legend>
                  @for (opt of f[axis]; track opt.code) {
                    <label class="mt-1 flex items-center gap-2 text-sm">
                      <input type="checkbox" [checked]="has(axis, opt.code)" (change)="toggle(axis, opt.code)" />
                      @if (axis === 'color' && opt.meta?.hex) {
                        <span class="inline-block h-3 w-3 rounded-full border" [style.background]="opt.meta!.hex"></span>
                      }
                      {{ opt.label }} <span class="text-gray-400">({{ opt.count }})</span>
                    </label>
                  }
                </fieldset>
              }
            }

            <fieldset class="mt-4">
              <legend class="text-sm font-medium">{{ 'listing.price' | transloco }}</legend>
              <p class="text-xs text-gray-500">{{ f.price.min | money }} – {{ f.price.max | money }}</p>
              <label class="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" [checked]="has('in_stock', '1')" (change)="toggleStock()" />
                {{ 'listing.in_stock' | transloco }}
              </label>
            </fieldset>
          }
        </aside>

        <!-- Results -->
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-3">
            <input
              class="field flex-1"
              [placeholder]="'listing.search_placeholder' | transloco"
              [value]="search()"
              (input)="search.set($any($event.target).value)"
              (keyup.enter)="applySearch()"
            />
            <select class="field w-auto" [value]="sort()" (change)="setSort($any($event.target).value)">
              <option value="-created_at">{{ 'listing.sort_newest' | transloco }}</option>
              <option value="price">{{ 'listing.sort_price_asc' | transloco }}</option>
              <option value="-price">{{ 'listing.sort_price_desc' | transloco }}</option>
              <option value="name">{{ 'listing.sort_name' | transloco }}</option>
            </select>
            <div class="flex overflow-hidden rounded-md border border-gray-300 text-sm">
              <button class="px-2.5 py-2" [class.bg-brand]="view() === 'grid'" [class.text-white]="view() === 'grid'" (click)="setView('grid')">▦</button>
              <button class="px-2.5 py-2" [class.bg-brand]="view() === 'list'" [class.text-white]="view() === 'list'" (click)="setView('list')">☰</button>
            </div>
          </div>

          <p class="mt-3 text-sm text-gray-500">{{ 'listing.results' | transloco: { count: total() } }}</p>

          @if (products(); as page) {
            @if (page.data.length === 0) {
              <p class="mt-8 text-center text-gray-500">{{ 'listing.empty' | transloco }}</p>
            } @else {
              <div
                class="mt-4 grid gap-4"
                [class.grid-cols-2]="view() === 'grid'"
                [class.md:grid-cols-3]="view() === 'grid'"
                [class.grid-cols-1]="view() === 'list'"
              >
                @for (p of page.data; track p.id) {
                  <app-product-card [product]="p" [list]="view() === 'list'" />
                }
              </div>

              @if (page.meta.last_page > 1) {
                <div class="mt-6 flex items-center justify-center gap-2">
                  @for (n of pages(); track n) {
                    <button
                      class="h-9 w-9 rounded-md border border-gray-300 text-sm font-medium transition hover:border-brand"
                      [class.bg-brand]="n === page.meta.current_page"
                      [class.text-white]="n === page.meta.current_page"
                      [class.border-brand]="n === page.meta.current_page"
                      (click)="goTo(n)"
                    >{{ n }}</button>
                  }
                </div>
              }
            }
          } @else {
            <div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
              @for (s of [1, 2, 3, 4, 5, 6]; track s) {
                <div class="h-56 animate-pulse rounded-lg bg-gray-100"></div>
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class Listing {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);

  readonly termAxes = TERM_AXES;
  readonly optionAxes = OPTION_AXES;
  readonly presetType = this.route.snapshot.data['presetType'] as string | undefined;

  private readonly qp = toSignal(this.route.queryParamMap, { requireSync: true });
  readonly products = signal<Paginated<ProductCard> | null>(null);
  readonly facets = signal<Facets | null>(null);
  readonly search = signal('');
  readonly view = signal<View>((localStorage.getItem('view') as View) || 'grid');

  readonly sort = computed(() => this.qp().get('sort') ?? '-created_at');
  readonly total = computed(() => this.products()?.meta.total ?? 0);
  readonly pages = computed(() => {
    const last = this.products()?.meta.last_page ?? 1;
    return Array.from({ length: last }, (_, i) => i + 1);
  });

  constructor() {
    effect(() => {
      const qp = this.qp();
      this.products.set(null);
      this.catalog.products(this.params(qp, false)).subscribe((r) => this.products.set(r));
      this.catalog.facets(this.params(qp, true)).subscribe((r) => this.facets.set(r.data));
      this.search.set(qp.get('q') ?? '');
    });
  }

  // --- URL <-> API param mapping ---

  private params(qp: ParamMap, forFacets: boolean): Record<string, string> {
    const out: Record<string, string> = {};
    const put = (k: string, v: string | null) => {
      if (v) out[`filter[${k}]`] = v;
    };
    put('type', this.presetType ?? qp.get('type'));
    for (const axis of AXES) put(axis, qp.get(axis));
    put('price_min', qp.get('price_min'));
    put('price_max', qp.get('price_max'));
    put('in_stock', qp.get('in_stock'));
    put('q', qp.get('q'));

    if (!forFacets) {
      out['sort'] = qp.get('sort') ?? '-created_at';
      out['page[number]'] = qp.get('page') ?? '1';
      out['page[size]'] = '12';
    }
    return out;
  }

  has(key: string, value: string): boolean {
    return (this.qp().get(key) ?? '').split(',').includes(value);
  }

  toggle(key: string, value: string): void {
    const current = (this.qp().get(key) ?? '').split(',').filter(Boolean);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    this.merge({ [key]: next.length ? next.join(',') : null, page: null });
  }

  toggleStock(): void {
    this.merge({ in_stock: this.has('in_stock', '1') ? null : '1', page: null });
  }

  applySearch(): void {
    this.merge({ q: this.search() || null, page: null });
  }

  setSort(value: string): void {
    this.merge({ sort: value, page: null });
  }

  setView(view: View): void {
    this.view.set(view);
    localStorage.setItem('view', view);
  }

  goTo(n: number): void {
    this.merge({ page: n === 1 ? null : String(n) });
  }

  clearAll(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  private merge(queryParams: Record<string, string | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
  }
}
