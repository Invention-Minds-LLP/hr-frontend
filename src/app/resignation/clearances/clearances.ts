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
import { TooltipModule } from 'primeng/tooltip';
import { FileUrlPipe } from '../../pipes/file-url.pipe';


@Component({
  selector: 'app-clearances',
  imports: [TableModule, CommonModule, TextareaModule, ReactiveFormsModule, FormsModule,
    SelectModule, DialogModule, BadgeModule, ButtonModule, SkeletonModule, FileUrlPipe,
    TooltipModule],
  templateUrl: './clearances.html',
  styleUrl: './clearances.css'
})
export class Clearances {
  // clearanceTypes = ['IT', 'FINANCE', 'HR', 'ADMIN', 'SECURITY'];
  userDepartmentId = Number(localStorage.getItem('deptId')) || 0;

  /** Every department this user clears for — an HOD can head more than one.
   *  Starts with their own department so the list works before it loads. */
  userDepartmentIds: number[] = [Number(localStorage.getItem('deptId')) || 0];
  /** HR clears for every department. */
  isHRUser = false;

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
  /** Departments covered by the clearance popup currently open. */
  selectedDepartmentIds: number[] = [];




  constructor(
    private api: Resignation,
    private messageService: MessageService,
    private deptService: Departments,
    private employeeService: Employees
  ) { }

