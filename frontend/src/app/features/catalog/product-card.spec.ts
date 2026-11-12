import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTransloco, TranslocoLoader, TRANSLOCO_LOADER } from '@jsverse/transloco';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ProductCardComponent } from './product-card';
import { ProductCard } from '../../core/catalog.model';
import { CartStore } from '../../stores/cart.store';
import { ToastService } from '../../core/toast.service';

class StubLoader implements TranslocoLoader {
  getTranslation() {
    return of({});
  }
}

function card(overrides: Partial<ProductCard> = {}): ProductCard {
  return {
    id: 1, slug: 'phone-x', type: 'phone', name: 'Phone X', short_description: null,
    brand: 'Acme', brand_slug: 'acme', segment: null, from_price: 100000, compare_at_price: null,
    in_stock: true, is_featured: false, featured_position: null, image: null,
    default_variant_id: 9, variant_count: 1, ...overrides,
  };
}

function render(product: ProductCard) {
  TestBed.configureTestingModule({
    imports: [ProductCardComponent],
    providers: [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      provideTransloco({ config: { availableLangs: ['en'], defaultLang: 'en' } }),
      { provide: TRANSLOCO_LOADER, useClass: StubLoader },
    ],
  });
  const fixture = TestBed.createComponent(ProductCardComponent);
  fixture.componentRef.setInput('product', product);
  fixture.detectChanges();
  return fixture;
}

describe('ProductCardComponent', () => {
  it('shows a disabled action when out of stock', () => {
    const el = render(card({ in_stock: false })).nativeElement as HTMLElement;
    const btn = el.querySelector('button[disabled]');
    expect(btn).toBeTruthy();
    expect(btn?.className).toContain('cursor-not-allowed');
  });

  it('links to the PDP ("Choose options") when there are multiple variants', () => {
    const el = render(card({ variant_count: 4 })).nativeElement as HTMLElement;
    expect(el.querySelector('a.btn-ghost')).toBeTruthy();
    expect(el.querySelector('button.btn-accent')).toBeNull();
  });

  it('quick-adds a single-variant product and toasts success', async () => {
    const fixture = render(card({ variant_count: 1, default_variant_id: 9 }));
    const cart = TestBed.inject(CartStore);
    const toasts = TestBed.inject(ToastService);
    const addSpy = vi.spyOn(cart, 'add').mockResolvedValue(undefined);

    (fixture.nativeElement as HTMLElement).querySelector('button.btn-accent')!.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(addSpy).toHaveBeenCalledWith(9, 1);
    expect(toasts.toasts().some((t) => t.type === 'success')).toBe(true);
  });

  it('toasts an error when the add fails', async () => {
    const fixture = render(card());
    const cart = TestBed.inject(CartStore);
    const toasts = TestBed.inject(ToastService);
    vi.spyOn(cart, 'add').mockRejectedValue(
      new HttpErrorResponse({ status: 422, error: { message: 'Out of stock.' } }),
    );

    (fixture.nativeElement as HTMLElement).querySelector('button.btn-accent')!.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    const errors = toasts.toasts().filter((t) => t.type === 'error');
    expect(errors.length).toBe(1);
    expect(errors[0].message).toBe('Out of stock.');
  });
});
