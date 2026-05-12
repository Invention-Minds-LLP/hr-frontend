import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { HrCorrectionsService } from '../../services/hr-corrections/hr-corrections';
import { Employees } from '../../services/employees/employees';
import { ModuleGuide } from '../../shared/module-guide/module-guide';

@Component({
  selector: 'app-hr-corrections',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    ToastModule,
    InputTextModule,
    TagModule,
    AutoCompleteModule,
    DatePickerModule,
    DividerModule,
    SelectModule,
    TabsModule,
    InputNumberModule,
    CheckboxModule,
    ModuleGuide
  ],
  providers: [MessageService],
  templateUrl: './hr-corrections.html',
  styleUrl: './hr-corrections.css',
})
export class HrCorrections implements OnInit {
  activeTab = 0;
  today = new Date();

  // ── Shared ──────────────────────────────────────────────────────────────
  employeeSuggestions: any[] = [];

  // ── Punch Correction ────────────────────────────────────────────────────
  punchEmployee: any = null;
  punchDate: Date | null = null;
  punchCorrectedIn: Date | null = null;
  punchCorrectedOut: Date | null = null;
  punchReason = '';
  punchSubmitting = false;

  punchRecords: any[] = [];
  punchTotal = 0;
  punchPage = 1;
  punchLimit = 20;
  punchLoading = false;

  // ── Leave Balance Adjustment ─────────────────────────────────────────────
  balEmployee: any = null;
  balLeaveTypeId: number | null = null;
  balYear: number = new Date().getFullYear();
  balAdjustType: 'CREDIT' | 'DEBIT' = 'CREDIT';
  balDays: number | null = null;
  balReason = '';
  balSubmitting = false;

  leaveTypes: { id: number; name: string }[] = [];
  adjustTypeOptions = [
    { label: 'Credit (Add days)', value: 'CREDIT' },
    { label: 'Debit (Deduct days)', value: 'DEBIT' },
  ];

  balRecords: any[] = [];
  balTotal = 0;
  balPage = 1;
  balLimit = 20;
  balLoading = false;

  // ── Attendance Override ──────────────────────────────────────────────────
  ovEmployee: any = null;
  ovDate: Date | null = null;
  ovNewStatus = '';
  ovReason = '';
  ovSubmitting = false;

  statusOptions = [
    { label: 'Present', value: 'PRESENT' },
    { label: 'Absent', value: 'ABSENT' },
    { label: 'WFH (Work From Home)', value: 'WFH' },
    { label: 'Field Duty / Client Visit', value: 'FIELD_DUTY' },
    { label: 'On Duty (Official)', value: 'ON_DUTY' },
    { label: 'Half Day', value: 'HALF_DAY' },
  ];

  ovRecords: any[] = [];
  ovTotal = 0;
  ovPage = 1;
  ovLimit = 20;
  ovLoading = false;

  // ── Permission Override ──────────────────────────────────────────────────
  permEmployee: any = null;
  permDay: Date | null = null;
  permType = '';
  permTiming = '';
  permStartTime: Date | null = null;
  permEndTime: Date | null = null;
  permReason = '';
  permDeductBalance = false;
  permSubmitting = false;

  permTypeOptions = [
    { label: 'Personal', value: 'PERSONAL' },
    { label: 'Official', value: 'OFFICIAL' },
  ];
  permTimingOptions = [
    { label: 'Hourly', value: 'HOURLY' },
  ];

  permRecords: any[] = [];
  permTotal = 0;
  permPage = 1;
  permLimit = 20;
  permLoading = false;

  // ── Comp-Off Manual Grant ────────────────────────────────────────────────
  coEmployee: any = null;
  coWorkDate: Date | null = null;
  coExpiryDate: Date | null = null;
  coReason = '';
  coSubmitting = false;

  coRecords: any[] = [];
  coTotal = 0;
  coPage = 1;
  coLimit = 20;
  coLoading = false;

  // ── OT Manual Entry ──────────────────────────────────────────────────────
  otEmployee: any = null;
  otDate: Date | null = null;
  otHours: number | null = null;
  otScheduledEnd: Date | null = null;
  otReason = '';
  otSubmitting = false;

  otRecords: any[] = [];
  otTotal = 0;
  otPage = 1;
  otLimit = 20;
  otLoading = false;

  constructor(
    private svc: HrCorrectionsService,
    private empSvc: Employees,
    private messageService: MessageService
  ) {}

