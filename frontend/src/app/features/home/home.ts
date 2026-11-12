import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { register } from 'swiper/element/bundle';
import { CatalogService } from '../../core/catalog.service';
import { ProductCard } from '../../core/catalog.model';
import { MoneyPipe } from '../../core/money.pipe';
import { LocaleService } from '../../core/locale.service';
import { Listing } from '../catalog/listing';
import { ProductCardComponent } from '../catalog/product-card';
import { RecentlyViewedStore } from '../../stores/recently-viewed.store';

register(); // registers <swiper-container> / <swiper-slide> custom elements

@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslocoPipe, MoneyPipe, Listing, ProductCardComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="mx-auto max-w-6xl p-4">
      @if (featured().length) {
        <swiper-container
          class="featured"
          slides-per-view="1"
          loop="true"
          autoplay-delay="4500"
          autoplay-pause-on-mouse-enter="true"
          navigation="true"
          pagination="true"
          keyboard="true"
          aria-label="Featured products"
        >
          @for (p of featured(); track p.id) {
            <swiper-slide>
              <a
                [routerLink]="loc.link('p', p.slug)"
                class="flex flex-col items-center gap-6 rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-8 text-white md:flex-row md:p-12"
              >
                <div class="flex aspect-square w-48 shrink-0 items-center justify-center rounded-xl bg-white/10 text-6xl" aria-hidden="true">📱</div>
                <div class="text-center md:text-left">
                  <p class="text-sm font-medium tracking-wide text-white/70 uppercase">{{ p.brand }}</p>
                  <h3 class="mt-1 text-3xl font-bold">{{ p.name }}</h3>
                  <p class="mt-2 max-w-md text-white/80">{{ p.short_description }}</p>
                  <p class="mt-4">
                    <span class="text-sm text-white/70">{{ 'product.from' | transloco }}</span>
                    <span class="ml-1 text-2xl font-bold">{{ p.from_price | money }}</span>
                  </p>
                  <span class="btn btn-accent btn-lg mt-5 shadow-lg">
                    {{ 'home.browse' | transloco }} →
                  </span>
                </div>
              </a>
            </swiper-slide>
          }
        </swiper-container>
      }
    </section>

    @if (recent.list().length) {
      <section class="mx-auto max-w-6xl p-4">
        <h2 class="mb-3 text-xl font-semibold text-ink">Recently viewed</h2>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          @for (p of recent.list().slice(0, 4); track p.id) {
            <app-product-card [product]="p" />
          }
        </div>
      </section>
    }

    <!-- Full listing view below the slider (PROMPT §7.1) -->
    <app-listing />
  `,
  styles: [`.featured { --swiper-theme-color: #fff; padding-bottom: 2.5rem; }`],
})
export class Home {
  private readonly catalog = inject(CatalogService);
  readonly loc = inject(LocaleService);
  readonly recent = inject(RecentlyViewedStore);
  readonly featured = signal<ProductCard[]>([]);

  constructor() {
    this.catalog.featured().subscribe((r) => this.featured.set(r.data));
  }
}
