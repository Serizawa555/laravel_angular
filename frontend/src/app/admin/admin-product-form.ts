import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../core/admin.service';
import { AdminVariant, AttributeDefinition } from '../core/admin.model';
import { ProductType, TermRef } from '../core/catalog.model';
import { AuthService } from '../core/auth.service';
import { LocaleService } from '../core/locale.service';

const TYPES: ProductType[] = ['phone', 'case', 'headset_bt', 'headset_wired'];

@Component({
  selector: 'app-admin-product-form',
  template: `
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">{{ id() ? 'Edit' : 'New' }} product</h1>
      @if (id() && auth.can('products.publish')) {
        <div class="flex gap-2">
          <button class="btn btn-primary" (click)="publish()">Publish</button>
          <button class="btn btn-ghost" (click)="unpublish()">Unpublish</button>
          @if (auth.can('products.delete')) {
            <button class="btn btn-danger" (click)="remove()">Delete</button>
          }
        </div>
      }
    </div>

    @if (error()) { <p class="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{{ error() }}</p> }

    <!-- General -->
    <section class="mt-4 grid gap-3 md:grid-cols-2">
      <label class="text-sm">Type
        <select class="field" [value]="type()" (change)="type.set($any($event.target).value)">
          @for (t of types; track t) { <option [value]="t">{{ t }}</option> }
        </select>
      </label>
      <label class="text-sm">Slug
        <input class="field" [value]="slug()" (input)="slug.set($any($event.target).value)" />
      </label>
      <label class="text-sm">Brand
        <select class="field" [value]="brandId() ?? ''" (change)="brandId.set(+$any($event.target).value || null)">
          <option value="">—</option>
          @for (b of brands(); track b.id) { <option [value]="b.id">{{ b.name }}</option> }
        </select>
      </label>
      <label class="text-sm">Segment
        <select class="field" [value]="segmentId() ?? ''" (change)="segmentId.set(+$any($event.target).value || null)">
          <option value="">—</option>
          @for (s of segments(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
        </select>
      </label>
      <label class="text-sm">Name (EN)
        <input class="field" [value]="nameEn()" (input)="nameEn.set($any($event.target).value)" />
      </label>
      <label class="text-sm">Name (RO)
        <input class="field" [value]="nameRo()" (input)="nameRo.set($any($event.target).value)" />
      </label>
      <label class="text-sm md:col-span-2">Short description (EN)
        <input class="field" [value]="shortEn()" (input)="shortEn.set($any($event.target).value)" />
      </label>
      <label class="text-sm">Base price (bani)
        <input type="number" class="field" [value]="basePrice()" (input)="basePrice.set(+$any($event.target).value || 0)" />
      </label>
    </section>

    <!-- Specs (dynamic from attribute_definitions) -->
    <section class="mt-8 border-t border-gray-100 pt-5">
      <h2 class="font-semibold text-gray-900">Specifications</h2>
      <div class="mt-2 grid gap-3 md:grid-cols-2">
        @for (def of defsForType(); track def.id) {
          <label class="text-sm">{{ def.label.en }}{{ def.unit ? ' (' + def.unit + ')' : '' }}
            @if (def.data_type === 'bool') {
              <input type="checkbox" class="ml-2" [checked]="!!specs()[def.key]" (change)="setSpec(def.key, $any($event.target).checked)" />
            } @else if (def.data_type === 'enum') {
              <select class="field" [value]="specs()[def.key] ?? ''" (change)="setSpec(def.key, $any($event.target).value)">
                <option value="">—</option>
                @for (opt of def.options ?? []; track opt) { <option [value]="opt">{{ opt }}</option> }
              </select>
            } @else {
              <input
                [type]="def.data_type === 'int' || def.data_type === 'decimal' ? 'number' : 'text'"
                class="field"
                [value]="specs()[def.key] ?? ''"
                (input)="setSpec(def.key, coerce(def, $any($event.target).value))"
              />
            }
          </label>
        }
      </div>
    </section>

    <!-- Media -->
    @if (id()) {
      <section class="mt-8 border-t border-gray-100 pt-5">
        <h2 class="font-semibold text-gray-900">Images</h2>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          @for (m of media(); track m.id) {
            <div class="relative h-24 w-24 overflow-hidden rounded-lg border border-gray-200 bg-mist">
              <img [src]="m.thumb" alt="" class="h-full w-full object-contain p-1" />
              <button class="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 text-xs text-red-500 shadow" (click)="removeImage(m.id)" aria-label="Delete image">✕</button>
            </div>
          }
          <label class="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-brand hover:text-brand">
            {{ uploading() ? '…' : '+ Upload' }}
            <input type="file" accept="image/*" class="hidden" (change)="uploadImage($event)" />
          </label>
        </div>
      </section>
    }

    <!-- Variants -->
    <section class="mt-8 border-t border-gray-100 pt-5">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-gray-900">Variants</h2>
        <button class="btn btn-ghost" (click)="addVariant()">+ Add variant</button>
      </div>
      <table class="admin-table mt-2">
        <thead><tr><th>SKU</th><th>Color</th><th>RAM</th><th>Storage</th><th>Price</th><th>Stock</th><th>Default</th><th></th></tr></thead>
        <tbody>
          @for (v of variants(); track $index) {
            <tr>
              <td><input class="w-28 field-sm" [value]="v.sku" (input)="setV($index, 'sku', $any($event.target).value)" /></td>
              <td><input class="w-16 field-sm" [value]="v.options['color'] ?? ''" (input)="setOpt($index, 'color', $any($event.target).value)" /></td>
              <td><input class="w-14 field-sm" [value]="v.options['ram'] ?? ''" (input)="setOpt($index, 'ram', $any($event.target).value)" /></td>
              <td><input class="w-16 field-sm" [value]="v.options['storage'] ?? ''" (input)="setOpt($index, 'storage', $any($event.target).value)" /></td>
              <td><input type="number" class="w-24 field-sm" [value]="v.price" (input)="setV($index, 'price', +$any($event.target).value || 0)" /></td>
              <td><input type="number" class="w-16 field-sm" [value]="v.stock" (input)="setV($index, 'stock', +$any($event.target).value || 0)" /></td>
              <td class="text-center"><input type="radio" name="def" [checked]="v.is_default" (change)="setDefault($index)" /></td>
              <td><button class="text-red-500 hover:text-red-600" (click)="removeVariant($index)">✕</button></td>
            </tr>
          }
        </tbody>
      </table>
    </section>

    <button class="btn btn-primary mt-8 px-6 py-2.5" [disabled]="saving()" (click)="save()">
      {{ saving() ? 'Saving…' : 'Save product' }}
    </button>
  `,
})
export class AdminProductForm {
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly loc = inject(LocaleService);

