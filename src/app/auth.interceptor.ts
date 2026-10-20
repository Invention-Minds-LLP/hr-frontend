import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthSession } from './services/auth/auth-session';
import { DownloadOtpService, gatedDownloadLabel } from './shared/download-otp/download-otp.service';
import { currentDownloadGrant, takeDownloadTicket } from './shared/download-otp/download-grant.store';

/** Endpoints that establish or tear down a session — never retry these. */
const AUTH_ENDPOINTS = ['/users/login', '/users/refresh', '/users/logout', '/users/candidate/login',
  '/users/candidate/login/verify-otp'];

export const AuthInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const router = inject(Router);
  const auth = inject(AuthSession);

  const isAuthEndpoint = AUTH_ENDPOINTS.some(path => req.url.includes(path));

  const send = (outgoing: HttpRequest<any>): Observable<HttpEvent<any>> => {
    const token = auth.getToken();
    // withCredentials on everything: the httpOnly refresh cookie has to ride
    // along, and the browser only sends it cross-origin when this is set.
    const authReq = outgoing.clone({
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

  // DPDP download gate: a server file download first needs the email OTP
  // (once per hour) plus captcha + reason (every time), then carries the grant
  // and the one-time ticket the backend's requireDownloadGrant consumes.
  const downloadLabel = req.responseType === 'blob' && !auth.isCandidate() ? gatedDownloadLabel(req.url) : null;
  if (downloadLabel) {
    const gate = inject(DownloadOtpService);
    return from(gate.verify(downloadLabel)).pipe(
      switchMap((ok) => {
        if (!ok) {
          return throwError(() => new HttpErrorResponse({
            status: 0,
            statusText: 'Download cancelled',
            url: req.url,
            error: new Blob([JSON.stringify({ error: 'Download cancelled.' })], { type: 'application/json' }),
          }));
        }
        const headers: Record<string, string> = {};
        const grant = currentDownloadGrant();
        const ticket = takeDownloadTicket();
        if (grant) headers['X-Download-Grant'] = grant;
        if (ticket) headers['X-Download-Ticket'] = ticket;
        return send(req.clone({ setHeaders: headers }));
      })
    );
  }

  return send(req);
};
