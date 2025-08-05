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
  imports: [FormsModule,InputTextModule,FloatLabel,PasswordModule, ButtonModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
 loginData = {
    empId: '',
    password: ''
  };

  

  constructor(private router : Router, private userService: User){}

  ngOnInit() {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    console.log('Token:', token);
    if (token) {
      this.router.navigate(['/employee']); // Redirect to employee page if logged in
    }
  }

  onSubmit(form : NgForm){
    if (form.valid) {
      this.userService.loginUser(this.loginData.empId, this.loginData.password).subscribe({
        next: (response) => {
          if (response) {
            console.log('Login response:', response);
            localStorage.setItem('token', response.token); // Store the token in localStorage
            localStorage.setItem('employeeId',response.employeeCode ); // Store user details
            localStorage.setItem('name', response.username); // Store user name
            localStorage.setItem('role', response.role); // Store user role
            localStorage.setItem('userId', response.id)
            console.log('Login successful');
            this.router.navigate(['/employee']);
          } else {
            console.error('Login failed:', response.message);
          }
        },
        error: (error) => {
          console.error('Error during login:', error);
        }
      });
    } else {
      console.log('Form is invalid');
    }
  }

  invaild(control : NgModel){
    return control.invalid && (control.dirty || control.touched)
  }

  showError(control : NgModel){
    return this.invaild(control)
  }

  
}
