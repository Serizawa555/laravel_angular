import { Component, inject, signal } from '@angular/core';
import { AdminService } from '../core/admin.service';
import { AdminVocabulary } from '../core/admin.model';

interface EditableTerm {
  id?: number;
  en: string;
  ro: string;
  slug: string;
  weight: number;
}

@Component({
  selector: 'app-admin-taxonomies',
  template: `
    <h1 class="text-xl font-semibold text-gray-900">Taxonomies</h1>
    @if (saved()) { <p class="mt-1 text-sm text-green-600">Saved.</p> }

    @for (vocab of vocabularies(); track vocab.id) {
      <section class="mt-6">
        <h2 class="font-semibold text-gray-900">{{ vocab.name.en }} <span class="text-xs font-normal text-gray-400">({{ vocab.code }})</span></h2>
        <table class="admin-table mt-2">
          <thead><tr><th>Name (EN)</th><th>Name (RO)</th><th>Slug</th><th>Weight</th><th></th></tr></thead>
          <tbody>
            @for (t of rows()[vocab.id]; track $index) {
              <tr>
                <td><input class="field-sm w-full" [value]="t.en" (input)="t.en = $any($event.target).value" /></td>
                <td><input class="field-sm w-full" [value]="t.ro" (input)="t.ro = $any($event.target).value" /></td>
                <td><input class="field-sm w-28" [value]="t.slug" (input)="t.slug = $any($event.target).value" /></td>
                <td><input type="number" class="field-sm w-14" [value]="t.weight" (input)="t.weight = +$any($event.target).value || 0" /></td>
                <td class="whitespace-nowrap text-right">
                  <button class="font-medium text-indigo-600 hover:underline" (click)="save(vocab.id, t)">Save</button>
                  @if (t.id) { <button class="ml-3 text-red-500 hover:text-red-600" (click)="remove(vocab.id, t)">Delete</button> }
                </td>
              </tr>
            }
          </tbody>
        </table>
        <button class="btn btn-ghost mt-3" (click)="add(vocab.id)">+ Add term</button>
      </section>
    }
  `,
})
export class AdminTaxonomies {
  private readonly admin = inject(AdminService);
  readonly vocabularies = signal<AdminVocabulary[]>([]);
  readonly rows = signal<Record<number, EditableTerm[]>>({});
  readonly saved = signal(false);

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    const { data } = await this.admin.adminTaxonomies();
    this.vocabularies.set(data);
    const rows: Record<number, EditableTerm[]> = {};
    for (const v of data) {
      rows[v.id] = v.terms.map((t) => ({ id: t.id, en: t.name.en ?? '', ro: t.name.ro ?? '', slug: t.slug, weight: t.weight }));
    }
    this.rows.set(rows);
  }

  add(vocabId: number): void {
    this.rows.update((r) => ({ ...r, [vocabId]: [...r[vocabId], { en: '', ro: '', slug: '', weight: 0 }] }));
  }

  async save(vocabId: number, term: EditableTerm): Promise<void> {
    const input = {
      vocabulary_id: vocabId,
      name: { en: term.en, ro: term.ro },
      slug: term.slug,
      weight: term.weight,
    };
    const result = term.id ? await this.admin.updateTerm(term.id, input) : await this.admin.createTerm(input);
    term.id = result.id;
    this.flash();
  }

  async remove(vocabId: number, term: EditableTerm): Promise<void> {
    if (term.id) await this.admin.deleteTerm(term.id);
    this.rows.update((r) => ({ ...r, [vocabId]: r[vocabId].filter((t) => t !== term) }));
    this.flash();
  }

  private flash(): void {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }
}
