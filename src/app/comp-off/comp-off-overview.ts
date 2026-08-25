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
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ModuleGuide } from '../shared/module-guide/module-guide';
import { CompOffService } from '../services/comp-off/comp-off';
import { Employees } from '../services/employees/employees';
import { AutoCompleteModule } from 'primeng/autocomplete';

@Component({
  selector: 'app-comp-off-overview',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    TooltipModule, DialogModule, InputTextModule, TextareaModule, SelectModule,
    DatePickerModule, ConfirmDialogModule, ModuleGuide, AutoCompleteModule
  ],
  templateUrl: './comp-off-overview.html',
  styleUrl: './comp-off-overview.css',
  providers: [MessageService, ConfirmationService]
})
export class CompOffOverview implements OnInit {
  credits: any[] = [];
  loading = true;
  statusFilter: string | null = null;
  loggedEmpId = Number(localStorage.getItem('empId')) || 0;

  // Credits are what employees can spend; requests are claims that have not
  // been credited yet. Keeping them in one page but separate views stops the
  // two being read as the same thing.
  view: 'credits' | 'requests' = 'credits';
  requests: any[] = [];
  requestFilter: string | null = 'PENDING_HR';
  pendingHrCount = 0;
  actionLoading: { [id: number]: boolean } = {};

  rejectDialogVisible = false;
  rejectTarget: any = null;
  rejectNote = '';

  requestStatusOptions = [
    { label: 'Awaiting HR', value: 'PENDING_HR' },
    { label: 'With manager', value: 'PENDING_MANAGER' },
    { label: 'Credited', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'All', value: null },
  ];

  // ── Filters ──────────────────────────────────────────────────────────────
  // Applied client-side over the loaded rows and ANDed together, so name + date
  // means that employee on that date — not either/or. The status dropdowns stay
  // server-side; these three narrow whatever the server returned.
  searchText = '';
  deptFilter: string | null = null;
  workDateFilter: Date | null = null;

  get hasActiveFilters(): boolean {
    return !!this.searchText.trim() || !!this.deptFilter || !!this.workDateFilter;
  }

  /** Departments present in the rows on screen — no point offering empty ones. */
  get departmentOptions(): { label: string; value: string }[] {
    const rows = this.view === 'credits' ? this.credits : this.requests;
    const names = new Set<string>();
    for (const r of rows) {
      const d = r?.employee?.Department?.name;
      if (d) names.add(d);
    }
    return [...names].sort().map(n => ({ label: n, value: n }));
  }

  get filteredCredits(): any[] {
    return this.credits.filter(r => this.matchesFilters(r));
  }

  get filteredRequests(): any[] {
    return this.requests.filter(r => this.matchesFilters(r));
  }

  private matchesFilters(row: any): boolean {
    const term = this.searchText.trim().toLowerCase();
    if (term) {
      const name = `${row?.employee?.firstName ?? ''} ${row?.employee?.lastName ?? ''}`.toLowerCase();
      const code = (row?.employee?.employeeCode ?? '').toLowerCase();
      if (!name.includes(term) && !code.includes(term)) return false;
    }

    if (this.deptFilter && row?.employee?.Department?.name !== this.deptFilter) return false;

    // Compared as rendered dd-MM-yyyy: workDate is stored as IST midnight in UTC,
    // so comparing the formatted day avoids the timezone offset entirely.
    if (this.workDateFilter && this.fmtDate(row?.workDate) !== this.fmtDate(this.workDateFilter)) {
      return false;
    }

    return true;
  }

  clearFilters() {
    this.searchText = '';
    this.deptFilter = null;
    this.workDateFilter = null;
  }

  dialogVisible = false;
  selectedEmployee: any = null;
  formWorkDate: Date | null = null;
  formExpiryDate: Date | null = null;
  formReason = '';

  // Employee search
  allEmployees: any[] = [];
  filteredEmployees: any[] = [];

  statusOptions = [
    { label: 'All', value: null },
    { label: 'Unused', value: 'unused' },
    { label: 'Used', value: 'used' },
  ];

  constructor(
    private compOffService: CompOffService,
    private employeeService: Employees,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadEmployees();
    this.refreshPendingCount();
  }

  setView(view: 'credits' | 'requests') {
    this.view = view;
    if (view === 'requests') this.loadRequests();
    else this.loadData();
  }

  loadRequests() {
    this.loading = true;
    const params: any = {};
    if (this.requestFilter) params.status = this.requestFilter;
    this.compOffService.getRequests(params).subscribe({
      next: (data) => { this.requests = data || []; this.loading = false; this.refreshPendingCount(); },
      error: () => { this.loading = false; },
    });
  }

