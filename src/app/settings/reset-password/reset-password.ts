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
  /** HR department (deptId === 1) may reset any employee's password. */
  isHrDept = false;
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
    const storedRole = localStorage.getItem('role');
    this.roleId = Number(localStorage.getItem('roleId')) || 0;
    const storedEmpId = localStorage.getItem('employeeId');
    const storedName = localStorage.getItem('name');
    const storedId = localStorage.getItem('userId');

    if (storedId) this.userId = Number(storedId);
    if (storedRole) this.role = storedRole.toLowerCase();

    // Access is by department, not role: HR (deptId === 1) may reset ANY
    // employee's password (searchable list); everyone else can only reset
    // their own account.
    this.isHrDept = Number(localStorage.getItem('deptId')) === 1;

    this.canResetMfa = localStorage.getItem('canResetMfa') === 'true';
    if (this.canResetMfa) this.loadMfaEmployees();

    if (this.isHrDept) {
      this.disableSelect = false;
      this.userService.listAllUsers().subscribe({
        next: (res: any) => {
          const items = Array.isArray(res) ? res : res?.items;
          this.employeeList = (items ?? []).map((u: any) => ({
            userId: u.id,
            employeeId: u.employeeCode,
            name: u.username
          }));
        },
        error: (err) => console.error('Failed to fetch employee list', err)
      });
    } else {
      // Self-service: lock to the logged-in user's own account.
      this.disableSelect = true;
      if (storedEmpId && storedName) {
        this.employeeList = [{ employeeId: storedEmpId, name: storedName }];
        this.selectedEmployee = this.employeeList[0];
      }
    }
  }




  onResetPassword(form: NgForm) {
    this.formSubmitted = true;

    if (!form.valid || this.passwordMismatch()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Confirm Password Not Matched'
      });
      this.formSubmitted = false;
      return;
    }

    // HR (deptId 1) resets the SELECTED employee via the admin endpoint;
    // everyone else resets their OWN account via the self-service endpoint
    // (which always targets the authenticated user server-side).
    let request$;
    if (this.isHrDept) {
      const targetUserId = Number(this.selectedEmployee?.userId);
      if (!targetUserId || Number.isNaN(targetUserId)) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Please select an employee'
        });
        this.formSubmitted = false;
        return;
      }
      request$ = this.userService.adminResetPassword(targetUserId, this.reset.newPassword);
    } else {
      request$ = this.userService.resetMyPassword(this.userId, this.reset.confirmPassword, this.reset.newPassword);
    }

    request$.subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Password reset successfully!'
        });
        this.onClear(form);
      },
      error: (err) => {
        const msg =
          err?.error?.error ||
          err?.error?.message ||
          'Failed to reset password.';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: msg
        });
        this.formSubmitted = false;
      }
    });
  }

  // ---- IT department: reset Google Authenticator ----
  canResetMfa = false;
  mfaEmployeeList: any[] = [];
  mfaSelectedEmployee: any = null;
  mfaResetting = false;

  private loadMfaEmployees() {
    this.userService.listAllUsers().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : res?.items;
        this.mfaEmployeeList = (items ?? []).map((u: any) => ({
          userId: u.id,
          employeeId: u.employeeCode,
          name: u.username
        }));
      },
      error: (err) => console.error('Failed to fetch employee list', err)
    });
  }

  onResetMfa() {
    const targetUserId = Number(this.mfaSelectedEmployee?.userId);
    if (!targetUserId) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please select an employee' });
      return;
    }
    if (!confirm(`Reset Google Authenticator for ${this.mfaSelectedEmployee?.name}? They will scan a new QR code at next login and their open sessions end.`)) return;
    this.mfaResetting = true;
    this.userService.adminResetMfa(targetUserId).subscribe({
      next: (res) => {
        this.mfaResetting = false;
        this.mfaSelectedEmployee = null;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: res.message });
      },
      error: (err) => {
        this.mfaResetting = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.error || 'Failed to reset authenticator.' });
      }
    });
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
