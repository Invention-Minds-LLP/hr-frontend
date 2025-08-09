import { Component } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-creation',
  imports: [FormsModule, InputTextModule, FloatLabel,PasswordModule,ButtonModule,CommonModule],
  templateUrl: './login-creation.html',
  styleUrl: './login-creation.css'
})
export class LoginCreation {

  login = {
    employeeId: null as number | null,
    password:'',
    confirmPassword:''
  }


  onSubmit(form : NgForm){
    if(form.valid && ! this.confirmPasswordMismatch()){
      console.log('form Submited', this.login);
      alert('Form Submitted Successfully')
    }else{
      alert('Form is invalid ')
    }
  }


  confirmPasswordMismatch(): boolean {
  return (
    !!this.login.password &&
    !!this.login.confirmPassword &&
    this.login.password !== this.login.confirmPassword
  );
}

  invalid(control : NgModel){
    return control.invalid && (control.dirty || control.touched)
  }


  showError(control : NgModel){
    return this.invalid(control)
  }


  onClear(){
    this.login ={
      employeeId:null,
      password:'',
      confirmPassword:''

    }
  }

}
