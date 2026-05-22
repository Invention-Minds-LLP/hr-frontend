import { Component } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Select } from 'primeng/select';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { User } from '../../services/user/user';
import { from } from 'rxjs';
import { MessageService } from 'primeng/api';

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
  userId: number | null = null;
  roleId: number | null = null;

  formSubmitted = false;

  constructor(private userService: User, private messageService: MessageService) { }

  ngOnInit() {
    // const stored = localStorage.getItem('employee');
    // if (stored) {
    //   this.employee = JSON.parse(stored);
    //   this.employeeList = [this.employee];
    //   this.selectedEmployee = this.employee; // optional auto-select
    // }
    const storedEmployee = localStorage.getItem('employee');
    const storedRole = localStorage.getItem('role');
    this.roleId = Number(localStorage.getItem('roleId')) || 0;
    console.log(this.roleId)
    const storedEmpId = localStorage.getItem('employeeId');
    const storedName = localStorage.getItem('name');
    const storedId = localStorage.getItem('userId');

    if (storedId) this.userId = Number(storedId);

    console.log(this.userId)

    if (storedRole) {
      this.role = storedRole.toLowerCase();
    }

    const restrictedRoles = ['executives', 'intern', 'junior executive', 'reporting manager'];
    console.log(this.role)
    // Incharge (roleId 5) is also self-service: no dropdown is shown for them
    // (it only renders for admin roleId 1), so they must reset their own account.
    if (restrictedRoles.includes(this.role) || this.roleId === 5) {
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
            userId: u.id,
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
    this.formSubmitted = true;
    if (form.valid && !this.passwordMismatch()) {

      const targetUserId =
        this.disableSelect
          ? this.userId              // self reset
          : Number(this.selectedEmployee?.userId);

      console.log(targetUserId);
      if (!targetUserId || Number.isNaN(targetUserId)) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Please select an employee'
        });
        this.formSubmitted = false;
        return;
      }
      this.userService
        .resetMyPassword(targetUserId, this.reset.confirmPassword, this.reset.newPassword)
        .subscribe({
          next: (res) => {
            // alert(res?.message || 'Password reset successfully!');
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: res.message || 'Password reset successfully!'
            })
            this.onClear(form);
          },
          error: (err) => {
            const msg =
              err?.error?.error ||
              err?.error?.message ||
              'Failed to reset password.';
            // alert(msg);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: msg
            })
          }
        })

    } else {
      // alert('Confirm Password Not Mathched');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Confirm Password Not Matched'
      })
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


  onClear(form: NgForm) {
    this.reset = {
      newPassword: '',
      confirmPassword: ''
    };
    this.formSubmitted = false;
    form.resetForm();
  }

}
