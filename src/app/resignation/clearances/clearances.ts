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
import { SkeletonModule } from 'primeng/skeleton';


@Component({
  selector: 'app-clearances',
  imports: [TableModule, CommonModule, TextareaModule, ReactiveFormsModule, FormsModule,
    SelectModule, DialogModule, BadgeModule, ButtonModule, SkeletonModule],
  templateUrl: './clearances.html',
  styleUrl: './clearances.css'
})
export class Clearances {
  // clearanceTypes = ['IT', 'FINANCE', 'HR', 'ADMIN', 'SECURITY'];
  userDepartmentId = Number(localStorage.getItem('deptId')) || 0;

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
  loading = true;
  isLoading = false;
  selectedClearance: any = null;
  isSaving: boolean = false;
  showChecklistPopup: boolean = false;

  itemStatusOptions = [
    { label: "Pending", value: "PENDING" },
    { label: "Cleared", value: "CLEARED" },
    { label: "Due", value: "DUE" },
    { label: "N/A", value: "NA" },
  ];
  selectedItems: any[] = [];




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
      next: (data) => {
        this.employees = data
        setTimeout(() => {
          this.loading = false
        }, 2000)
      },
      error: () => {
        this.notify('error', 'Failed to load employees')
        this.loading = false
      }
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
      next: (data: any[]) => {
        this.resignations = (data || []).map(r => ({
          ...r,
          gender: r.employee?.gender,
          photoUrl: r.employee?.photoUrl
        }));
      },
      error: () => this.notify('error', 'Failed to load resignations')
    });
  }


  /** ✅ Return clearance record for a given department type */
  // getClearance(r: any, type: string): any {
  //   const clearances = r?.clearances || []; // ✅ fallback to empty array
  //   return clearances.find((c: any) => c.type === type) || { type, decision: 'PENDING', note: '' };
  // }
  /** ✅ Popup handlers */
  // openPopup(resignation: any, action: 'APPROVED' | 'REJECTED'): void {
  //   this.selectedEmployee = resignation;
  //   this.popupAction = action;
  //   this.popupNote = '';
  //   // const cl = (resignation.clearances || []).find((c: any) => c.departmentId === this.userDepartmentId) || (resignation.clearances || [])[0];
  //   // this.selectedClearance = cl;
  //   const deptClearances = (resignation.clearances || [])
  //     .filter((c: any) => c.departmentId === this.userDepartmentId);

  //   this.selectedClearance = deptClearances[0]; // or choose based on type


  //   if (!this.selectedClearance) {
  //     this.notify("error", "No clearance configured for your department.");
  //     return;
  //   }

  //   this.showChecklistPopup = true;
  // }
  openPopup(resignation: any, action: 'APPROVED' | 'REJECTED'): void {
    this.selectedEmployee = resignation;
    this.selectedClearance = resignation.clearances
    this.popupAction = action;
    this.popupNote = '';

    const deptClearances = (resignation.clearances || [])
      .filter((c: any) => c.departmentId === this.userDepartmentId);

    console.log(deptClearances)
    if (!deptClearances.length) {
      this.notify("error", "No clearance configured for your department.");
      return;
    }

    // Merge all items from department clearances
    this.selectedItems = deptClearances.flatMap((c: any) =>
      (c.items || []).map((it: any) => ({
        ...it,
        clearanceId: c.id   // keep reference for saving
      }))
    );

    console.log(this.selectedItems)

    this.showChecklistPopup = true;
  }


  closePopup(): void {
    this.showChecklistPopup = false;
    this.selectedEmployee = null;
    this.selectedClearance = null;
    this.popupNote = '';
    this.popupAction = null;
  }

  submitAction(): void {
    if (!this.selectedEmployee || !this.popupAction) return;
    // const payload = {
    //   type: this.visibleClearanceTypes[0] as any,
    //   decision: this.popupAction,
    //   note: this.popupNote,
    //   verifierId: this.loggedInUserId
    // };
    const payload = {
      departmentId: this.userDepartmentId,
      decision: this.popupAction,
      note: this.popupNote,
      verifierId: this.loggedInUserId
    };

    this.isLoading = true;
    this.api.upsertClearance(this.selectedEmployee.id, payload).subscribe({
      next: () => {
        this.notify('success', `Clearance ${this.popupAction!.toLowerCase()} successfully.`);
        this.closePopup();
        this.loadResignations();
        this.isLoading = false;
      },
      error: () => {
        this.notify('error', `Failed to ${this.popupAction!.toLowerCase()} clearance.`);
        this.isLoading = false;
      }
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


  // get visibleClearanceTypes() {
  //   // HR Manager or Admin can see all clearances
  //   if (this.role === 'HR Manager') {
  //     return this.clearanceTypes;
  //   }

  //   // Reporting Manager: only their department clearance
  //   if (this.userDeptName) {
  //     return [this.userDeptName];
  //   }

  //   return [];
  // }

  // getClearance(r: any): any {
  //   const clearances = r?.clearances || [];
  //   console.log('Clearances for resignation', r.id, clearances);
  //   return clearances.find(
  //     (c: any) => c.departmentId === this.userDepartmentId
  //   ) || { decision: 'PENDING', note: '' };
  // }
  getDepartmentClearances(r: any): any[] {
    const clearances = r?.clearances || [];
    return clearances.filter(
      (c: any) => c.departmentId === this.userDepartmentId
    );
  }

  hasPendingClearance(r: any): boolean {
    return this.getDepartmentClearances(r)
      .some((c: any) => c.decision === 'PENDING');
  }


  getDefaultImage(gender?: string | null): string {
    const g = gender?.toUpperCase?.() || 'MALE';
    return g === 'FEMALE'
      ? '/img-women.png'
      : '/img.png';
  }
  getClearanceDecision(r: any): string {
    const cl = (r.clearances || []).find((c: any) => c.departmentId === this.userDepartmentId) || (r.clearances || [])[0];
    return cl?.decision || "PENDING";
  }

  // async saveItems() {
  //   if (!this.selectedEmployee || !this.selectedClearance) return;

  //   const items = (this.selectedClearance.items || []).map((i: any) => ({
  //     id: i.id,
  //     status: i.status,
  //     note: i.note,
  //   }));

  //   this.isSaving = true;
  //   this.api.bulkUpdateClearanceItems(this.selectedEmployee.id, this.selectedClearance.id, { items }).subscribe({
  //     next: () => {
  //       this.notify("success", "Clearance checklist updated.");
  //       this.closePopup();
  //       this.loadResignations();
  //       this.isSaving = false;
  //     },
  //     error: () => {
  //       this.notify("error", "Failed to update clearance checklist.");
  //       this.isSaving = false;
  //     },
  //   });
  // }

  async saveItems() {
    if (!this.selectedEmployee || !this.selectedItems.length) return;

    const payload = this.selectedItems.map((i: any) => ({
      id: i.id,
      status: i.status,
      note: i.note,
    }));

    this.isSaving = true;

    this.api.bulkUpdateClearanceItems(
      this.selectedEmployee.id,
      { items: payload }
    ).subscribe({
      next: () => {
        this.notify("success", "Clearance checklist updated.");
        this.closePopup();
        this.loadResignations();
        this.isSaving = false;
      },
      error: () => {
        this.notify("error", "Failed to update clearance checklist.");
        this.isSaving = false;
      },
    });
  }

  openSpecificClearance(resignation: any, clearance: any) {
    this.selectedEmployee = resignation;
    this.selectedClearance = clearance;
    this.showChecklistPopup = true;
  }
canEditClearance(r: any): boolean {
  const clearances = this.getDepartmentClearances(r);
  if (!clearances.length) return false;

  // editable unless all are approved
  return clearances.some((c: any) => c.decision !== 'APPROVED');
}


}
