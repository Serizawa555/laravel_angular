import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { DEFAULT_LANG, Lang, SUPPORTED_LANGS, isLang } from './locale';

/**
 * Single source of truth for the active UI language, which lives in the URL (`/en/...`, `/ro/...`).
 * Keeps Transloco in sync and builds locale-prefixed router links.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  readonly lang = signal<Lang>(DEFAULT_LANG);
  readonly langs = SUPPORTED_LANGS;

  /** Called by the route guard when a `:lang` segment is activated. */
  use(lang: string): void {
    const next: Lang = isLang(lang) ? lang : DEFAULT_LANG;
    if (this.transloco.getActiveLang() !== next) {
      this.transloco.setActiveLang(next);
    }
    this.lang.set(next);
  }

  /** Build a routerLink array prefixed with the active language. */
  link(...segments: (string | number)[]): (string | number)[] {
    return ['/', this.lang(), ...segments];
  }

  /** Switch language, keeping the current page + query string (PROMPT §7). */
  switchTo(lang: Lang): void {
    const url = this.router.url;
    const [path, query] = url.split('?');
    const parts = path.split('/').filter(Boolean);
    if (isLang(parts[0])) {
      parts[0] = lang;
    } else {
      parts.unshift(lang);
    }
    this.router.navigateByUrl('/' + parts.join('/') + (query ? '?' + query : ''));
  }
}