  readonly types = TYPES;
  readonly id = signal<number | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly type = signal<ProductType>('phone');
  readonly slug = signal('');
  readonly brandId = signal<number | null>(null);
  readonly segmentId = signal<number | null>(null);
  readonly nameEn = signal('');
  readonly nameRo = signal('');
  readonly shortEn = signal('');
  readonly basePrice = signal(0);
  readonly specs = signal<Record<string, unknown>>({});
  readonly variants = signal<AdminVariant[]>([]);
  readonly media = signal<{ id: number; thumb: string; url: string }[]>([]);
  readonly uploading = signal(false);

  readonly brands = signal<TermRef[]>([]);
  readonly segments = signal<TermRef[]>([]);
  private readonly defs = signal<AttributeDefinition[]>([]);
  readonly defsForType = computed(() => this.defs().filter((d) => d.product_type === this.type()));

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    const [tax, defs] = await Promise.all([this.admin.taxonomies(), this.admin.attributeDefinitions()]);
    this.brands.set(tax.data.find((v) => v.code === 'brand')?.terms ?? []);
    this.segments.set(tax.data.find((v) => v.code === 'segment')?.terms ?? []);
    this.defs.set(defs.data);

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const { data } = await this.admin.product(+idParam);
      this.id.set(data.id);
      this.type.set(data.type);
      this.slug.set(data.slug);
      this.brandId.set(data.brand_id);
      this.segmentId.set(data.segment_id);
      this.nameEn.set(data.name.en ?? '');
      this.nameRo.set(data.name.ro ?? '');
      this.shortEn.set(data.short_description?.en ?? '');
      this.basePrice.set(data.base_price);
      this.specs.set(data.specs ?? {});
      this.variants.set(data.variants ?? []);
      this.media.set(data.media ?? []);
    }
  }

  async uploadImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.id()) return;
    this.uploading.set(true);
    try {
      const { data } = await this.admin.uploadMedia(this.id()!, file);
      this.media.set(data.media ?? []);
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async removeImage(mediaId: number): Promise<void> {
    const { data } = await this.admin.deleteMedia(this.id()!, mediaId);
    this.media.set(data.media ?? []);
  }

  setSpec(key: string, value: unknown): void {
    this.specs.update((s) => ({ ...s, [key]: value }));
  }

  coerce(def: AttributeDefinition, value: string): unknown {
    if (def.data_type === 'int') return value === '' ? null : parseInt(value, 10);
    if (def.data_type === 'decimal') return value === '' ? null : parseFloat(value);
    return value;
  }

  addVariant(): void {
    this.variants.update((v) => [...v, { sku: '', price: this.basePrice(), compare_at_price: null, stock: 0, is_default: v.length === 0, options: {} }]);
  }
  removeVariant(i: number): void {
    this.variants.update((v) => v.filter((_, idx) => idx !== i));
  }
  setV(i: number, key: keyof AdminVariant, value: unknown): void {
    this.variants.update((v) => v.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }
  setOpt(i: number, axis: string, code: string): void {
    this.variants.update((v) => v.map((row, idx) => {
      if (idx !== i) return row;
      const options = { ...row.options };
      if (code) options[axis] = code; else delete options[axis];
      return { ...row, options };
    }));
  }
  setDefault(i: number): void {
    this.variants.update((v) => v.map((row, idx) => ({ ...row, is_default: idx === i })));
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    const input = {
      type: this.type(),
      slug: this.slug(),
      brand_id: this.brandId(),
      segment_id: this.segmentId(),
      name: { en: this.nameEn(), ro: this.nameRo() },
      short_description: { en: this.shortEn() },
      specs: this.specs(),
      base_price: this.basePrice(),
      variants: this.variants(),
    };
    try {
      if (this.id()) {
        await this.admin.updateProduct(this.id()!, input);
      } else {
        await this.admin.createProduct(input);
      }
      await this.router.navigate(this.loc.link('admin', 'products'));
    } catch (err) {
      this.error.set(err instanceof HttpErrorResponse ? (err.error?.message ?? 'Save failed') : 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }

  async publish(): Promise<void> { await this.admin.publish(this.id()!); }
  async unpublish(): Promise<void> { await this.admin.unpublish(this.id()!); }
  async remove(): Promise<void> {
    await this.admin.deleteProduct(this.id()!);
    await this.router.navigate(this.loc.link('admin', 'products'));
  }
}
