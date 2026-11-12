import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * On a 401 from an API call, drop the local session so the UI reflects reality.
 * (The /me bootstrap check is exempt — it's allowed to 401 for guests.)
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !req.url.endsWith('/api/v1/me')
      ) {
        auth.clear();
      }
      return throwError(() => err);
    }),
  );
};
