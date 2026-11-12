import { Component, inject, signal } from '@angular/core';
import { AdminService } from '../core/admin.service';
import { AdminProduct } from '../core/admin.model';

@Component({
  selector: 'app-admin-featured',
  template: `
    <h1 class="text-xl font-semibold text-gray-900">Featured slider</h1>
    <p class="mt-1 text-sm text-gray-500">Pick up to 3 published products. Order = selection order.</p>
    @if (saved()) { <p class="mt-2 text-sm text-green-600">Saved.</p> }

    <ul class="mt-4 space-y-1">
      @for (p of published(); track p.id) {
        <li class="flex items-center gap-2 text-sm">
          <input type="checkbox" [checked]="isSelected(p.id)" [disabled]="!isSelected(p.id) && selected().length >= 3" (change)="toggle(p.id)" />
          @if (position(p.id)) { <span class="w-5 text-center font-semibold">{{ position(p.id) }}</span> } @else { <span class="w-5"></span> }
          {{ p.name.en }}
        </li>
      }
    </ul>

    <button class="btn btn-primary mt-4" (click)="save()">Save</button>
  `,
})
export class AdminFeatured {
  private readonly admin = inject(AdminService);
  readonly published = signal<AdminProduct[]>([]);
  readonly selected = signal<number[]>([]);
  readonly saved = signal(false);

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    const [products, featured] = await Promise.all([this.admin.products('?status=published&page[size]=100'), this.admin.featured()]);
    this.published.set(products.data);
    this.selected.set(featured.data.sort((a, b) => a.featured_position - b.featured_position).map((f) => f.id));
  }

  isSelected(id: number): boolean {
    return this.selected().includes(id);
  }
  position(id: number): number | null {
    const i = this.selected().indexOf(id);
    return i === -1 ? null : i + 1;
  }
  toggle(id: number): void {
    this.selected.update((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    this.saved.set(false);
  }

  async save(): Promise<void> {
    await this.admin.setFeatured(this.selected());
    this.saved.set(true);
  }
}
