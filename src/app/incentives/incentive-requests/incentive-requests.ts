import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { IncentiveService } from '../../services/incentive/incentive';
import { Employees } from '../../services/employees/employees';

@Component({
  selector: 'app-incentive-requests',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    TooltipModule, DialogModule, InputTextModule, TextareaModule, SelectModule,
    DatePickerModule, AutoCompleteModule, ConfirmDialogModule, ModuleGuide
  ],
  templateUrl: './incentive-requests.html',
  styleUrl: './incentive-requests.css',
  providers: [MessageService, ConfirmationService]
})
export class IncentiveRequests implements OnInit {
  incentives: any[] = [];
  loading = true;
  loggedEmpId = Number(localStorage.getItem('empId')) || 0;
  loggedRoleId = Number(localStorage.getItem('roleId')) || 0;
  isHRManager = false;

  // Request dialog
  dialogVisible = false;
  selectedEmployee: any = null;
  formType = 'PERFORMANCE';
  formAmount: number | null = null;
  formDescription = '';
  formEffectiveDate: Date | null = null;
  formRemarks = '';

  // Team employees
  teamEmployees: any[] = [];
  filteredEmployees: any[] = [];

  // Approve/Reject dialog
  actionDialogVisible = false;
  actionItem: any = null;
  actionType: 'approve' | 'reject' = 'approve';
  rejectReason = '';

  typeOptions = [
    { label: 'Performance', value: 'PERFORMANCE' },
    { label: 'Bonus', value: 'BONUS' },
    { label: 'Festival', value: 'FESTIVAL' },
    { label: 'Referral', value: 'REFERRAL' },
    { label: 'Other', value: 'OTHER' },
  ];

  constructor(
    private incentiveService: IncentiveService,
    private employeeService: Employees,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.isHRManager = this.loggedRoleId === 1;
    this.loadData();
    this.loadTeamEmployees();
  }

  loadData() {
    this.loading = true;
    if (this.isHRManager) {
      // HR sees all requests
      this.incentiveService.getAll({ source: 'REQUEST' }).subscribe({
        next: (data) => { this.incentives = data; this.loading = false; },
        error: () => { this.loading = false; }
      });
    } else {
      // Manager sees own team
      this.incentiveService.getTeamIncentives(this.loggedEmpId).subscribe({
        next: (data) => { this.incentives = data; this.loading = false; },
        error: () => { this.loading = false; }
      });
    }
  }

  loadTeamEmployees() {
    this.employeeService.getByManager(this.loggedEmpId).subscribe({
      next: (data: any[]) => {
        this.teamEmployees = data.map((e: any) => ({
          ...e,
          displayName: `${e.employeeCode} - ${e.firstName} ${e.lastName}`
        }));
      }
    });
  }

  searchEmployees(event: any) {
    const query = (event.query || '').toLowerCase();
    this.filteredEmployees = this.teamEmployees.filter(e =>
      e.displayName.toLowerCase().includes(query)
    );
  }

  fmtDate(d: any): string {
    if (!d) return '';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  // ── Request Incentive ──────────────────────────────────────────────
  openRequestDialog() {
    this.selectedEmployee = null;
    this.formType = 'PERFORMANCE';
    this.formAmount = null;
    this.formDescription = '';
    this.formEffectiveDate = null;
    this.formRemarks = '';
    this.dialogVisible = true;
  }

  submitRequest() {
    if (!this.selectedEmployee?.id || !this.formAmount || !this.formEffectiveDate) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Employee, amount, and date are required' });
      return;
    }
    this.incentiveService.request({
      employeeId: this.selectedEmployee.id,
      type: this.formType,
      amount: this.formAmount,
      description: this.formDescription || undefined,
      effectiveDate: this.formEffectiveDate.toISOString(),
      remarks: this.formRemarks || undefined,
      requestedBy: this.loggedEmpId,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Submitted', detail: 'Incentive request submitted to HR' });
        this.dialogVisible = false;
        this.loadData();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  // ── HR Approve/Reject ──────────────────────────────────────────────
  openActionDialog(item: any, type: 'approve' | 'reject') {
    this.actionItem = item;
    this.actionType = type;
    this.rejectReason = '';
    this.actionDialogVisible = true;
  }

  confirmAction() {
    if (this.actionType === 'reject' && !this.rejectReason.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Rejection reason is required' });
      return;
    }

    const payload: any = {};
    if (this.actionType === 'approve') {
      payload.status = 'APPROVED';
      payload.approvedBy = this.loggedEmpId;
    } else {
      payload.status = 'REJECTED';
      payload.rejectedBy = this.loggedEmpId;
      payload.rejectReason = this.rejectReason;
    }

    this.incentiveService.update(this.actionItem.id, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: this.actionType === 'approve' ? 'success' : 'warn',
          summary: this.actionType === 'approve' ? 'Approved' : 'Rejected',
          detail: `Incentive ${this.actionType === 'approve' ? 'approved' : 'rejected'}`
        });
        this.actionDialogVisible = false;
        this.loadData();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  getStatusClass(s: string): string {
    switch (s) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'PAID': return 'status-paid';
      case 'REJECTED': return 'status-rejected';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
  }
}
