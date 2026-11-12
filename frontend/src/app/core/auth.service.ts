import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Credentials,
  RegisterInput,
  Resource,
  User,
} from './user.model';

/**
 * Signal-based auth store (React-context analog). Holds the current Sanctum SPA session user.
 * The server is the source of truth for access; `can()` / `hasRole()` only drive the UI.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly userSig = signal<User | null>(null);
  /** True once the initial /me check has resolved (so guards don't act too early). */
  private readonly readySig = signal(false);

  readonly user = this.userSig.asReadonly();
  readonly ready = this.readySig.asReadonly();
  readonly isAuthenticated = computed(() => this.userSig() !== null);

  constructor() {
    // Cross-tab sync: when another tab logs in/out, re-check our session (PROMPT: SPA auth).
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'auth-sync') {
          this.fetchMe().catch(() => this.userSig.set(null));
        }
      });
    }
  }

  /** Call once on app start: hydrate the session if a cookie is already present. */
  async bootstrap(): Promise<void> {
    try {
      await this.fetchMe();
    } catch {
      this.userSig.set(null);
    } finally {
      this.readySig.set(true);
    }
  }

  async login(credentials: Credentials): Promise<User> {
    await this.csrf();
    const res = await firstValueFrom(
      this.http.post<Resource<User>>('/api/v1/login', credentials),
    );
    this.userSig.set(res.data);
    this.notifyTabs();
    return res.data;
  }

  async register(input: RegisterInput): Promise<User> {
    await this.csrf();
    const res = await firstValueFrom(
      this.http.post<Resource<User>>('/api/v1/register', input),
    );
    this.userSig.set(res.data);
    this.notifyTabs();
    return res.data;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/api/v1/logout', {}));
    this.userSig.set(null);
    this.notifyTabs();
  }

  async fetchMe(): Promise<User> {
    const res = await firstValueFrom(this.http.get<Resource<User>>('/api/v1/me'));
    this.userSig.set(res.data);
    return res.data;
  }

  /** Clear local state (used by the 401 interceptor). */
  clear(): void {
    this.userSig.set(null);
  }

  /** Nudge other tabs to re-check their session. */
  private notifyTabs(): void {
    try {
      localStorage.setItem('auth-sync', String(Date.now()));
    } catch {
      // ignore (private mode / storage unavailable)
    }
  }

  hasRole(role: string): boolean {
    return this.userSig()?.roles.includes(role) ?? false;
  }

  can(permission: string): boolean {
    const perms = this.userSig()?.permissions ?? [];
    return perms.includes('*') || perms.includes(permission);
  }

  /** Prime the XSRF-TOKEN cookie before any mutating request (Sanctum SPA). */
  private async csrf(): Promise<void> {
    await firstValueFrom(this.http.get('/sanctum/csrf-cookie', { responseType: 'text' }));
  }
}
