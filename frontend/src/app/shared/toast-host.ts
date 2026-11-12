import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../core/toast.service';

/** Renders queued toasts bottom-right. aria-live=polite so screen readers announce them. */
@Component({
  selector: 'app-toast-host',
  imports: [RouterLink],
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex w-80 max-w-[90vw] flex-col gap-2" aria-live="polite" aria-atomic="false">
      @for (t of toasts.toasts(); track t.id) {
        <div
          class="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg"
          [class.border-emerald-200]="t.type === 'success'"
          [class.bg-white]="t.type === 'success'"
          [class.border-red-200]="t.type === 'error'"
          [class.bg-red-50]="t.type === 'error'"
          role="status"
        >
          <span [class.text-ink]="t.type === 'success'" [class.text-red-700]="t.type === 'error'" class="flex-1">
            {{ t.message }}
          </span>
          @if (t.action) {
            <a [routerLink]="t.action.link" class="font-semibold text-brand hover:underline" (click)="toasts.dismiss(t.id)">
              {{ t.action.label }}
            </a>
          }
          <button class="text-gray-400 hover:text-gray-600" (click)="toasts.dismiss(t.id)" aria-label="Dismiss">✕</button>
        </div>
      }
    </div>
  `,
})
export class ToastHost {
  readonly toasts = inject(ToastService);
}
