import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { User } from '../../services/user/user';
import { from } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { canAccessManagementDashboard, canAccessManagementDashboardFor } from '../../shared/access-rules';
import { AuthSession } from '../../services/auth/auth-session';
import { PermissionService } from '../../services/auth/permission.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, InputTextModule, FloatLabel, PasswordModule, ButtonModule, CommonModule, ToastModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  providers: [MessageService]
})
export class Login {
  loginData = {
    empId: '',
    password: ''
  };
  isLoading = false;

  // ---- Candidate OTP step ----
  // Set once the password has been accepted and a code emailed. The form then
  // asks for the code instead of the password. Only the candidate path uses
  // this; employee login is unchanged.
  otpStage = false;
  otpEmail = '';
  otpCode = '';
  otpSecondsLeft = 0;
  private otpTimer: any = null;



  constructor(private router: Router, private userService: User, private messageService: MessageService, private auth: AuthSession, private perms: PermissionService) { }

  ngOnInit() {
    // If already logged in, bounce the user to the right landing page.
    // Same decision tree as landingRedirectGuard — kept in sync manually.
    // The app initializer has already tried the silent refresh by now, so an
    // in-memory token here means the server confirmed the session.
    if (this.auth.isLoggedIn()) {
      const candidateId = localStorage.getItem('candidateId');
      if (candidateId) {
        this.router.navigate(['/candidate-tests']);
      } else {
        this.router.navigate([canAccessManagementDashboard() ? '/management-dashboard' : '/individual']);
      }
    }
    // no token → stay on /login (don't re-navigate to /login, would churn the router)

    const logoutReason = localStorage.getItem('logoutReason');
    if (logoutReason === 'inactivity') {
      console.log('Logged out due to inactivity');
      this.messageService.add({
        severity: 'info',
        summary: 'Logged Out',
        detail: 'You were logged out due to inactivity.',
        // life: 5000 // Display for 5 seconds
      });

      // Remove the reason after displaying it
      localStorage.removeItem('logoutReason');
    }
  }
  ngOnDestroy() {
    this.clearOtpCountdown();
  }

  private isEmail(value: string): boolean {
    // simple email check; good enough for routing logic
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  // ---- Candidate OTP step ----------------------------------------------

  private startOtpCountdown(seconds: number) {
    this.clearOtpCountdown();
    this.otpSecondsLeft = seconds;
    // Only ever started from a user submit, so this never runs during SSR.
    this.otpTimer = setInterval(() => {
      this.otpSecondsLeft--;
      if (this.otpSecondsLeft <= 0) this.clearOtpCountdown();
    }, 1000);
  }

  private clearOtpCountdown() {
    if (this.otpTimer) { clearInterval(this.otpTimer); this.otpTimer = null; }
  }

  /** Exchange the emailed code for the candidate session. */
  submitOtp() {
    const code = (this.otpCode || '').trim();
    if (code.length !== 6) {
      this.messageService.add({ severity: 'warn', summary: 'Enter the code', detail: 'The code is 6 digits.' });
      return;
    }
    this.isLoading = true;
    this.userService.verifyCandidateOtp(this.otpEmail, code).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.clearOtpCountdown();
        this.otpStage = false;
        this.messageService.add({ severity: 'success', summary: 'Login Successful', detail: 'Welcome, ' + res.name });
        this.auth.setCandidateSession(res);
        this.router.navigate(['/candidate-tests']);
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Verification failed',
          detail: err?.error?.error || 'Invalid or expired code.',
        });
      },
    });
  }

  /** Re-run step 1 to send a fresh code (the old one is replaced). */
  resendOtp() {
    if (!this.loginData.password) { this.backToPassword(); return; }
    this.isLoading = true;
    this.userService.login(this.otpEmail, this.loginData.password).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.otpCode = '';
        this.startOtpCountdown(res?.expiresInSeconds ?? 120);
        this.messageService.add({ severity: 'info', summary: 'Code resent', detail: `A new code is on its way to ${this.otpEmail}.` });
      },
      error: () => {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Could not resend', detail: 'Please try again.' });
      },
    });
  }

  /** Abandon the code step and go back to email + password. */
  backToPassword() {
    this.clearOtpCountdown();
    this.otpStage = false;
    this.otpCode = '';
    this.isLoading = false;
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.isLoading = true;
      const idOrEmail = this.loginData.empId.trim();
      console.log('Logging in with:', idOrEmail);
      const password = this.loginData.password;

      console.log('Determining login path for:', this.isEmail(idOrEmail) ? 'Candidate' : 'Employee/User');

      if (this.isEmail(idOrEmail)) {
        // ---- Candidate login path: password, then emailed OTP ----
        // Step 1 no longer returns a session — it emails a 6-digit code and we
        // switch the form over to the code entry below.
        this.userService.login(idOrEmail, password).subscribe({
          next: (res) => {
            this.isLoading = false;
            this.otpStage = true;
            this.otpEmail = res?.email || idOrEmail;
            this.otpCode = '';
            this.startOtpCountdown(res?.expiresInSeconds ?? 120);
            this.messageService.add({
              severity: 'info',
              summary: 'Verification code sent',
              detail: `We emailed a 6-digit code to ${this.otpEmail}. It expires in 2 minutes.`,
              life: 6000,
            });
          },
          error: (err) => {
            this.isLoading = false;
            const detail = err?.status === 502
              ? (err?.error?.error || 'Could not send the verification code. Please try again.')
              : 'Invalid credentials. Please try again.';
            this.messageService.add({ severity: 'error', summary: 'Login Failed', detail });
            console.error('Candidate login failed:', err);
          }
        });
      } else {
        // ---- Employee/User login path (your existing flow) ----
        this.userService.loginUser(idOrEmail, password).subscribe({
          next: (response) => {
            this.isLoading = false;
            this.messageService.add({ severity: 'success', summary: 'Login Successful', detail: 'Welcome, ' + response.username });
            if (response) {
              // Token → memory. The server already set the httpOnly refresh
              // cookie on this response; only display data is persisted.
              this.auth.setSession(response);
              const landing = canAccessManagementDashboardFor(response.roleId, response.empId)
                ? '/management-dashboard'
                : '/individual';
              // Permissions must be in hand before we navigate — the navbar and
              // permissionGuard both read them synchronously on the next page.
              this.perms.load().subscribe(() => this.router.navigate([landing]));
            } else {

              console.error('Login failed:', (response as any)?.message);
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.messageService.add({ severity: 'error', summary: 'Login Failed', detail: 'Invalid credentials. Please try again.' });
            console.error('Error during login:', error);
          }
        });
      }

    } else {
      console.log('Form is invalid');
    }
  }

  invaild(control: NgModel) {
    return control.invalid && (control.dirty || control.touched)
  }

  showError(control: NgModel) {
    return this.invaild(control)
  }


}
