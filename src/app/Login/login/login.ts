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
  private isEmail(value: string): boolean {
    // simple email check; good enough for routing logic
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.isLoading = true;
      const idOrEmail = this.loginData.empId.trim();
      console.log('Logging in with:', idOrEmail);
      const password = this.loginData.password;

      console.log('Determining login path for:', this.isEmail(idOrEmail) ? 'Candidate' : 'Employee/User');

      if (this.isEmail(idOrEmail)) {
        // ---- Candidate login path ----
        this.userService.login(idOrEmail, password).subscribe({
          next: (res) => {
            this.isLoading = false;
            this.messageService.add({ severity: 'success', summary: 'Login Successful', detail: 'Welcome, ' + res.name });
            // store candidate info (as requested)
            this.auth.setCandidateSession(res);

            // go to your candidate area; change route if needed
            this.router.navigate(['/candidate-tests']);
          },
          error: (err) => {
            this.isLoading = false;
            this.messageService.add({ severity: 'error', summary: 'Login Failed', detail: 'Invalid credentials. Please try again.' });
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