  /** Badge on the Requests button — HR's actual queue depth. */
  refreshPendingCount() {
    this.compOffService.getHrPending().subscribe({
      next: (rows) => { this.pendingHrCount = (rows || []).length; },
      error: () => { this.pendingHrCount = 0; },
    });
  }

  hrApprove(row: any) {
    this.actionLoading[row.id] = true;
    this.compOffService.hrDecide(row.id, true).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success', summary: 'Approved',
          detail: 'Comp-off credited — valid for 30 days from the work date',
        });
        this.actionLoading[row.id] = false;
        this.loadRequests();
      },
      error: (e) => {
        this.actionLoading[row.id] = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' });
      },
    });
  }

  openReject(row: any) {
    this.rejectTarget = row;
    this.rejectNote = '';
    this.rejectDialogVisible = true;
  }

  confirmReject() {
    if (!this.rejectNote.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Reason required', detail: 'Say why you are rejecting it' });
      return;
    }
    const row = this.rejectTarget;
    this.actionLoading[row.id] = true;
    this.compOffService.hrDecide(row.id, false, this.rejectNote.trim()).subscribe({
      next: () => {
        this.messageService.add({ severity: 'info', summary: 'Rejected', detail: 'Comp-off request rejected' });
        this.actionLoading[row.id] = false;
        this.rejectDialogVisible = false;
        this.loadRequests();
      },
      error: (e) => {
        this.actionLoading[row.id] = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' });
      },
    });
  }

  fmtHours(minutes: number | null): string {
    if (minutes === null || minutes === undefined) return '-';
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING_MANAGER': return 'With manager';
      case 'PENDING_HR': return 'Awaiting HR';
      case 'APPROVED': return 'Credited';
      case 'REJECTED': return 'Rejected';
      case 'WITHDRAWN': return 'Withdrawn';
      default: return status;
    }
  }

  statusClass(status: string): string {
    if (status === 'APPROVED') return 'used';
    if (status === 'REJECTED' || status === 'WITHDRAWN') return 'rejected';
    return 'unused';
  }

  loadEmployees() {
    // Load ALL active employees (no pagination cap) so the autocomplete can
    // find anyone — not just the first page. getEmployees(1, 50) was capping
    // the list at 50 and the client-side filter only saw those.
    this.employeeService.getActiveEmployees().subscribe({
      next: (rows: any) => {
        const list = Array.isArray(rows) ? rows : (rows?.data ?? rows ?? []);
        this.allEmployees = list.map((e: any) => ({
          ...e,
          displayName: `${e.employeeCode} - ${e.firstName} ${e.lastName}`
        }));
      },
      error: () => { this.allEmployees = []; },
    });
  }

  searchEmployees(event: any) {
    const query = (event.query || '').toLowerCase();
    this.filteredEmployees = this.allEmployees.filter(e =>
      e.displayName.toLowerCase().includes(query) ||
      e.employeeCode?.toLowerCase().includes(query) ||
      e.firstName?.toLowerCase().includes(query) ||
      e.lastName?.toLowerCase().includes(query)
    );
  }

  loadData() {
    this.loading = true;
    const params: any = {};
    if (this.statusFilter) params.status = this.statusFilter;
    this.compOffService.getCredits(params).subscribe({
      next: (data) => { this.credits = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  fmtDate(d: any): string {
    if (!d) return '';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  // The leave day(s) this credit was consumed for. Legacy rows have no linked
  // leave — those fall back to usedOn, which on old data is the approval date.
  usedForLabel(item: any): string {
    const leave = item?.leave;
    if (leave) {
      const start = this.fmtDate(leave.startDate);
      const end = this.fmtDate(leave.endDate);
      const range = start === end ? start : `${start} - ${end}`;
      return leave.isHalfDay ? `${range} (Half Day)` : range;
    }
    return this.fmtDate(item?.usedOn) || '-';
  }

  openDialog() {
    this.selectedEmployee = null;
    this.formWorkDate = null;
    this.formExpiryDate = null;
    this.formReason = '';
    this.dialogVisible = true;
  }

  save() {
    if (!this.selectedEmployee?.id || !this.formWorkDate) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Employee and work date required' });
      return;
    }
    this.compOffService.create({
      employeeId: this.selectedEmployee.id,
      workDate: this.formWorkDate.toISOString(),
      expiryDate: this.formExpiryDate?.toISOString() || undefined,
      grantedBy: this.loggedEmpId,
      grantReason: this.formReason || undefined,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Comp off granted' });
        this.dialogVisible = false;
        this.loadData();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  confirmDelete(item: any) {
    this.confirmationService.confirm({
      message: 'Delete this comp off credit?',
      accept: () => {
        this.compOffService.delete(item.id).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted' }); this.loadData(); },
          error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
        });
      }
    });
  }
}
