import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Facets,
  Paginated,
  ProductCard,
  ProductDetail,
  Vocabulary,
} from './catalog.model';

/** Catalog read API. Thin wrapper over /api/v1 (locale is added by the Accept-Language interceptor). */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  /** `params` is the flat query map the FiltersStore produces (filter[...], sort, page[...]). */
  products(params: Record<string, string>): Observable<Paginated<ProductCard>> {
    return this.http.get<Paginated<ProductCard>>('/api/v1/products', {
      params: new HttpParams({ fromObject: params }),
    });
  }

  facets(params: Record<string, string>): Observable<{ data: Facets }> {
    return this.http.get<{ data: Facets }>('/api/v1/products/facets', {
      params: new HttpParams({ fromObject: params }),
    });
  }

  featured(): Observable<{ data: ProductCard[] }> {
    return this.http.get<{ data: ProductCard[] }>('/api/v1/products/featured');
  }

  product(slug: string): Observable<{ data: ProductDetail }> {
    return this.http.get<{ data: ProductDetail }>(`/api/v1/products/${slug}`);
  }

  taxonomies(): Observable<{ data: Vocabulary[] }> {
    return this.http.get<{ data: Vocabulary[] }>('/api/v1/taxonomies');
  }
}
