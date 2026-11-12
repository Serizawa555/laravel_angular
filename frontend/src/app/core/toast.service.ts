import { Injectable, signal } from '@angular/core';

export interface ToastAction {
  label: string;
  link: (string | number)[];
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
  action?: ToastAction;
}

/** Minimal signal-based toast queue. Rendered by ToastHost with aria-live. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  success(message: string, action?: ToastAction, durationMs = 4000): void {
    this.push({ message, type: 'success', action }, durationMs);
  }

  error(message: string, durationMs = 5000): void {
    this.push({ message, type: 'error' }, durationMs);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(toast: Omit<Toast, 'id'>, durationMs: number): void {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { ...toast, id }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }
}
