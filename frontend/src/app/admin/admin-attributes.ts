import { Component, inject, signal } from '@angular/core';
import { AdminService } from '../core/admin.service';
import { AttributeDefinition } from '../core/admin.model';
import { ProductType } from '../core/catalog.model';

const TYPES: ProductType[] = ['phone', 'case', 'headset_bt', 'headset_wired'];
const DATA_TYPES = ['string', 'int', 'decimal', 'bool', 'enum', 'list'] as const;

interface Row {
  id?: number;
  product_type: ProductType;
  key: string;
  en: string;
  data_type: AttributeDefinition['data_type'];
  unit: string;
  group: string;
  options: string; // comma-separated
  is_filterable: boolean;
  is_required: boolean;
  sort: number;
}

@Component({
  selector: 'app-admin-attributes',
  template: `
    <h1 class="text-xl font-semibold text-gray-900">Attribute definitions</h1>
    <p class="mt-1 text-sm text-gray-500">These drive the product spec form, the PDP spec table and validation.</p>
    @if (saved()) { <p class="mt-1 text-sm text-green-600">Saved.</p> }

    <table class="admin-table mt-4 text-xs">
      <thead>
        <tr><th>Type</th><th>Key</th><th>Label (EN)</th><th>Data</th><th>Unit</th><th>Group</th><th>Options</th><th>Filt.</th><th>Req.</th><th>Sort</th><th></th></tr>
      </thead>
      <tbody>
        @for (r of rows(); track $index) {
          <tr>
            <td>
              <select class="field-sm" [value]="r.product_type" (change)="r.product_type = $any($event.target).value">
                @for (t of types; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </td>
            <td><input class="w-24 field-sm" [value]="r.key" (input)="r.key = $any($event.target).value" /></td>
            <td><input class="w-28 field-sm" [value]="r.en" (input)="r.en = $any($event.target).value" /></td>
            <td>
              <select class="field-sm" [value]="r.data_type" (change)="r.data_type = $any($event.target).value">
                @for (d of dataTypes; track d) { <option [value]="d">{{ d }}</option> }
              </select>
            </td>
            <td><input class="w-12 field-sm" [value]="r.unit" (input)="r.unit = $any($event.target).value" /></td>
            <td><input class="w-20 field-sm" [value]="r.group" (input)="r.group = $any($event.target).value" /></td>
            <td><input class="w-28 field-sm" placeholder="a,b,c" [value]="r.options" (input)="r.options = $any($event.target).value" /></td>
            <td class="text-center"><input type="checkbox" [checked]="r.is_filterable" (change)="r.is_filterable = $any($event.target).checked" /></td>
            <td class="text-center"><input type="checkbox" [checked]="r.is_required" (change)="r.is_required = $any($event.target).checked" /></td>
            <td><input type="number" class="w-12 field-sm" [value]="r.sort" (input)="r.sort = +$any($event.target).value || 0" /></td>
            <td class="whitespace-nowrap text-right">
              <button class="font-medium text-indigo-600 hover:underline" (click)="save(r)">Save</button>
              @if (r.id) { <button class="ml-2 text-red-500 hover:text-red-600" (click)="remove(r)">✕</button> }
            </td>
          </tr>
        }
      </tbody>
    </table>
    <button class="btn btn-ghost mt-3" (click)="add()">+ Add definition</button>
  `,
})
export class AdminAttributes {
  private readonly admin = inject(AdminService);
  readonly rows = signal<Row[]>([]);
  readonly types = TYPES;
  readonly dataTypes = DATA_TYPES;
  readonly saved = signal(false);

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    const { data } = await this.admin.adminAttributeDefinitions();
    this.rows.set(data.map((d) => ({
      id: d.id,
      product_type: d.product_type,
      key: d.key,
      en: d.label.en ?? '',
      data_type: d.data_type,
      unit: d.unit ?? '',
      group: d.group ?? '',
      options: (d.options ?? []).join(','),
      is_filterable: d.is_filterable,
      is_required: d.is_required,
      sort: d.sort,
    })));
  }

  add(): void {
    this.rows.update((r) => [...r, { product_type: 'phone', key: '', en: '', data_type: 'string', unit: '', group: '', options: '', is_filterable: false, is_required: false, sort: 0 }]);
  }

  async save(r: Row): Promise<void> {
    const input = {
      product_type: r.product_type,
      key: r.key,
      label: { en: r.en },
      data_type: r.data_type,
      unit: r.unit || null,
      options: r.options ? r.options.split(',').map((s) => s.trim()).filter(Boolean) : null,
      group: r.group || null,
      is_filterable: r.is_filterable,
      is_required: r.is_required,
      sort: r.sort,
    };
    const result = r.id ? await this.admin.updateAttributeDefinition(r.id, input) : await this.admin.createAttributeDefinition(input);
    r.id = result.id;
    this.flash();
  }

  async remove(r: Row): Promise<void> {
    if (r.id) await this.admin.deleteAttributeDefinition(r.id);
    this.rows.update((rows) => rows.filter((x) => x !== r));
    this.flash();
  }

  private flash(): void {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }
}