  // ── Week-off / Holiday Override ──────────────────────────────────────────
  woEmployee: any = null;
  woDate: Date | null = null;
  woOverrideType: 'GRANT_WEEK_OFF' | 'GRANT_HOLIDAY' | 'MARK_WORKING' | '' = '';
  woAutoCompOff = false;
  woReason = '';
  woSubmitting = false;

  woOverrideTypeOptions = [
    { label: 'Grant Week-Off (mark as week-off)', value: 'GRANT_WEEK_OFF' },
    { label: 'Grant Holiday (mark as holiday)', value: 'GRANT_HOLIDAY' },
    { label: 'Mark as Working (employee worked on week-off/holiday)', value: 'MARK_WORKING' },
  ];

  woRecords: any[] = [];
  woTotal = 0;
  woPage = 1;
  woLimit = 20;
  woLoading = false;

  // ── Appraisal Override ───────────────────────────────────────────────────
  apEmployee: any = null;
  apForms: any[] = [];
  apSelectedFormId: number | null = null;
  apOverallScore: number | null = null;
  apFinalDecision = '';
  apStatus = '';
  apFinalComments = '';
  apReason = '';
  apSubmitting = false;
  apFormsLoading = false;

  apDecisionOptions = [
    { label: 'Promoted', value: 'PROMOTED' },
    { label: 'Retained', value: 'RETAINED' },
    { label: 'On Probation', value: 'PROBATION' },
    { label: 'Increment Approved', value: 'INCREMENT' },
    { label: 'No Change', value: 'NO_CHANGE' },
  ];

