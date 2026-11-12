import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CartData } from '../core/cart.model';
import { CsrfService } from '../core/csrf.service';

/** Signal store for the cart (guest via cookie, or the logged-in user's). */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);

  readonly cart = signal<CartData | null>(null);
  readonly count = computed(() => this.cart()?.count ?? 0);
  readonly subtotal = computed(() => this.cart()?.subtotal ?? 0);
  readonly items = computed(() => this.cart()?.items ?? []);

  async load(): Promise<void> {
    this.cart.set(await firstValueFrom(this.http.get<{ data: CartData }>('/api/v1/cart')).then((r) => r.data));
  }

  async add(variantId: number, quantity = 1): Promise<void> {
    await this.csrf.prime();
    const r = await firstValueFrom(
      this.http.post<{ data: CartData }>('/api/v1/cart/items', { variant_id: variantId, quantity }),
    );
    this.cart.set(r.data);
  }

  async update(itemId: number, quantity: number): Promise<void> {
    await this.csrf.prime();
    const r = await firstValueFrom(
      this.http.patch<{ data: CartData }>(`/api/v1/cart/items/${itemId}`, { quantity }),
    );
    this.cart.set(r.data);
  }

  async remove(itemId: number): Promise<void> {
    await this.csrf.prime();
    const r = await firstValueFrom(this.http.delete<{ data: CartData }>(`/api/v1/cart/items/${itemId}`));
    this.cart.set(r.data);
  }
}
