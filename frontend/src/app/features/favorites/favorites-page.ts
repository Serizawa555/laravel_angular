import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FavoritesStore } from '../../stores/favorites.store';
import { ProductCardComponent } from '../catalog/product-card';

@Component({
  selector: 'app-favorites-page',
  imports: [TranslocoPipe, ProductCardComponent],
  template: `
    <section class="mx-auto max-w-6xl p-4">
      <h1 class="text-2xl font-semibold text-ink">{{ 'nav.favorites' | transloco }}</h1>

      @if (favorites.list().length === 0) {
        <p class="mt-6 text-gray-500">{{ 'listing.empty' | transloco }}</p>
      } @else {
        <div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          @for (p of favorites.list(); track p.id) {
            <app-product-card [product]="p" />
          }
        </div>
      }
    </section>
  `,
})
export class FavoritesPage {
  readonly favorites = inject(FavoritesStore);
}
