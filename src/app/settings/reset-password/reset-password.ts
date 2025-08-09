import { Component } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Select } from 'primeng/select';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, Select, PasswordModule, FloatLabelModule, ButtonModule, CommonModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword {

  reset = {
    newPassword: '',
    confirmPassword: ''
  };

  employee: { employeeId: string; name: string } | null = null;
  employeeList: any[] = [];
  selectedEmployee: any;

  ngOnInit() {
    const stored = localStorage.getItem('employee');
    if (stored) {
      this.employee = JSON.parse(stored);
      this.employeeList = [this.employee];
      this.selectedEmployee = this.employee; // optional auto-select
    }
  }




  onResetPassword(form: NgForm) {
    if (form.valid && !this.passwordMismatch()) {
      alert('Password reset successfully!');
      console.log('Password Reset:', this.reset);

    } else {
      alert('Confirm Password Not Mathched');
    }
    // this.onClear(); 
  }

  passwordMismatch(): boolean {
    return (
      !!this.reset.newPassword &&
      !!this.reset.confirmPassword &&
      this.reset.newPassword !== this.reset.confirmPassword
    );
  }

  invaild(control: NgModel) {
    return control.invalid && (control.dirty || control.touched)
  }

  showError(control: NgModel) {
    return this.invaild(control);
  }


  onClear() {
    this.reset = {
      newPassword: '',
      confirmPassword: ''
    };
    alert('form cleared')
  }

}
