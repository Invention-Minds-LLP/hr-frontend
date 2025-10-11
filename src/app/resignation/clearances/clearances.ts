import { Component } from '@angular/core';
import { Resignation } from '../../services/resignation/resignation';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Departments } from '../../services/departments/departments';
import { Dialog, DialogModule } from 'primeng/dialog';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { Employee, Employees } from '../../services/employees/employees';


@Component({
  selector: 'app-clearances',
  imports: [TableModule, CommonModule, TextareaModule, ReactiveFormsModule, FormsModule,
    SelectModule, DialogModule, BadgeModule, ButtonModule],
  templateUrl: './clearances.html',
  styleUrl: './clearances.css'
})
export class Clearances {
  clearanceTypes = ['IT', 'FINANCE', 'HR', 'ADMIN', 'SECURITY'];
  clearanceStatusOptions = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' }
  ];

  resignations: any[] = [];
  loggedInUserId = Number(localStorage.getItem('userId')); // or from auth service
  departments: any[] = [];
  deptId = Number(localStorage.getItem('deptId')) || 0;
  role = localStorage.getItem('role') || '';
  userDeptName = '';
  // Popup variables
  showPopup = false;
  popupAction: 'APPROVED' | 'REJECTED' | null = null;
  popupNote = '';
  selectedEmployee: any = null;
  employees: Employee[] = [];


  constructor(
    private api: Resignation,
    private messageService: MessageService,
    private deptService: Departments,
    private employeeService: Employees
  ) { }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadResignations();
    this.employeeService.getActiveEmployees().subscribe({
      next: (data) => this.employees = data,
      error: () => this.notify('error', 'Failed to load employees')
    });
  }
  loadDepartments(): void {
    this.deptService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data;
        this.setUserDeptName();
      },
      error: () => this.notify('error', 'Failed to load departments')
    });
  }

  setUserDeptName(): void {
    const userDept = this.departments.find(d => d.id === this.deptId);
    this.userDeptName = userDept ? userDept.name.toUpperCase() : '';
  }


  /** ✅ Load all resignations + clearance info */
  loadResignations(): void {
    this.api.listWithClearances().subscribe({
      next: (data) => this.resignations = data,
      error: () => this.notify('error', 'Failed to load resignations')
    });
  }

  /** ✅ Return clearance record for a given department type */
  getClearance(r: any, type: string): any {
    const clearances = r?.clearances || []; // ✅ fallback to empty array
    return clearances.find((c: any) => c.type === type) || { type, decision: 'PENDING', note: '' };
  }
  /** ✅ Popup handlers */
  openPopup(resignation: any, action: 'APPROVED' | 'REJECTED'): void {
    this.selectedEmployee = resignation;
    this.popupAction = action;
    this.popupNote = '';
    this.showPopup = true;
  }

  closePopup(): void {
    this.showPopup = false;
    this.selectedEmployee = null;
    this.popupNote = '';
    this.popupAction = null;
  }

  submitAction(): void {
    if (!this.selectedEmployee || !this.popupAction) return;
    const payload = {
      type: this.visibleClearanceTypes[0] as any,
      decision: this.popupAction,
      note: this.popupNote,
      verifierId: this.loggedInUserId
    };

    this.api.upsertClearance(this.selectedEmployee.id, payload).subscribe({
      next: () => {
        this.notify('success', `Clearance ${this.popupAction!.toLowerCase()} successfully.`);
        this.closePopup();
        this.loadResignations();
      },
      error: () => this.notify('error', `Failed to ${this.popupAction!.toLowerCase()} clearance.`)
    });
  }


  /** ✅ Get manager name (optional improvement) */
  getManagerName(managerId: number): string {
    const manager = this.employees.find(r => r?.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : '—';
  }

  /** ✅ Toast notifications */
  private notify(severity: 'success' | 'error', summary: string): void {
    this.messageService.add({ severity, summary });
  }


  get visibleClearanceTypes() {
    // HR Manager or Admin can see all clearances
    if (this.role === 'HR Manager') {
      return this.clearanceTypes;
    }

    // Reporting Manager: only their department clearance
    if (this.userDeptName) {
      return [this.userDeptName];
    }

    return [];
  }


}
