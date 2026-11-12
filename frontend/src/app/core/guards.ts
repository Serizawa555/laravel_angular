import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { LocaleService } from './locale.service';
import { DEFAULT_LANG, isLang } from './locale';

/** Reads the `:lang` segment and activates that UI language (URL is the source of truth). */
export const langGuard: CanActivateChildFn = (route) => {
  const locale = inject(LocaleService);
  const router = inject(Router);
  const lang = route.parent?.paramMap.get('lang') ?? route.paramMap.get('lang');
  if (!isLang(lang)) {
    return router.createUrlTree([`/${DEFAULT_LANG}`]);
  }
  locale.use(lang);
  return true;
};

/** Require an authenticated user; otherwise bounce to /{lang}/login (preserving the target). */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const locale = inject(LocaleService);
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(locale.link('login'), { queryParams: { redirect: state.url } });
};

/** Only for signed-out users (login/register pages); signed-in users go to /{lang}/account. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const locale = inject(LocaleService);
  return auth.isAuthenticated() ? router.createUrlTree(locale.link('account')) : true;
};

/** Require one of the given roles. UX gate only — the API still enforces access. */
export const roleGuard =
  (...roles: string[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const locale = inject(LocaleService);
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(locale.link('login'));
    }
    return roles.some((r) => auth.hasRole(r)) ? true : router.createUrlTree(locale.link());
  };
