import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environment/environment.prod';
import { PermissionService } from './permission.service';

/**
 * Session state for the web app.
 *
 * The access token is held in a plain field — NEVER localStorage. It's
 * short-lived (15m) and the durable half of the session is an httpOnly cookie
 * the browser can't read, mirrored by a row in the server's RefreshToken
 * table. So "am I logged in?" is ultimately the server's answer, not a string
 * sitting in storage that anyone with XSS (or devtools) can lift or forge.
 *
 * On a page reload the field is empty, so app.config.ts runs refresh() before
 * the router boots; the cookie mints a fresh access token and the session
 * survives.
 *
 * Candidates are the exception: they have no User row, so no server-side
 * session record. Their 12h token stays in localStorage as before.
 *
 * The non-secret display data (empId, roleId, name…) stays in localStorage
 * exactly as before — it's a UI hint, not an authorisation boundary. The
 * backend re-derives real identity from the access token on every request.
 */
@Injectable({ providedIn: 'root' })
export class AuthSession {
  private http = inject(HttpClient);
  private permissions = inject(PermissionService);
  private base = environment.apiUrl + '/users';

  private accessToken: string | null = null;

  // A burst of parallel 401s must trigger ONE refresh, not N. N refreshes race
  // and rotate the cookie N times, invalidating each other and logging the
  // user out mid-session.
  private refreshInFlight$: Observable<any> | null = null;

  /** Candidates keep the legacy localStorage token — they have no refresh cookie. */
  isCandidate(): boolean {
    return localStorage.getItem('role') === 'candidate';
  }

  getToken(): string | null {
    return this.isCandidate() ? localStorage.getItem('token') : this.accessToken;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * Store a login/refresh response. Token to memory, everything else to
   * localStorage under the same keys the app has always read.
   */
  setSession(res: any): void {
    this.accessToken = res?.token ?? null;
    localStorage.setItem('employeeId', res?.employeeCode ?? '');
    localStorage.setItem('name', res?.username ?? '');
    localStorage.setItem('role', res?.role ?? '');
    localStorage.setItem('userId', res?.id ?? '');
    localStorage.setItem('empId', res?.empId ?? '');
    localStorage.setItem('deptId', res?.deptId ?? '');
    localStorage.setItem('departmentName', res?.departmentName || '');
    localStorage.setItem('photoUrl', res?.photoUrl || '');
    localStorage.setItem('designation', res?.designation || '');
    localStorage.setItem('roleId', res?.roleId || '');
    localStorage.setItem('gender', res?.gender || '');
  }

  /** Candidate login response — token stays in storage for this flow only. */
  setCandidateSession(res: any): void {
    this.accessToken = null;
    localStorage.setItem('token', res?.token ?? '');
    localStorage.setItem('candidateId', res?.candidateId ?? '');
    localStorage.setItem('name', res?.name ?? '');
    localStorage.setItem('role', 'candidate');
  }

  /**
   * Exchange the httpOnly refresh cookie for a new access token.
   * Rejects (401) when there's no live server-side session.
   */
  refresh(): Observable<any> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<any>(`${this.base}/refresh`, {}, { withCredentials: true, headers: this.csrfHeader() })
        .pipe(
          tap(res => { if (res?.token) this.setSession(res); }),
          shareReplay(1),
          finalize(() => { this.refreshInFlight$ = null; })
        );
    }
    return this.refreshInFlight$;
  }

  /** Drop everything client-side. Server-side revocation is logout()'s job. */
  clearSession(): void {
    this.accessToken = null;
    this.refreshInFlight$ = null;
    // Permissions live in memory, not localStorage — clear them explicitly or
    // the next user to log in on this tab inherits the previous one's menu.
    this.permissions.clear();
    localStorage.clear();
  }

  /**
   * Log out. Clears locally first and fires the server call in the background:
   * the user must end up logged out even if the network is down.
   */
  logout(): void {
    const headers = this.csrfHeader();
    this.http
      .post(`${this.base}/logout`, {}, { withCredentials: true, headers })
      .pipe(catchError(() => of(null)))
      .subscribe();
    this.clearSession();
  }

  /** Double-submit: echo the readable hr_csrf cookie back as a header. */
  private csrfHeader(): Record<string, string> {
    const match = typeof document !== 'undefined'
      ? document.cookie.match(/(?:^|;\s*)hr_csrf=([^;]+)/)
      : null;
    return match ? { 'X-CSRF-Token': decodeURIComponent(match[1]) } : {};
  }
}
