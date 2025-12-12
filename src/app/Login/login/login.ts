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



  constructor(private router: Router, private userService: User, private messageService: MessageService) { }

  ngOnInit() {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const candidateId = localStorage.getItem('candidateId');
    const empId = localStorage.getItem('empId')
    console.log('Token:', token);
    if (token && empId ) {
      this.router.navigate(['/individual']); // Redirect to employee page if logged in
    }
    else if(token && candidateId){
      this.router.navigate(['/candidate-tests'])
    }
    else{
      this.router.navigate(['/login'])
    }
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
            localStorage.setItem('token', res.token);
            localStorage.setItem('candidateId',res.candidateId); // <-- the key part
            localStorage.setItem('name', res.name);
            localStorage.setItem('role', 'candidate');

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
              localStorage.setItem('token', response.token);
              // NOTE: you were storing employeeCode under 'employeeId'. Keep or rename as you wish.
              localStorage.setItem('employeeId', response.employeeCode);
              localStorage.setItem('name', response.username);
              localStorage.setItem('role', response.role);
              localStorage.setItem('userId', response.id);
              localStorage.setItem('empId', response.empId);
              localStorage.setItem('deptId', response.deptId);
              localStorage.setItem('photoUrl', response.photoUrl || '');
              localStorage.setItem('designation', response.designation || '');
              localStorage.setItem('roleId', response.roleId || '');
              this.router.navigate(['/individual']);
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
