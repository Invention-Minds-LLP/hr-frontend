import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { canAccessManagementDashboard } from './shared/access-rules';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  if (typeof window !== 'undefined' && localStorage) {
    const token = localStorage.getItem('token')

    if (!token) {
      console.warn('No auth token found, redirecting to login page');
      router.navigate(['/login']);
      return false;
    }
  }
  return true;
};

/**
 * Resolves the default landing page based on what's in localStorage.
 *   No token                                          → /login
 *   candidateId present (candidate)                   → /candidate-tests
 *   roleId === 4 OR empId in mgmt allowlist           → /management-dashboard
 *   everything else (employees/HR/etc)                → /individual
 */
export const landingRedirectGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (typeof window !== 'undefined' && localStorage) {
    if (!localStorage.getItem('token')) {
      return router.createUrlTree(['/login']);
    }
    if (localStorage.getItem('candidateId')) {
      return router.createUrlTree(['/candidate-tests']);
    }
    return router.createUrlTree([canAccessManagementDashboard() ? '/management-dashboard' : '/individual']);
  }
  return router.createUrlTree(['/individual']);
};
