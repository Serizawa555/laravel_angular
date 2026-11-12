import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from './core/auth.service';
import { LocaleService } from './core/locale.service';
import { Lang } from './core/locale';
import { CartStore } from './stores/cart.store';
import { FavoritesStore } from './stores/favorites.store';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthService);
  readonly loc = inject(LocaleService);
  readonly cart = inject(CartStore);
  readonly favorites = inject(FavoritesStore);
  private readonly router = inject(Router);

  /** Up-to-two initials for the avatar, else empty (shows a generic icon). */
  readonly initials = computed(() => {
    const name = this.auth.user()?.name?.trim();
    if (!name) return '';
    return name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  switchLang(lang: Lang): void {
    this.loc.switchTo(lang);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(this.loc.link('login'));
  }
}
