import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { RequisitionService } from '../../services/requisition-service/requisition-service';
import { Tag } from 'primeng/tag';
import { RequisitionForm } from '../requisition-form/requisition-form';
import { Departments } from '../../services/departments/departments';
import { SkeletonModule } from 'primeng/skeleton';
import { ModuleGuide } from '../../shared/module-guide/module-guide';

@Component({
  selector: 'app-requisition-list',
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, DialogModule, TextareaModule,
    Tag, RequisitionForm, SkeletonModule, ModuleGuide,
  ],
  templateUrl: './requisition-list.html',
  styleUrl: './requisition-list.css'
})
export class RequisitionList {
  requisitions: any[] = [];
  selectedRequisition: any = null;
  loading = true;
  departments: any[] = [];

  // Logged-in user — used to gate the Withdraw button.
  private myEmpId = Number(localStorage.getItem('empId') || 0);
  private myRoleId = Number(localStorage.getItem('roleId') || 0);

  @Output() selectRequisition = new EventEmitter<any>();

  constructor(private requisitionService: RequisitionService, private departmentService: Departments) { }

  ngOnInit() {
    this.loadRequisitions();
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
  }

  createNewRequisition() {
    this.selectedRequisition = {}; // or null-based blank object
  }
  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }

  getDepartmentName(id: number): string {
    return this.departments.find(dep => dep.id === id)?.name || 'N/A';
  }

  loadRequisitions() {
    this.loading = true;
    const roleId = Number(localStorage.getItem('roleId'));
    const empId = Number(localStorage.getItem('empId'));
    this.requisitionService.getRequisitions(roleId, empId).subscribe({
      next: (data) => {
        this.requisitions = data;
        // this.loading = false;
        setTimeout(() => {
          this.loading = false
        }, 2000)
      },
      error: (err) => {
        console.error('Error fetching requisitions:', err);
        this.loading = false;
      }
    });
  }

  onSelect(req: any) {
    this.selectedRequisition = req;
    this.selectRequisition.emit(req);
  }
  closeRequisition() {
    this.selectedRequisition = null;
  }

  /** True when the current user is allowed to withdraw `row`.
   *  Mirrors the backend permission rules:
   *    - HR / Admin (roleId 1)        → any status before HR_APPROVED
   *    - Management (roleId 4)        → any status before HR_APPROVED
   *    - Raiser themselves            → at status = RAISED
   *    - HOD/Mgmt who auto-approved   → at status = HOD_APPROVED if it's their own
   */
  canWithdraw(row: any): boolean {
    if (!row) return false;
    const TERMINAL = ['REJECTED', 'WITHDRAWN', 'HR_APPROVED', 'COO_APPROVED', 'RECEIVED_BY_HR', 'CLOSED'];
    if (TERMINAL.includes(row.status)) return false;

    const isHR    = this.myRoleId === 1;
    const isMgmt  = this.myRoleId === 4;
    if (isHR || isMgmt) return true;

    const isOwner = row.raisedByEmployeeId === this.myEmpId;
    if (!isOwner) return false;
    if (row.status === 'RAISED') return true;
    if (row.status === 'HOD_APPROVED' && (this.myRoleId === 3 || this.myRoleId === 4)) return true;
    return false;
  }

  /* ── Withdraw dialog state ────────────────────────────────── */
  withdrawDialogVisible = false;
  withdrawTarget: any = null;
  withdrawReason = '';
  withdrawSubmitting = false;
  withdrawError: string | null = null;

  /** Open the dialog (replacing the old window.prompt). */
  withdraw(row: any, ev?: Event) {
    if (ev) ev.stopPropagation();
    if (!this.canWithdraw(row)) return;
    this.withdrawTarget = row;
    this.withdrawReason = '';
    this.withdrawError = null;
    this.withdrawSubmitting = false;
    this.withdrawDialogVisible = true;
  }

  cancelWithdraw() {
    this.withdrawDialogVisible = false;
    this.withdrawTarget = null;
    this.withdrawReason = '';
    this.withdrawError = null;
  }

  /** Submit the withdraw call. The reason field is optional (backend accepts null). */
  confirmWithdraw() {
    if (!this.withdrawTarget || this.withdrawSubmitting) return;
    this.withdrawSubmitting = true;
    this.withdrawError = null;
    const row = this.withdrawTarget;
    const reason = this.withdrawReason.trim();

    this.requisitionService.withdraw(row.id, reason).subscribe({
      next: () => {
        // Optimistic local update so the table reflects the change immediately.
        row.status = 'WITHDRAWN';
        row.withdrawnReason = reason || null;
        this.withdrawDialogVisible = false;
        this.withdrawTarget = null;
        this.withdrawReason = '';
        this.withdrawSubmitting = false;
        this.loadRequisitions();
      },
      error: (err) => {
        this.withdrawError = err?.error?.message ?? 'Could not withdraw the requisition.';
        this.withdrawSubmitting = false;
      },
    });
  }
}