  apStatusOptions = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
  ];

  apRecords: any[] = [];
  apTotal = 0;
  apPage = 1;
  apLimit = 20;
  apLoading = false;

  ngOnInit() {
    this.loadLeaveTypes();
    this.loadPunchList();
    this.loadBalList();
    this.loadOvList();
    this.loadPermList();
    this.loadCoList();
    this.loadOtList();
    this.loadWoList();
    this.loadApList();
    this.loadApplyLeaveList();
  }

  // ── Employee autocomplete (shared) ──────────────────────────────────────
  searchEmployees(event: any) {
    this.empSvc.getEmployees(1, 100, event.query).subscribe({
      next: (res: any) => {
        const list = res.employees ?? res.data ?? res ?? [];
        this.employeeSuggestions = list.map((e: any) => ({
          ...e,
          label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
        }));
      },
      error: () => (this.employeeSuggestions = []),
    });
  }

  // ── Leave Types ──────────────────────────────────────────────────────────
  loadLeaveTypes() {
    this.svc.getLeaveTypes().subscribe({
      next: (types) => (this.leaveTypes = types),
      error: () => {},
    });
  }

  get leaveTypeOptions() {
    return this.leaveTypes.map((t) => ({ label: t.name, value: t.id }));
  }

  // ── PUNCH CORRECTION ─────────────────────────────────────────────────────
  submitPunch() {
    if (!this.punchEmployee?.id || !this.punchDate || !this.punchReason.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Employee, date, and reason are required.' });
      return;
    }
    if (!this.punchCorrectedIn && !this.punchCorrectedOut) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'At least one of check-in or check-out time is required.' });
      return;
    }

    this.punchSubmitting = true;
    this.svc.correctPunch({
      employeeId: this.punchEmployee.id,
      date: this.formatDateISO(this.punchDate),
      correctedIn: this.punchCorrectedIn ? this.punchCorrectedIn.toISOString() : undefined,
      correctedOut: this.punchCorrectedOut ? this.punchCorrectedOut.toISOString() : undefined,
      reason: this.punchReason.trim(),
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Done', detail: 'Punch times corrected successfully.' });
        this.resetPunch();
        this.loadPunchList();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.error ?? 'Failed to correct punch.' });
        this.punchSubmitting = false;
      },
    });
  }

  resetPunch() {
    this.punchEmployee = null;
    this.punchDate = null;
    this.punchCorrectedIn = null;
    this.punchCorrectedOut = null;
    this.punchReason = '';
    this.punchSubmitting = false;
  }

  loadPunchList() {
    this.punchLoading = true;
    this.svc.getPunchList(this.punchPage, this.punchLimit).subscribe({
      next: (res) => { this.punchRecords = res.records ?? []; this.punchTotal = res.total ?? 0; this.punchLoading = false; },
      error: () => (this.punchLoading = false),
    });
  }

  onPunchPageChange(event: any) {
    this.punchPage = Math.floor(event.first / event.rows) + 1;
    this.punchLimit = event.rows;
    this.loadPunchList();
  }

  // ── LEAVE BALANCE ADJUSTMENT ─────────────────────────────────────────────
  submitBalance() {
    if (!this.balEmployee?.id || !this.balLeaveTypeId || !this.balYear || !this.balAdjustType || !this.balDays || !this.balReason.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'All fields are required.' });
      return;
    }

    this.balSubmitting = true;
    this.svc.adjustLeaveBalance({
      employeeId: this.balEmployee.id,
      leaveTypeId: this.balLeaveTypeId,
      year: this.balYear,
      adjustType: this.balAdjustType,
      days: this.balDays,
      reason: this.balReason.trim(),
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Done', detail: 'Leave balance adjusted successfully.' });
        this.resetBalance();
        this.loadBalList();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.error ?? 'Failed to adjust balance.' });
        this.balSubmitting = false;
      },
    });
  }

  resetBalance() {
    this.balEmployee = null;
    this.balLeaveTypeId = null;
    this.balYear = new Date().getFullYear();
    this.balAdjustType = 'CREDIT';
    this.balDays = null;
    this.balReason = '';
    this.balSubmitting = false;
  }

  loadBalList() {
    this.balLoading = true;
    this.svc.getBalanceAdjustmentList(this.balPage, this.balLimit).subscribe({
      next: (res) => { this.balRecords = res.records ?? []; this.balTotal = res.total ?? 0; this.balLoading = false; },
      error: () => (this.balLoading = false),
    });
  }

  onBalPageChange(event: any) {
    this.balPage = Math.floor(event.first / event.rows) + 1;
    this.balLimit = event.rows;
    this.loadBalList();
  }

  // ── ATTENDANCE OVERRIDE ──────────────────────────────────────────────────
  submitOverride() {
    if (!this.ovEmployee?.id || !this.ovDate || !this.ovNewStatus || !this.ovReason.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Employee, date, new status, and reason are required.' });
      return;
    }

    this.ovSubmitting = true;
    this.svc.overrideAttendance({
      employeeId: this.ovEmployee.id,
      date: this.formatDateISO(this.ovDate),
      newStatus: this.ovNewStatus,
      reason: this.ovReason.trim(),
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Done', detail: 'Attendance status overridden successfully.' });
        this.resetOverride();
        this.loadOvList();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.error ?? 'Failed to override attendance.' });
        this.ovSubmitting = false;
      },
    });
  }

  resetOverride() {
    this.ovEmployee = null;
    this.ovDate = null;
    this.ovNewStatus = '';
    this.ovReason = '';
    this.ovSubmitting = false;
  }

  loadOvList() {
    this.ovLoading = true;
    this.svc.getAttendanceOverrideList(this.ovPage, this.ovLimit).subscribe({
      next: (res) => { this.ovRecords = res.records ?? []; this.ovTotal = res.total ?? 0; this.ovLoading = false; },
      error: () => (this.ovLoading = false),
    });
  }

  onOvPageChange(event: any) {
    this.ovPage = Math.floor(event.first / event.rows) + 1;
    this.ovLimit = event.rows;
    this.loadOvList();
  }

  // ── PERMISSION OVERRIDE ──────────────────────────────────────────────────
  submitPermission() {
    if (!this.permEmployee?.id || !this.permDay || !this.permType || !this.permTiming || !this.permReason.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Employee, date, permission type, timing, and reason are required.' });
      return;
    }
    if ((this.permTiming === 'HOURLY' || this.permTiming === 'HALFDAY') && (!this.permStartTime || !this.permEndTime)) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Start time and end time are required for hourly/half-day permission.' });
      return;
    }

    this.permSubmitting = true;
    this.svc.grantPermission({
      employeeId: this.permEmployee.id,
      day: this.formatDateISO(this.permDay),
      permissionType: this.permType,
      timing: this.permTiming,
      startTime: this.permStartTime?.toISOString(),
      endTime: this.permEndTime?.toISOString(),
      reason: this.permReason.trim(),
      deductBalance: this.permDeductBalance,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Done', detail: 'Permission granted successfully.' });
        this.resetPermission();
        this.loadPermList();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.error ?? 'Failed to grant permission.' });
        this.permSubmitting = false;
      },
    });
  }

  resetPermission() {
    this.permEmployee = null;
    this.permDay = null;
    this.permType = '';
    this.permTiming = '';
    this.permStartTime = null;
    this.permEndTime = null;
    this.permReason = '';
    this.permDeductBalance = false;
    this.permSubmitting = false;
  }

  loadPermList() {
    this.permLoading = true;
    this.svc.getPermissionOverrideList(this.permPage, this.permLimit).subscribe({
      next: (res) => { this.permRecords = res.records ?? []; this.permTotal = res.total ?? 0; this.permLoading = false; },
      error: () => (this.permLoading = false),
    });
  }

  onPermPageChange(event: any) {
    this.permPage = Math.floor(event.first / event.rows) + 1;
    this.permLimit = event.rows;
    this.loadPermList();
  }

  // ── COMP-OFF MANUAL GRANT ────────────────────────────────────────────────
  submitCompOff() {
    if (!this.coEmployee?.id || !this.coWorkDate || !this.coReason.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Employee, work date, and reason are required.' });
      return;
    }

    this.coSubmitting = true;
    this.svc.grantCompOff({
      employeeId: this.coEmployee.id,
      workDate: this.formatDateISO(this.coWorkDate),
      expiryDate: this.coExpiryDate ? this.formatDateISO(this.coExpiryDate) : undefined,
      reason: this.coReason.trim(),
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Done', detail: 'Comp-Off credit granted successfully.' });
        this.resetCompOff();
        this.loadCoList();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.error ?? 'Failed to grant comp-off.' });
        this.coSubmitting = false;
      },
    });
  }

  resetCompOff() {
    this.coEmployee = null;
    this.coWorkDate = null;
    this.coExpiryDate = null;
    this.coReason = '';
    this.coSubmitting = false;
  }

  loadCoList() {
    this.coLoading = true;
    this.svc.getCompOffGrantList(this.coPage, this.coLimit).subscribe({
      next: (res) => { this.coRecords = res.records ?? []; this.coTotal = res.total ?? 0; this.coLoading = false; },
      error: () => (this.coLoading = false),
    });
  }

  onCoPageChange(event: any) {
    this.coPage = Math.floor(event.first / event.rows) + 1;
    this.coLimit = event.rows;
    this.loadCoList();
  }

  coExpiryLabel(row: any): string {
    if (!row.expiryDate) return '—';
    const exp = new Date(row.expiryDate);
    const now = new Date();
    return exp < now ? '⚠ Expired' : this.formatDate(row.expiryDate);
  }

  // ── OT MANUAL ENTRY ──────────────────────────────────────────────────────
  submitOT() {
    if (!this.otEmployee?.id || !this.otDate || !this.otHours || !this.otReason.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Employee, date, hours, and reason are required.' });
      return;
    }

    this.otSubmitting = true;
    this.svc.manualOTEntry({
      employeeId: this.otEmployee.id,
      date: this.formatDateISO(this.otDate),
      hours: this.otHours,
      scheduledEndTime: this.otScheduledEnd?.toISOString(),
      reason: this.otReason.trim(),
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Done', detail: 'Overtime entry created and approved.' });
        this.resetOT();
        this.loadOtList();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.error ?? 'Failed to create OT entry.' });
        this.otSubmitting = false;
      },
    });
  }

  resetOT() {
    this.otEmployee = null;
    this.otDate = null;
    this.otHours = null;
    this.otScheduledEnd = null;
    this.otReason = '';
    this.otSubmitting = false;
  }

  loadOtList() {
    this.otLoading = true;
    this.svc.getOTManualEntryList(this.otPage, this.otLimit).subscribe({
      next: (res) => { this.otRecords = res.records ?? []; this.otTotal = res.total ?? 0; this.otLoading = false; },
      error: () => (this.otLoading = false),
    });
  }

  onOtPageChange(event: any) {
    this.otPage = Math.floor(event.first / event.rows) + 1;
    this.otLimit = event.rows;
    this.loadOtList();
  }

  minutesToHours(m: number): string {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return min > 0 ? `${h}h ${min}m` : `${h}h`;
  }

  // ── WEEK-OFF / HOLIDAY OVERRIDE ──────────────────────────────────────────
  submitWeekOff() {
    if (!this.woEmployee?.id || !this.woDate || !this.woOverrideType || !this.woReason.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Employee, date, override type, and reason are required.' });
      return;
    }
    this.woSubmitting = true;
    this.svc.weekOffHolidayOverride({
      employeeId: this.woEmployee.id,
      date: this.formatDateISO(this.woDate),
      overrideType: this.woOverrideType as any,
      reason: this.woReason.trim(),
      autoCompOff: this.woAutoCompOff,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Done', detail: 'Override applied successfully.' });
        this.resetWeekOff();
        this.loadWoList();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.error ?? 'Failed to apply override.' });
        this.woSubmitting = false;
      },
    });
  }

  resetWeekOff() {
    this.woEmployee = null;
    this.woDate = null;
    this.woOverrideType = '';
    this.woAutoCompOff = false;
    this.woReason = '';
    this.woSubmitting = false;
  }

  loadWoList() {
    this.woLoading = true;
    this.svc.getWeekOffHolidayOverrideList(this.woPage, this.woLimit).subscribe({
      next: (res) => { this.woRecords = res.records ?? []; this.woTotal = res.total ?? 0; this.woLoading = false; },
      error: () => (this.woLoading = false),
    });
  }

  onWoPageChange(event: any) {
    this.woPage = Math.floor(event.first / event.rows) + 1;
    this.woLimit = event.rows;
    this.loadWoList();
  }

  woTypeLabel(t: string): string {
    const map: Record<string, string> = {
      GRANT_WEEK_OFF: 'Week-Off Granted',
      GRANT_HOLIDAY: 'Holiday Granted',
      MARK_WORKING: 'Marked Working',
    };
    return map[t] ?? t;
  }

  woTypeSeverity(t: string): any {
    const map: Record<string, string> = {
      GRANT_WEEK_OFF: 'secondary',
      GRANT_HOLIDAY: 'info',
      MARK_WORKING: 'warn',
    };
    return map[t] ?? 'secondary';
  }

  // ── APPRAISAL OVERRIDE ────────────────────────────────────────────────────
  onApEmployeeSelect(emp: any) {
    if (!emp?.id) return;
    this.apForms = [];
    this.apSelectedFormId = null;
    this.apFormsLoading = true;
    this.svc.searchAppraisals(emp.id).subscribe({
      next: (forms) => { this.apForms = forms; this.apFormsLoading = false; },
      error: () => (this.apFormsLoading = false),
    });
  }

  get apFormOptions() {
    return this.apForms.map(f => ({
      label: `${f.cycle} — ${f.status}${f.overallScore != null ? ' | Score: ' + f.overallScore : ''}`,
      value: f.id,
    }));
  }

  onApFormSelect(id: number) {
    const form = this.apForms.find(f => f.id === id);
    if (!form) return;
    this.apOverallScore = form.overallScore ?? null;
    this.apFinalDecision = form.finalDecision ?? '';
    this.apStatus = form.status ?? '';
    this.apFinalComments = form.finalComments ?? '';
  }

  submitAppraisal() {
    if (!this.apSelectedFormId || !this.apReason.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Select an appraisal form and provide a reason.' });
      return;
    }
    const hasChange = this.apOverallScore !== null || this.apFinalDecision || this.apStatus || this.apFinalComments;
    if (!hasChange) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Change at least one field before submitting.' });
      return;
    }
    this.apSubmitting = true;
    this.svc.appraisalOverride({
      appraisalFormId: this.apSelectedFormId,
      overallScore: this.apOverallScore ?? undefined,
      finalDecision: this.apFinalDecision || undefined,
      status: this.apStatus || undefined,
      finalComments: this.apFinalComments || undefined,
      reason: this.apReason.trim(),
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Done', detail: 'Appraisal overridden successfully.' });
        this.resetAppraisal();
        this.loadApList();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.error ?? 'Failed to override appraisal.' });
        this.apSubmitting = false;
      },
    });
  }

  resetAppraisal() {
    this.apEmployee = null;
    this.apForms = [];
    this.apSelectedFormId = null;
    this.apOverallScore = null;
    this.apFinalDecision = '';
    this.apStatus = '';
    this.apFinalComments = '';
    this.apReason = '';
    this.apSubmitting = false;
  }

  loadApList() {
    this.apLoading = true;
    this.svc.getAppraisalOverrideList(this.apPage, this.apLimit).subscribe({
      next: (res) => { this.apRecords = res.records ?? []; this.apTotal = res.total ?? 0; this.apLoading = false; },
      error: () => (this.apLoading = false),
    });
  }

  onApPageChange(event: any) {
    this.apPage = Math.floor(event.first / event.rows) + 1;
    this.apLimit = event.rows;
    this.loadApList();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  formatDateISO(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDate(d: string | Date | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
  }

  formatTime(d: string | Date | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  }

  empName(row: any): string {
    const e = row.employee;
    return e ? `${e.firstName} ${e.lastName}` : '—';
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      PRESENT: 'Present', ABSENT: 'Absent', WFH: 'WFH',
      FIELD_DUTY: 'Field Duty', ON_DUTY: 'On Duty', HALF_DAY: 'Half Day',
      WEEK_OFF: 'Week-Off', HOLIDAY: 'Holiday',
    };
    return map[s] ?? s;
  }

  statusSeverity(s: string): any {
    const map: Record<string, string> = {
      PRESENT: 'success', ABSENT: 'danger', WFH: 'info',
      FIELD_DUTY: 'warn', ON_DUTY: 'warn', HALF_DAY: 'secondary',
      WEEK_OFF: 'secondary', HOLIDAY: 'info',
    };
    return map[s] ?? 'secondary';
  }

  adjustSeverity(t: string): any {
    return t === 'CREDIT' ? 'success' : 'danger';
  }
  isExpired(row: any): boolean {
  return row.used || new Date(row.expiryDate) < this.today;
}

  // ════════════════════════════════════════════════════════════════
  //  APPLY LEAVE ON BEHALF OF AN EMPLOYEE (HR override)
  // ════════════════════════════════════════════════════════════════
  alEmployee: any = null;
  alLeaveTypeId: number | null = null;
  alFromDate: Date | null = null;
  alToDate: Date | null = null;
  alIsHalfDay = false;
  alHalfDaySession: 'FIRST_HALF' | 'SECOND_HALF' = 'FIRST_HALF';
  alReason = '';
  alForce = false;                 // allow negative balance
  alSubmitting = false;

  alHalfSessionOptions = [
    { label: 'First Half', value: 'FIRST_HALF' },
    { label: 'Second Half', value: 'SECOND_HALF' },
  ];

  alRecords: any[] = [];
  alTotal = 0;
  alPage = 1;
  alLimit = 25;
  alLoading = false;

  submitApplyLeave() {
    if (!this.alEmployee?.id || !this.alLeaveTypeId || !this.alFromDate || !this.alToDate || !this.alReason.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Employee, leave type, dates and reason are required.' });
      return;
    }
    if (this.alToDate < this.alFromDate) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'To date cannot be before From date.' });
      return;
    }
    if (this.alIsHalfDay && this.formatDateISO(this.alFromDate) !== this.formatDateISO(this.alToDate)) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'A half-day must be a single date.' });
      return;
    }

    this.alSubmitting = true;
    this.svc.applyLeaveOnBehalf({
      employeeId: this.alEmployee.id,
      leaveTypeId: this.alLeaveTypeId,
      startDate: this.formatDateISO(this.alFromDate),
      endDate: this.formatDateISO(this.alToDate),
      reason: this.alReason.trim(),
      isHalfDay: this.alIsHalfDay,
      halfDaySession: this.alIsHalfDay ? this.alHalfDaySession : undefined,
      force: this.alForce,
    }).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Leave applied',
          detail: `${res?.requestedUnits ?? ''} day(s) leave approved and deducted for ${this.alEmployee.firstName} ${this.alEmployee.lastName}.`,
          life: 5000,
        });
        this.resetApplyLeave();
        this.loadApplyLeaveList();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Could not apply leave',
          detail: err?.error?.error ?? 'Failed to apply leave on behalf.',
          life: 6000,
        });
        this.alSubmitting = false;
      },
    });
  }

  resetApplyLeave() {
    this.alEmployee = null;
    this.alLeaveTypeId = null;
    this.alFromDate = null;
    this.alToDate = null;
    this.alIsHalfDay = false;
    this.alHalfDaySession = 'FIRST_HALF';
    this.alReason = '';
    this.alForce = false;
    this.alSubmitting = false;
  }

  loadApplyLeaveList() {
    this.alLoading = true;
    this.svc.getHrAppliedLeaveList(this.alPage, this.alLimit).subscribe({
      next: (res) => { this.alRecords = res.rows ?? res.records ?? []; this.alTotal = res.total ?? 0; this.alLoading = false; },
      error: () => (this.alLoading = false),
    });
  }

  onApplyLeavePageChange(event: any) {
    this.alPage = Math.floor(event.first / event.rows) + 1;
    this.alLimit = event.rows;
    this.loadApplyLeaveList();
  }
}
