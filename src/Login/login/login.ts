import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
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

  constructor(private router : Router){}

  onSubmit(form : NgForm){
    if(form.valid){
    //  alert('Login Successfully')
      localStorage.setItem('isLogIn', 'true');
      console.log(this.loginData)
      this.router.navigate(['/appraisal-form'])
      
    }else{
      // alert('Login Faild')
    }
  }

  invaild(control : NgModel){
    return control.invalid && (control.dirty || control.touched)
  }

  showError(control : NgModel){
    return this.invaild(control)
  }
}
