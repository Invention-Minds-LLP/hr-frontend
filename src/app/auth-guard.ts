import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { canAccessManagementDashboard } from './shared/access-rules';
import { AuthSession } from './services/auth/auth-session';
import { PermissionService } from './services/auth/permission.service';

/**
 * The access token lives in memory, not localStorage. This synchronous check
 * is only safe because app.config.ts runs the silent refresh in an app
 * initializer — by the time any route activates, the cookie has already been
 * exchanged for a token (or shown to be dead).
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const auth = inject(AuthSession);

  if (!auth.isLoggedIn()) {
    console.warn('No active session, redirecting to login page');
    router.navigate(['/login']);
    return false;
  }
  return true;
};

/**
 * Permission guard. Use ALONGSIDE authGuard, with the key on the route:
 *
 *   { path: 'payroll', component: PayrollOverview,
 *     canActivate: [authGuard, permissionGuard], data: { perm: 'admin.payroll.view' } }
 *
 * Without this, hiding a navbar item did nothing — the route still opened for
 * anyone who typed the URL. A denied user goes to /individual (their own
 * profile), not /login: they have a valid session, just not this screen.
 *
 * A route with no `data.perm` is allowed through, so adding the guard to a
 * route you haven't classified yet can't lock anyone out by accident.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const perms = inject(PermissionService);
  const auth = inject(AuthSession);

  const required = route.data?.['perm'] as string | string[] | undefined;
  if (!required) return true;

  const list = Array.isArray(required) ? required : [required];
  if (perms.hasAny(...list)) return true;

  console.warn('Blocked by permissionGuard, missing:', list.join(' / '));
  // Candidates hold no permissions and have no Employee row, so /individual
  // would render an empty profile. Send them back to their own portal.
  return router.createUrlTree([auth.isCandidate() ? '/candidate-tests' : '/individual']);
};

/**
 * Resolves the default landing page.
 *   No session                                        → /login
 *   candidateId present (candidate)                   → /candidate-tests
 *   roleId === 4 OR empId in mgmt allowlist           → /management-dashboard
 *   everything else (employees/HR/etc)                → /individual
 */
export const landingRedirectGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthSession);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }
  if (localStorage.getItem('candidateId')) {
    return router.createUrlTree(['/candidate-tests']);
  }
  return router.createUrlTree([canAccessManagementDashboard() ? '/management-dashboard' : '/individual']);
};
