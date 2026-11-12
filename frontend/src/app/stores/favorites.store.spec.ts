import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FavoritesStore } from './favorites.store';

function setup(): { store: FavoritesStore; http: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { store: TestBed.inject(FavoritesStore), http: TestBed.inject(HttpTestingController) };
}

describe('FavoritesStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('migrates legacy full-snapshot favorites to IDs under the v2 key', () => {
    localStorage.setItem('favorites', JSON.stringify([{ id: 3, name: 'A' }, { id: 7, name: 'B' }]));

    const { http } = setup(); // construction migrates + loads

    expect(JSON.parse(localStorage.getItem('favorites:v2')!)).toEqual([3, 7]);
    expect(localStorage.getItem('favorites')).toBeNull();

    const req = http.expectOne((r) => r.url === '/api/v1/products');
    expect(req.request.params.get('filter[ids]')).toBe('3,7');
    req.flush({ data: [{ id: 3 }, { id: 7 }], meta: {} });
  });

  it('toggle adds an id, persists it, and reloads cards by id', async () => {
    const { store, http } = setup(); // empty → no request on load

    const pending = store.toggle(5);
    const req = http.expectOne((r) => r.url === '/api/v1/products');
    expect(req.request.params.get('filter[ids]')).toBe('5');
    req.flush({ data: [{ id: 5 }], meta: {} });
    await pending;

    expect(store.isFavorite(5)).toBe(true);
    expect(JSON.parse(localStorage.getItem('favorites:v2')!)).toContain(5);
  });

  it('prunes ids the API no longer returns (unpublished/deleted)', async () => {
    localStorage.setItem('favorites:v2', JSON.stringify([3, 7]));
    const { store, http } = setup();

    const req = http.expectOne((r) => r.url === '/api/v1/products');
    req.flush({ data: [{ id: 3 }], meta: {} }); // 7 no longer published
    await Promise.resolve();

    expect(store.ids()).toEqual([3]);
    expect(JSON.parse(localStorage.getItem('favorites:v2')!)).toEqual([3]);
  });
});
