import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';

/** Tells the API which locale to translate content to (PROMPT §5), from the active UI language. */
export const acceptLanguageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  const lang = inject(TranslocoService).getActiveLang();
  return next(req.clone({ setHeaders: { 'Accept-Language': lang } }));
};
