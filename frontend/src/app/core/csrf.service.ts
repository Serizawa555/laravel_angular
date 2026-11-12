import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/** Primes the Sanctum XSRF-TOKEN cookie once, so mutating requests (cart, auth) carry the header. */
@Injectable({ providedIn: 'root' })
export class CsrfService {
  private readonly http = inject(HttpClient);
  private primed?: Promise<void>;

  prime(): Promise<void> {
    this.primed ??= firstValueFrom(
      this.http.get('/sanctum/csrf-cookie', { responseType: 'text' }),
    ).then(() => undefined);
    return this.primed;
  }
}
