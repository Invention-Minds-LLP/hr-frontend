import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthSession } from './services/auth/auth-session';

/** Endpoints that establish or tear down a session — never retry these. */
const AUTH_ENDPOINTS = ['/users/login', '/users/refresh', '/users/logout', '/users/candidate/login'];

export const AuthInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const router = inject(Router);
  const auth = inject(AuthSession);

  const isAuthEndpoint = AUTH_ENDPOINTS.some(path => req.url.includes(path));
  const token = auth.getToken();

  // withCredentials on everything: the httpOnly refresh cookie has to ride
  // along, and the browser only sends it cross-origin when this is set.
  const authReq = req.clone({
    withCredentials: true,
    ...(token && !isAuthEndpoint ? { setHeaders: { Authorization: `Bearer ${token}` } } : {})
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 403 = authenticated but not permitted here. Keep the session; the
      // backend only sends 401 when the session itself is dead.
      if (error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }

      // Candidates have no refresh cookie — a 401 is terminal for them.
      if (auth.isCandidate()) {
        auth.clearSession();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      // Access token expired (they last ~15m). Mint a new one from the cookie
      // and replay the request; only if the server says the session is gone do
      // we actually log out.
      return auth.refresh().pipe(
        switchMap(() => next(authReq.clone({
          setHeaders: { Authorization: `Bearer ${auth.getToken() ?? ''}` }
        }))),
        catchError(() => {
          auth.clearSession();
          router.navigate(['/login']);
          return throwError(() => error);
        })
      );
    })
  );
};
