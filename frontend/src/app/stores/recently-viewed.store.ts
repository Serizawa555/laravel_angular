import { Injectable, signal } from '@angular/core';
import { ProductCard } from '../core/catalog.model';

const KEY = 'recently_viewed';
const MAX = 8;

/** Tracks recently viewed products in localStorage (PROMPT §10). */
@Injectable({ providedIn: 'root' })
export class RecentlyViewedStore {
  readonly list = signal<ProductCard[]>(this.read());

  add(card: ProductCard): void {
    this.list.update((l) => [card, ...l.filter((p) => p.id !== card.id)].slice(0, MAX));
    localStorage.setItem(KEY, JSON.stringify(this.list()));
  }

  private read(): ProductCard[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
      return [];
    }
  }
}
