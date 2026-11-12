import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ActivityEntry,
  AdminOrderRow,
  AdminProduct,
  AdminProductInput,
  AdminTerm,
  AdminUser,
  AdminVocabulary,
  AttributeDefinition,
  AttributeDefinitionInput,
  FeaturedItem,
  TermInput,
} from './admin.model';
import { OrderJson } from './order.model';
import { Vocabulary } from './catalog.model';
import { CsrfService } from './csrf.service';

/** All /admin API calls. CSRF is primed before each mutation. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);

  private get<T>(url: string) {
    return firstValueFrom(this.http.get<T>(url));
  }

  private async mutate<T>(verb: 'post' | 'put' | 'delete', url: string, body?: unknown): Promise<T> {
    await this.csrf.prime();
    return firstValueFrom(
      verb === 'delete'
        ? this.http.delete<T>(url)
        : this.http[verb]<T>(url, body ?? {}),
    );
  }

  // Products
  products(params = ''): Promise<{ data: AdminProduct[]; meta: { total: number; last_page: number; current_page: number } }> {
    return this.get(`/api/v1/admin/products${params}`);
  }
  product(id: number): Promise<{ data: AdminProduct }> {
    return this.get(`/api/v1/admin/products/${id}`);
  }
  createProduct(input: AdminProductInput) {
    return this.mutate<{ data: AdminProduct }>('post', '/api/v1/admin/products', input);
  }
  updateProduct(id: number, input: AdminProductInput) {
    return this.mutate<{ data: AdminProduct }>('put', `/api/v1/admin/products/${id}`, input);
  }
  publish(id: number) {
    return this.mutate<{ data: AdminProduct }>('post', `/api/v1/admin/products/${id}/publish`);
  }
  unpublish(id: number) {
    return this.mutate<{ data: AdminProduct }>('post', `/api/v1/admin/products/${id}/unpublish`);
  }
  deleteProduct(id: number) {
    return this.mutate('delete', `/api/v1/admin/products/${id}`);
  }
  async uploadMedia(id: number, file: File) {
    await this.csrf.prime();
    const form = new FormData();
    form.append('image', file);
    return firstValueFrom(this.http.post<{ data: AdminProduct }>(`/api/v1/admin/products/${id}/media`, form));
  }
  deleteMedia(id: number, mediaId: number) {
    return this.mutate<{ data: AdminProduct }>('delete', `/api/v1/admin/products/${id}/media/${mediaId}`);
  }

  // Supporting data
  attributeDefinitions(): Promise<{ data: AttributeDefinition[] }> {
    return this.get('/api/v1/admin/attribute-definitions');
  }
  taxonomies(): Promise<{ data: Vocabulary[] }> {
    return this.get('/api/v1/taxonomies');
  }

  // Featured
  featured(): Promise<{ data: FeaturedItem[] }> {
    return this.get('/api/v1/admin/featured');
  }
  setFeatured(ids: number[]) {
    return this.mutate<{ data: FeaturedItem[] }>('put', '/api/v1/admin/featured', { ids });
  }

  // Orders
  orders(): Promise<{ data: AdminOrderRow[] }> {
    return this.get('/api/v1/admin/orders');
  }
  order(number: string): Promise<{ data: OrderJson }> {
    return this.get(`/api/v1/admin/orders/${number}`);
  }

  // Users
  users(): Promise<{ data: AdminUser[] }> {
    return this.get('/api/v1/admin/users');
  }
  setUserRoles(id: number, roles: string[]) {
    return this.mutate<{ data: AdminUser }>('put', `/api/v1/admin/users/${id}/roles`, { roles });
  }

  // Taxonomies (all locales for editing)
  adminTaxonomies(): Promise<{ data: AdminVocabulary[] }> {
    return this.get('/api/v1/admin/taxonomies');
  }
  createTerm(input: TermInput) {
    return this.mutate<AdminTerm>('post', '/api/v1/admin/terms', input);
  }
  updateTerm(id: number, input: TermInput) {
    return this.mutate<AdminTerm>('put', `/api/v1/admin/terms/${id}`, input);
  }
  deleteTerm(id: number) {
    return this.mutate('delete', `/api/v1/admin/terms/${id}`);
  }

  // Attribute definitions
  adminAttributeDefinitions(): Promise<{ data: AttributeDefinition[] }> {
    return this.get('/api/v1/admin/attribute-definitions');
  }
  createAttributeDefinition(input: AttributeDefinitionInput) {
    return this.mutate<AttributeDefinition>('post', '/api/v1/admin/attribute-definitions', input);
  }
  updateAttributeDefinition(id: number, input: AttributeDefinitionInput) {
    return this.mutate<AttributeDefinition>('put', `/api/v1/admin/attribute-definitions/${id}`, input);
  }
  deleteAttributeDefinition(id: number) {
    return this.mutate('delete', `/api/v1/admin/attribute-definitions/${id}`);
  }

  // Activity log
  activity(): Promise<{ data: ActivityEntry[] }> {
    return this.get('/api/v1/admin/activity');
  }
}
