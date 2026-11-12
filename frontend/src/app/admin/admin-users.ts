import { Component, inject, signal } from '@angular/core';
import { AdminService } from '../core/admin.service';
import { AdminUser } from '../core/admin.model';

const ASSIGNABLE = ['customer', 'editor', 'admin'];

@Component({
  selector: 'app-admin-users',
  template: `
    <h1 class="text-xl font-semibold text-gray-900">Users</h1>
    <table class="admin-table mt-4">
      <thead><tr><th class="py-2">Name</th><th>Email</th><th>Roles</th></tr></thead>
      <tbody>
        @for (u of users(); track u.id) {
          <tr class="border-b">
            <td class="py-2">{{ u.name }}</td>
            <td>{{ u.email }}</td>
            <td class="py-2">
              @if (u.roles.includes('superadmin')) {
                <span class="text-xs text-gray-500">superadmin (locked)</span>
              } @else {
                <div class="flex gap-3">
                  @for (role of assignable; track role) {
                    <label class="flex items-center gap-1 text-xs">
                      <input type="checkbox" [checked]="u.roles.includes(role)" (change)="toggle(u, role)" />
                      {{ role }}
                    </label>
                  }
                </div>
              }
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class AdminUsers {
  private readonly admin = inject(AdminService);
  readonly users = signal<AdminUser[]>([]);
  readonly assignable = ASSIGNABLE;

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.users.set((await this.admin.users()).data);
  }

  async toggle(user: AdminUser, role: string): Promise<void> {
    const roles = user.roles.includes(role)
      ? user.roles.filter((r) => r !== role)
      : [...user.roles.filter((r) => this.assignable.includes(r)), role];
    await this.admin.setUserRoles(user.id, roles);
    this.load();
  }
}
