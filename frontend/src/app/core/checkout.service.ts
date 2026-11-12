import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CheckoutInput, OrderJson, OrderSummary } from './order.model';
import { CsrfService } from './csrf.service';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);

  async checkout(input: CheckoutInput): Promise<OrderJson> {
    await this.csrf.prime();
    const r = await firstValueFrom(this.http.post<{ data: OrderJson }>('/api/v1/checkout', input));
    return r.data;
  }

  orderJson(number: string): Promise<OrderJson> {
    return firstValueFrom(this.http.get<OrderJson>(`/api/v1/orders/${number}/json`));
  }

  async myOrders(): Promise<OrderSummary[]> {
    const r = await firstValueFrom(this.http.get<{ data: OrderSummary[] }>('/api/v1/orders'));
    return r.data;
  }
}
