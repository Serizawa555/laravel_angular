import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import { routes } from './app.routes';
import { AuthService } from './core/auth.service';
import { authErrorInterceptor } from './core/auth.interceptor';
import { acceptLanguageInterceptor } from './core/accept-language.interceptor';
import { TranslocoHttpLoader } from './core/transloco-loader';
import { CsrfService } from './core/csrf.service';
import { CartStore } from './stores/cart.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    // Sanctum SPA uses the XSRF-TOKEN cookie -> X-XSRF-TOKEN header (same-origin via dev proxy).
    provideHttpClient(
      withFetch(),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      }),
      withInterceptors([acceptLanguageInterceptor, authErrorInterceptor]),
    ),
    provideTransloco({
      config: {
        availableLangs: ['en', 'ro'],
        defaultLang: 'en',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    // Before the router runs: prime CSRF, hydrate the session, load the cart.
    provideAppInitializer(() => {
      const csrf = inject(CsrfService);
      const auth = inject(AuthService);
      const cart = inject(CartStore);
      return Promise.all([csrf.prime(), auth.bootstrap()]).then(() => cart.load().catch(() => {}));
    }),
  ],
};
