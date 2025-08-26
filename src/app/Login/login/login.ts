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

@Component({
  selector: 'app-login',
  imports: [FormsModule, InputTextModule, FloatLabel, PasswordModule, ButtonModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginData = {
    empId: '',
    password: ''
  };



  constructor(private router: Router, private userService: User) { }

  ngOnInit() {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const candidateId = localStorage.getItem('candidateId');
    const empId = localStorage.getItem('empId')
    console.log('Token:', token);
    if (token && empId ) {
      this.router.navigate(['/employee']); // Redirect to employee page if logged in
    }
    else if(token && candidateId){
      this.router.navigate(['/my-tests'])
    }
    else{
      this.router.navigate(['/login'])
    }
  }
  private isEmail(value: string): boolean {
    // simple email check; good enough for routing logic
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      const idOrEmail = this.loginData.empId.trim();
      const password = this.loginData.password;

      if (this.isEmail(idOrEmail)) {
        // ---- Candidate login path ----
        this.userService.login(idOrEmail, password).subscribe({
          next: (res) => {
            // store candidate info (as requested)
            localStorage.setItem('token', res.token);
            localStorage.setItem('candidateId',res.candidateId); // <-- the key part
            localStorage.setItem('name', res.name);
            localStorage.setItem('role', 'candidate');

            // go to your candidate area; change route if needed
            this.router.navigate(['/my-tests']);
          },
          error: (err) => {
            console.error('Candidate login failed:', err);
          }
        });
      } else {
        // ---- Employee/User login path (your existing flow) ----
        this.userService.loginUser(idOrEmail, password).subscribe({
          next: (response) => {
            if (response) {
              localStorage.setItem('token', response.token);
              // NOTE: you were storing employeeCode under 'employeeId'. Keep or rename as you wish.
              localStorage.setItem('employeeId', response.employeeCode);
              localStorage.setItem('name', response.username);
              localStorage.setItem('role', response.role);
              localStorage.setItem('userId', response.id);
              localStorage.setItem('empId', response.empId);
              localStorage.setItem('deptId', response.deptId)
              this.router.navigate(['/individual']);
            } else {
              console.error('Login failed:', (response as any)?.message);
            }
          },
          error: (error) => {
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
