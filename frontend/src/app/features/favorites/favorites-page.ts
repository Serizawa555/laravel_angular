import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { FavoritesStore } from '../../stores/favorites.store';
import { ProductCardComponent } from '../catalog/product-card';
import { LocaleService } from '../../core/locale.service';

@Component({
  selector: 'app-favorites-page',
  imports: [RouterLink, TranslocoPipe, ProductCardComponent],
  template: `
    <section class="mx-auto max-w-6xl p-4">
      <h1 class="text-2xl font-semibold text-ink">{{ 'nav.favorites' | transloco }}</h1>

      @if (favorites.loading() && favorites.list().length === 0) {
        <div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          @for (s of [1, 2, 3, 4]; track s) {
            <div class="h-64 animate-pulse rounded-xl bg-gray-100"></div>
          }
        </div>
      } @else if (favorites.list().length === 0) {
        <div class="mt-10 text-center">
          <p class="text-gray-500">{{ 'favorites.empty' | transloco }}</p>
          <a [routerLink]="loc.link()" class="btn btn-primary mt-4">{{ 'home.browse' | transloco }}</a>
        </div>
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
  readonly loc = inject(LocaleService);
}