  ngOnInit(): void {
    this.loadMyDepartments();
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
  /** Which departments may this user clear for? */
  loadMyDepartments(): void {
    this.api.myClearanceDepartments().subscribe({
      next: (r) => {
        this.isHRUser = !!r.isHR;
        if (r.departmentIds?.length) this.userDepartmentIds = r.departmentIds;
      },
      error: () => { /* keep the own-department fallback */ },
    });
  }

  /** A clearance this user may act on at all. HR can act for any department. */
  canActOn(c: any): boolean {
    return this.isHRUser || this.userDepartmentIds.includes(c?.departmentId);
  }

  /**
   * The clearances that are this user's OWN responsibility — the departments
   * they head. HR is not given everyone's desks here: they would otherwise open
   * one checklist holding every department's lines at once. HR still reaches any
   * individual department by clicking its chip.
   */
  myClearances(r: any): any[] {
    return (r?.clearances || []).filter((c: any) => this.userDepartmentIds.includes(c?.departmentId));
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

    // Only the desks this person is responsible for. HR opens a specific
    // department from its chip instead of getting all of them at once.
    const deptClearances = this.myClearances(resignation);

    if (!deptClearances.length) {
      this.notify(
        'error',
        this.isHRUser
          ? 'No clearance for your own department. Click a department chip to open that one.'
          : 'No clearance configured for your department.',
      );
      return;
    }

    // Remember which departments this decision covers — a head of several
    // departments can hold more than one clearance on the same exit.
    this.selectedDepartmentIds = [
      ...new Set(deptClearances.map((c: any) => c.departmentId).filter((d: any) => !!d)),
    ] as number[];

    // Merge all items from department clearances, keeping the department on
    // each one — a head of several departments sees them all in one popup and
    // needs to know which desk each line belongs to.
    this.selectedItems = deptClearances.flatMap((c: any) =>
      (c.items || []).map((it: any) => ({
        ...it,
        clearanceId: c.id,
        departmentId: c.departmentId,
        departmentName: c.type === 'HOD' ? 'Department head' : (c.department?.name || c.type || 'Clearance'),
      }))
    );

    this.buildItemGroups();
    this.showChecklistPopup = true;
  }

  /** Plain name for a clearance. Stored types are internal keys — "HOD" and
   *  "DEPT_<department>" — which should never reach the screen. */
  clearanceLabel(cl: any): string {
    if (cl?.department?.name) return cl.department.name;
    const type = String(cl?.type || '');
    if (type === 'HOD') return 'Department head';
    return type.replace(/^DEPT_/, '') || 'Clearance';
  }

  decisionLabel(decision: string): string {
    switch (decision) {
      case 'APPROVED': return 'Cleared';
      case 'REJECTED': return 'Due';
      default: return 'Pending';
    }
  }

  /**
   * Items grouped by the desk responsible, built ONCE when the popup opens.
   *
   * This was a getter. Angular calls a getter on every change-detection pass,
   * and it returned fresh arrays and objects each time, so *ngFor tore down and
   * rebuilt every row — inputs included — whose own events triggered the next
   * pass. The dialog locked the tab up.
   */
  itemGroups: { department: string; items: any[] }[] = [];

  private buildItemGroups(): void {
    const groups = new Map<string, any[]>();
    for (const it of this.selectedItems) {
      const key = it.departmentName || 'Clearance';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }
    this.itemGroups = [...groups.entries()].map(([department, items]) => ({ department, items }));
  }

  /** Stable identities, so editing a note never re-creates the row. */
  trackGroup = (_: number, g: { department: string }) => g.department;
  trackItem = (_: number, it: any) => it.id;

  /** One click per decision, instead of opening a dropdown for every line. */
  setItemStatus(item: any, status: string): void {
    item.status = status;
  }

  countBy(status: string): number {
    return this.selectedItems.filter(i => i.status === status).length;
  }

  /** Lines that have been dealt with — cleared or ruled not applicable. */
  get settledCount(): number {
    return this.countBy('CLEARED') + this.countBy('NA');
  }

  get progressPct(): number {
    if (!this.selectedItems.length) return 0;
    return Math.round((this.settledCount / this.selectedItems.length) * 100);
  }

  /** What the clearance will become once saved — mirrors the server's rule. */
  get pendingOutcome(): 'APPROVED' | 'REJECTED' | 'PENDING' {
    if (this.selectedItems.some(i => i.status === 'DUE')) return 'REJECTED';
    if (this.selectedItems.length && this.selectedItems.every(i => i.status === 'CLEARED' || i.status === 'NA')) return 'APPROVED';
    return 'PENDING';
  }


  closePopup(): void {
    this.showChecklistPopup = false;
    this.selectedEmployee = null;
    this.selectedClearance = null;
    this.selectedDepartmentIds = [];
    this.selectedItems = [];
    this.itemGroups = [];
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
    // One call per department this user holds a clearance for on this exit.
    const deptIds = this.selectedDepartmentIds.length
      ? this.selectedDepartmentIds
      : [this.userDepartmentId];

    this.isLoading = true;
    let remaining = deptIds.length;
    let failed = false;

    deptIds.forEach((departmentId) => {
      this.api.upsertClearance(this.selectedEmployee.id, {
        departmentId,
        decision: this.popupAction!,
        note: this.popupNote,
        verifierId: this.loggedInUserId,
      }).subscribe({
        next: () => this.finishDecision(--remaining, failed),
        error: () => { failed = true; this.finishDecision(--remaining, failed); },
      });
    });
  }

  private finishDecision(remaining: number, failed: boolean): void {
    if (remaining > 0) return;
    this.isLoading = false;
    if (failed) {
      this.notify('error', `Failed to ${this.popupAction!.toLowerCase()} clearance.`);
      return;
    }
    this.notify('success', `Clearance ${this.popupAction!.toLowerCase()} successfully.`);
    this.closePopup();
    this.loadResignations();
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
    return clearances.filter((c: any) => this.canActOn(c));
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
    const mine = this.getDepartmentClearances(r);
    // Several departments on one exit: show the worst still-open state, so a
    // head is not told "approved" while another of their departments waits.
    if (mine.some((c: any) => c.decision === 'REJECTED')) return 'REJECTED';
    if (mine.some((c: any) => c.decision === 'PENDING')) return 'PENDING';
    if (mine.length) return 'APPROVED';
    return (r.clearances || [])[0]?.decision || 'PENDING';
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
    this.selectedItems = (clearance?.items || []).map((it: any) => ({
      ...it,
      clearanceId: clearance.id,
      departmentId: clearance.departmentId,
      departmentName: this.clearanceLabel(clearance),
    }));
    this.selectedDepartmentIds = clearance?.departmentId ? [clearance.departmentId] : [];
    this.buildItemGroups();
    this.showChecklistPopup = true;
  }
canEditClearance(r: any): boolean {
  const clearances = this.getDepartmentClearances(r);
  if (!clearances.length) return false;

  // editable unless all are approved
  return clearances.some((c: any) => c.decision !== 'APPROVED');
}


}
