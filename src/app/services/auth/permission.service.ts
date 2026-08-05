import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environment/environment.prod';
import { PermissionKey } from '../../shared/permissions';

/**
 * The signed-in user's permission keys, fetched once from the server.
 *
 * Loaded by the app initializer in app.config.ts BEFORE the router boots, so
 * `has()` is already populated by the time the navbar renders or a guard runs
 * — same trick AuthSession.refresh() uses for the access token.
 *
 * This is a UI hint, exactly like the localStorage role fields it replaces.
 * The authorisation boundary is the API; hiding a menu item stops mistakes,
 * not attackers.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/me';

  /** Signal so templates re-render when permissions arrive after login. */
  private readonly keys = signal<ReadonlySet<string>>(new Set());

  /** True once a load attempt has resolved — lets guards tell "denied" from "not loaded yet". */
  readonly loaded = signal(false);

  has(key: PermissionKey | string): boolean {
    return this.keys().has(key);
  }

  hasAny(...list: (PermissionKey | string)[]): boolean {
    return list.some((k) => this.keys().has(k));
  }

  /**
   * Fetch the permission set. Never throws — a failure yields an empty set,
   * which degrades to "no admin menus" rather than a broken app. Callers that
   * care can check `loaded()`.
   */
  load(): Observable<ReadonlySet<string>> {
    return this.http.get<{ permissions: string[] }>(`${this.base}/permissions`).pipe(
      map((res) => new Set<string>(res?.permissions ?? [])),
      catchError(() => of(new Set<string>())),
      tap((set) => {
        this.keys.set(set);
        this.loaded.set(true);
      }),
    );
  }

  /** Wipe on logout so the next user in the same tab never inherits these. */
  clear(): void {
    this.keys.set(new Set());
    this.loaded.set(false);
  }
}
