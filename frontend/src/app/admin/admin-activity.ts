import { Component, inject, signal } from '@angular/core';
import { AdminService } from '../core/admin.service';
import { ActivityEntry } from '../core/admin.model';

@Component({
  selector: 'app-admin-activity',
  template: `
    <h1 class="text-xl font-semibold text-gray-900">Activity log</h1>
    <table class="admin-table mt-4">
      <thead><tr><th class="py-2">When</th><th>Who</th><th>Action</th><th>Subject</th></tr></thead>
      <tbody>
        @for (a of entries(); track a.id) {
          <tr class="border-b align-top">
            <td class="py-2 whitespace-nowrap text-xs text-gray-500">{{ a.created_at }}</td>
            <td>{{ a.causer ?? 'system' }}</td>
            <td>{{ a.description }} <span class="text-xs text-gray-400">({{ a.log_name }})</span></td>
            <td>{{ a.subject_type }} #{{ a.subject_id }}</td>
          </tr>
        }
      </tbody>
    </table>
    @if (entries().length === 0) { <p class="mt-4 text-gray-500">No activity yet.</p> }
  `,
})
export class AdminActivity {
  private readonly admin = inject(AdminService);
  readonly entries = signal<ActivityEntry[]>([]);

  constructor() {
    this.admin.activity().then((r) => this.entries.set(r.data));
  }
}
