import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProductCard } from '../core/catalog.model';
import { CsrfService } from '../core/csrf.service';
import { AuthService } from '../core/auth.service';

const KEY = 'favorites';

/**
 * Favorites: localStorage is the display source (works for guests); logged-in users also sync to
 * the server so it persists across devices and merges on login (PROMPT §7.4).
 */
@Injectable({ providedIn: 'root' })
export class FavoritesStore {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly auth = inject(AuthService);

  readonly list = signal<ProductCard[]>(this.read());
  readonly count = computed(() => this.list().length);

  isFavorite(id: number): boolean {
    return this.list().some((p) => p.id === id);
  }

  async toggle(card: ProductCard): Promise<void> {
    const isFav = this.isFavorite(card.id);
    this.list.update((l) => (isFav ? l.filter((p) => p.id !== card.id) : [...l, card]));
    this.persist();

    if (this.auth.isAuthenticated()) {
      await this.csrf.prime();
      if (isFav) {
        await firstValueFrom(this.http.delete(`/api/v1/favorites/${card.id}`));
      } else {
        await firstValueFrom(this.http.post('/api/v1/favorites', { product_id: card.id }));
      }
    }
  }

  /** After login: push local favorites to the server, then adopt the merged server list. */
  async syncOnLogin(): Promise<void> {
    if (!this.auth.isAuthenticated()) return;
    await this.csrf.prime();
    const ids = this.list().map((p) => p.id);
    const r = await firstValueFrom(
      this.http.post<{ data: ProductCard[] }>('/api/v1/favorites/sync', { product_ids: ids }),
    );
    this.list.set(r.data);
    this.persist();
  }

  private read(): ProductCard[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(KEY, JSON.stringify(this.list()));
  }
}
