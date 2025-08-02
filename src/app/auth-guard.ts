import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

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
