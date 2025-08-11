import { Component } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Select } from 'primeng/select';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { User } from '../../services/user/user';

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
  role: string = '';
  disableSelect = false;
  userId: any;


  constructor(private userService: User){}

  ngOnInit() {
    // const stored = localStorage.getItem('employee');
    // if (stored) {
    //   this.employee = JSON.parse(stored);
    //   this.employeeList = [this.employee];
    //   this.selectedEmployee = this.employee; // optional auto-select
    // }
    const storedEmployee = localStorage.getItem('employee');
    const storedRole = localStorage.getItem('role');
    const storedEmpId = localStorage.getItem('employeeId');
    const storedName = localStorage.getItem('name');
    const storedId = localStorage.getItem('userId');

    if(storedId){
      this.userId = storedId;
    }

    if (storedRole) {
      this.role = storedRole.toLowerCase();
    }

    const restrictedRoles = ['executive', 'intern', 'junior executive'];
    if (restrictedRoles.includes(this.role)) {
      // Just show their own employee
      this.disableSelect = true;
      if (storedEmpId && storedName) {
        this.employeeList = [{ employeeId: storedEmpId, name: storedName }];
        this.selectedEmployee = this.employeeList[0];
      }
    } else {
      this.userService.listAllUsers().subscribe({
        next: (res: any) => {
          const items = Array.isArray(res) ? res : res?.items;
          const list = (items ?? []).map((u: any) => ({
            employeeId: u.employeeCode,
            name: u.username
          }));
          this.employeeList = list;
        },
        error: (err) => console.error('Failed to fetch employee list', err)
      });
      
    }
  }




  onResetPassword(form: NgForm) {
    if (form.valid && !this.passwordMismatch()) {
      this.userService
      .resetMyPassword(parseInt(this.userId),this.reset.confirmPassword, this.reset.newPassword)
      .subscribe({
        next: (res) => {
          alert(res?.message || 'Password reset successfully!');
          this.onClear();
        },
        error: (err) => {
          const msg =
            err?.error?.error ||
            err?.error?.message ||
            'Failed to reset password.';
          alert(msg);
        }
      })
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
  }

}
