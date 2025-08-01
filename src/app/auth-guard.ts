import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {

  const router = inject(Router)

  const isLogIn = localStorage.getItem('isLogIn') === 'true'

  if (isLogIn) {
    return true

  } else {
    router.navigate(['/login'])
    return false
  }


};
