import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSession } from './auth/auth-session';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private logoutTimer: any;
  private readonly INACTIVITY_TIME_LIMIT = 15 * 60 * 1000; // 15 minutes

  constructor(private router: Router, private ngZone: NgZone, private auth: AuthSession) {
    this.startInactivityWatch();
  }

  // Start monitoring user activity
  private startInactivityWatch(): void {
    this.resetLogoutTimer();

    ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, () => this.resetLogoutTimer());
    });
  }
  private isTestRoute(): boolean {
    return this.router.url.startsWith('/recruitment/take-test/');
  }


  // Function to reset the inactivity timer
  private resetLogoutTimer(): void {
    // Clear any existing timer
    clearTimeout(this.logoutTimer);
    // Set a new timer
    this.ngZone.runOutsideAngular(() => {
      this.logoutTimer = setTimeout(() => this.logoutUser(), this.INACTIVITY_TIME_LIMIT);
    });
  }

  // Function to log out the user
  private logoutUser(): void {
    if (!this.isTestRoute() ) {
      this.ngZone.run(() => {
        console.log('Logging out due to inactivity...');
        // logout() wipes localStorage, so stamp the reason afterwards —
        // /login reads it to explain why the user landed there.
        this.auth.logout();
        localStorage.setItem('logoutReason', 'inactivity');
        this.router.navigate(['/login']); // Adjust this to match your logout route
      });
    }
  }
}
