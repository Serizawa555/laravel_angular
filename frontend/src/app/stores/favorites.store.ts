import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProductCard } from '../core/catalog.model';
import { CatalogService } from '../core/catalog.service';
import { CsrfService } from '../core/csrf.service';
import { AuthService } from '../core/auth.service';

const KEY = 'favorites:v2'; // stores number[] (product IDs)
const OLD_KEY = 'favorites'; // legacy: full ProductCard snapshots

/**
 * Favorites store the client is NOT allowed to cache catalog data: localStorage holds **only
 * product IDs**; the cards are always loaded fresh from the API (`filter[ids]`). So price/stock/
 * name/image never go stale, and unpublished favorites silently disappear (PROMPT §7.4).
 */
@Injectable({ providedIn: 'root' })
export class FavoritesStore {
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(CatalogService);
  private readonly csrf = inject(CsrfService);
  private readonly auth = inject(AuthService);

  private readonly idsSig = signal<number[]>(this.readIds());
  readonly ids = this.idsSig.asReadonly();
  readonly list = signal<ProductCard[]>([]); // hydrated cards, from the API
  readonly loading = signal(false);
  readonly count = computed(() => this.idsSig().length);

  constructor() {
    void this.load();
  }

  isFavorite(id: number): boolean {
    return this.idsSig().includes(id);
  }

  /** Toggle by ID (optimistic), persist, sync to server when logged in, then refresh cards. */
  async toggle(id: number): Promise<void> {
    const wasFav = this.isFavorite(id);
    this.idsSig.update((ids) => (wasFav ? ids.filter((x) => x !== id) : [...ids, id]));
    this.persist();

    if (this.auth.isAuthenticated()) {
      await this.csrf.prime();
      await firstValueFrom(
        wasFav
          ? this.http.delete(`/api/v1/favorites/${id}`)
          : this.http.post('/api/v1/favorites', { product_id: id }),
      );
    }
    await this.load();
  }

  /** Load the card data for the current favorite IDs (always from the API). */
  async load(): Promise<void> {
    const ids = this.idsSig();
    if (ids.length === 0) {
      this.list.set([]);
      return;
    }
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.catalog.products({ 'filter[ids]': ids.join(','), 'page[size]': String(Math.min(ids.length, 100)) }),
      );
      this.list.set(res.data);
      // Prune ids the API no longer returns (unpublished / deleted).
      const live = new Set(res.data.map((c) => c.id));
      const pruned = ids.filter((id) => live.has(id));
      if (pruned.length !== ids.length) {
        this.idsSig.set(pruned);
        this.persist();
      }
    } finally {
      this.loading.set(false);
    }
  }

  /** After login: push local IDs to the server, adopt the merged list (IDs only kept locally). */
  async syncOnLogin(): Promise<void> {
    if (!this.auth.isAuthenticated()) return;
    await this.csrf.prime();
    const res = await firstValueFrom(
      this.http.post<{ data: ProductCard[] }>('/api/v1/favorites/sync', { product_ids: this.idsSig() }),
    );
    this.list.set(res.data);
    this.idsSig.set(res.data.map((c) => c.id));
    this.persist();
  }

  // --- persistence (IDs only) ---

  private readIds(): number[] {
    this.migrateLegacy();
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
    } catch {
      return [];
    }
  }

  /** One-time: turn old full-snapshot favorites into IDs, then drop the old key. */
  private migrateLegacy(): void {
    const old = localStorage.getItem(OLD_KEY);
    if (old === null) return;
    try {
      const snapshots = JSON.parse(old);
      const ids = Array.isArray(snapshots)
        ? snapshots.map((s) => s?.id).filter((n): n is number => typeof n === 'number')
        : [];
      if (!localStorage.getItem(KEY)) {
        localStorage.setItem(KEY, JSON.stringify(ids));
      }
    } catch {
      /* ignore malformed legacy data */
    }
    localStorage.removeItem(OLD_KEY);
  }

  private persist(): void {
    localStorage.setItem(KEY, JSON.stringify(this.idsSig()));
  }
}
