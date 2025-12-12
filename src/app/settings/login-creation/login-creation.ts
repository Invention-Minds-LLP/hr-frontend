import { Component } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { User } from '../../services/user/user';
import { MessageService } from 'primeng/api';

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

  formSubmitted = false;


  constructor(private userService: User, private messageService : MessageService){}

  onSubmit(form : NgForm){


    if(form.valid && ! this.confirmPasswordMismatch()){
      console.log('form Submited', this.login);
      
    if (this.login.employeeId == null) {
      // alert('Employee ID is required');
      this.messageService.add({
        severity:'error',
        summary:'Error',
        detail:'Employee ID is required'
      })
      return;
    }
    this.formSubmitted = true;
    const payload = {
      employeeCode: String(this.login.employeeId), // backend expects employeeCode (string)
      password: this.login.password
    };

    this.userService.registerUser(payload).subscribe({
      next: (res) => {
        console.log('User created:', res);
        // alert('User created successfully');
        this.messageService.add({
          severity:'success',
          summary:'Success',
          detail:'User created successfully'
        })
        this.formSubmitted = false;
        this.onClear(form);
      },
      error: (err) => {
        console.error('Register failed:', err);
        const msg =
          err?.error?.error ||
          err?.error?.message ||
          'Failed to create user. Ensure Employee exists and no user already linked to this employeeCode.';
        // alert(msg);
        this.messageService.add({
          severity:'error',
          summary:'Error',
          detail:msg
        })
        this.formSubmitted = false;
      }
    })
    }else{
      // alert('Form is invalid ')
      this.messageService.add({
        severity:'error',
        summary:'Error',
        detail:'Form is invalid'
      })
      this.formSubmitted = false;
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


  onClear(form : NgForm){
    this.login ={
      employeeId:null,
      password:'',
      confirmPassword:''
    }
    this.formSubmitted = false;
    form.resetForm();
  }

}
