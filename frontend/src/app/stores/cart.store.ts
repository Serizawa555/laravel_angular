import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
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

  /** Throws the HttpErrorResponse so callers can show a message (422 stock, etc.). */
  async add(variantId: number, quantity = 1): Promise<void> {
    const res = await this.send(() =>
      this.http.post<{ data: CartData }>('/api/v1/cart/items', { variant_id: variantId, quantity }),
    );
    this.cart.set(res.data);
  }

  async update(itemId: number, quantity: number): Promise<void> {
    const res = await this.send(() =>
      this.http.patch<{ data: CartData }>(`/api/v1/cart/items/${itemId}`, { quantity }),
    );
    this.cart.set(res.data);
  }

  async remove(itemId: number): Promise<void> {
    const res = await this.send(() => this.http.delete<{ data: CartData }>(`/api/v1/cart/items/${itemId}`));
    this.cart.set(res.data);
  }

  /** Prime CSRF, run the request, and retry once if the token has expired (419). */
  private async send<T>(request: () => Observable<T>): Promise<T> {
    await this.csrf.prime();
    try {
      return await firstValueFrom(request());
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 419) {
        await this.csrf.reprime();
        return firstValueFrom(request());
      }
      throw err;
    }
  }
}
