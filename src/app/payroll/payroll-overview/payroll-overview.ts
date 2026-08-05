import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TooltipModule } from 'primeng/tooltip';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { PayrollCalendar } from '../payroll-calendar/payroll-calendar';
import { SalaryTemplates } from '../salary-templates/salary-templates';
import {
  PayrollService, SalaryStructure, PayrollRun, Payslip,
  ImportReport, ImportRowChange, SalaryArrear, ArrearPreview,
  RunExceptions, RunAdjustments, DispatchPreview, PayrollDispatchRow,
} from '../../services/payroll/payroll.service';
import { Employees } from '../../services/employees/employees';

@Component({
  selector: 'app-payroll-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TabsModule, TableModule, ButtonModule, InputTextModule, InputNumberModule,
    SelectModule, TagModule, ToastModule, DialogModule, CheckboxModule,
    DividerModule, SkeletonModule, AutoCompleteModule, TooltipModule,
    ModuleGuide, PayrollCalendar, SalaryTemplates,
  ],
  providers: [MessageService],
  templateUrl: './payroll-overview.html',
  styleUrl: './payroll-overview.css',
})
export class PayrollOverview implements OnInit {

  activeTab = 0;
  role = localStorage.getItem('role') || '';
  employeeId = Number(localStorage.getItem('empId') || '0');
selectedStructureEmployee: any = null;
  // ── Months / years ────────────────────────────────────────────────────────
  months = [
    { label: 'January', value: 1 }, { label: 'February', value: 2 },
    { label: 'March', value: 3 },   { label: 'April', value: 4 },
    { label: 'May', value: 5 },     { label: 'June', value: 6 },
    { label: 'July', value: 7 },    { label: 'August', value: 8 },
    { label: 'September', value: 9 },{ label: 'October', value: 10 },
    { label: 'November', value: 11 },{ label: 'December', value: 12 },
  ];
  years: number[] = [];

  // ── Tab 1: Salary Structures ──────────────────────────────────────────────
  structures: SalaryStructure[] = [];
  structuresTotal = 0;
  structurePage = 1;
  structureSearch = '';
  structureLoading = false;

  showStructureDialog = false;
  editingStructure: Partial<SalaryStructure> = this.blankStructure();
  savingStructure = false;
  structureEmployeeSuggestions: any[] = [];

  // ── Tab 2: Payroll Runs ───────────────────────────────────────────────────
  runs: PayrollRun[] = [];
  runsLoading = false;
  showRunDialog = false;
  newRunMonth = new Date().getMonth() + 1;
  newRunYear = new Date().getFullYear();
  newRunNotes = '';
  creatingRun = false;
  selectedRun: PayrollRun | null = null;
  runPayslips: Payslip[] = [];
  runPayslipsLoading = false;

  // ── Tab 3: Payslips ───────────────────────────────────────────────────────
  payslips: Payslip[] = [];
  payslipsTotal = 0;
  payslipPage = 1;
  payslipFilterMonth: number | null = null;
  payslipFilterYear: number | null = null;
  payslipFilterEmployee: any = null;
  payslipEmployeeSuggestions: any[] = [];
  payslipsLoading = false;
  selectedPayslip: Payslip | null = null;
  showPayslipDialog = false;
  remarksEdit = '';
  savingRemarks = false;

  // ── Tab 4: My Payslips (individual view) ──────────────────────────────────
  myPayslips: Payslip[] = [];
  myPayslipsLoading = false;
  selectedMyPayslip: Payslip | null = null;
  showMyPayslipDialog = false;

  readonly skeletonRows: any[] = [1, 2, 3, 4, 5];

  constructor(
    private svc: PayrollService,
    private employeeSvc: Employees,
    private msg: MessageService,
  ) {}

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) this.years.push(y);

    this.loadStructures();
    this.loadRuns();
    this.loadMyPayslips();
    if (this.isHR()) this.loadPayslips();
  }

  isHR(): boolean {
    return this.role === 'HR' || this.role === 'HR Manager';
  }

  // ── Salary Structures ─────────────────────────────────────────────────────
  loadStructures(): void {
    this.structureLoading = true;
    this.svc.listSalaryStructures({ search: this.structureSearch, page: this.structurePage, limit: 20 })
      .subscribe({
        next: (r) => { this.structures = r.data; this.structuresTotal = r.total; this.structureLoading = false; },
        error: () => this.structureLoading = false,
      });
  }

  onStructureSearch(): void {
    this.structurePage = 1;
    this.loadStructures();
  }

  onStructurePage(e: any): void {
    this.structurePage = Math.floor(e.first / e.rows) + 1;
    this.loadStructures();
  }

  openAddStructure(): void {
    this.editingStructure = this.blankStructure();
      this.selectedStructureEmployee = null;
    this.showStructureDialog = true;
  }

  openEditStructure(s: SalaryStructure): void {
    this.editingStructure = { ...s };
      this.selectedStructureEmployee = null;
    this.showStructureDialog = true;
  }

  searchEmployeesForStructure(event: any): void {
    this.employeeSvc.getEmployees(1, 20, event.query).subscribe({
      next: (res: any) => {
        const list = res.employees ?? res.data ?? res ?? [];
        this.structureEmployeeSuggestions = list.map((e: any) => ({
          ...e, label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
        }));
      },
      error: () => this.structureEmployeeSuggestions = [],
    });
  }

onStructureEmployeeSelect(event: any): void {
  const emp = event.value ?? event;
  this.selectedStructureEmployee = emp;
  this.editingStructure.employeeId = emp.id;

  this.svc.getEmployeeSalaryStructure(emp.id).subscribe({
    next: (s) => {
      this.editingStructure = { ...s, employeeId: emp.id };
      this.selectedStructureEmployee = s.employee || emp;
    },
    error: () => {
      // keep fresh blank structure for this employee
      this.editingStructure = {
        ...this.blankStructure(),
        employeeId: emp.id
      };
    },
  });
}

  saveStructure(): void {
    if (!this.editingStructure.employeeId) {
      this.msg.add({ severity: 'warn', summary: 'Select an employee' });
      return;
    }
    this.savingStructure = true;
    this.svc.upsertSalaryStructure(this.editingStructure).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Salary structure saved' });
        this.showStructureDialog = false;
        this.savingStructure = false;
        this.loadStructures();
      },
      error: (e) => {
        this.msg.add({ severity: 'error', summary: e?.error?.message || 'Save failed' });
        this.savingStructure = false;
      },
    });
  }

  grossOf(s: SalaryStructure): number {
    return (s.basic || 0) + (s.hra || 0) + (s.medicalAllowance || 0) +
           (s.travelAllowance || 0) + (s.specialAllowance || 0) + (s.otherAllowances || 0);
  }

  private blankStructure(): Partial<SalaryStructure> {
    return {
      employeeId: undefined as any,
      basic: 0, hra: 0, medicalAllowance: 0, travelAllowance: 0,
      specialAllowance: 0, otherAllowances: 0,
      pfApplicable: true, esiApplicable: true, ptApplicable: true, tdsMonthly: 0,
    };
  }

  // ── Payroll Runs ──────────────────────────────────────────────────────────
  loadRuns(): void {
    this.runsLoading = true;
    this.svc.listPayrollRuns().subscribe({
      next: (r) => { this.runs = r; this.runsLoading = false; },
      error: () => this.runsLoading = false,
    });
  }

  openRunDialog(): void {
    this.newRunMonth = new Date().getMonth() + 1;
    this.newRunYear  = new Date().getFullYear();
    this.newRunNotes = '';
    this.showRunDialog = true;
  }

  createRun(): void {
    this.creatingRun = true;
    this.svc.createPayrollRun({ month: this.newRunMonth, year: this.newRunYear, notes: this.newRunNotes })
      .subscribe({
        next: () => {
          this.msg.add({ severity: 'success', summary: `Payroll run for ${this.monthLabel(this.newRunMonth)} ${this.newRunYear} created` });
          this.showRunDialog = false;
          this.creatingRun = false;
          this.loadRuns();
        },
        error: (e) => {
          this.msg.add({ severity: 'error', summary: e?.error?.message || 'Failed to create run' });
          this.creatingRun = false;
        },
      });
  }

  openRun(run: PayrollRun): void {
    this.selectedRun = run;
    this.loadSheetTemplates();
    this.runPayslipsLoading = true;
    this.svc.getPayrollRun(run.id).subscribe({
      next: (r) => { this.selectedRun = r; this.runPayslips = r.payslips || []; this.runPayslipsLoading = false; },
      error: () => this.runPayslipsLoading = false,
    });
  }

  backToRuns(): void {
    this.selectedRun = null;
    this.runPayslips = [];
  }

  publishRun(run: PayrollRun): void {
    this.svc.publishPayrollRun(run.id).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Payroll published — payslips now visible to employees' });
        this.loadRuns();
        if (this.selectedRun?.id === run.id) this.selectedRun!.status = 'PUBLISHED';
      },
      error: (e) => this.msg.add({ severity: 'error', summary: e?.error?.message || 'Publish failed' }),
    });
  }

  exportingSheet = false;
  sheetTemplates: { id: string; label: string; modes: ('template' | 'snapshot')[] }[] = [];
  selectedTemplateId = '';

  loadSheetTemplates(): void {
    if (this.sheetTemplates.length) return;
    this.svc.listSheetTemplates().subscribe({
      next: (list) => {
        this.sheetTemplates = list;
        if (!this.selectedTemplateId && list.length) this.selectedTemplateId = list[0].id;
      },
      error: () => {},
    });
  }

  exportWorkingSheet(run: PayrollRun): void {
    if (this.exportingSheet) return;
    const templateId = this.selectedTemplateId || (this.sheetTemplates[0]?.id ?? 'medfin-working-sheet');
    // Finalized/published runs export as a value snapshot; drafts as an editable
    // template. The backend coerces this to what the chosen format supports.
    const mode: 'template' | 'snapshot' = run.status === 'PUBLISHED' ? 'snapshot' : 'template';
    this.exportingSheet = true;
    this.svc.downloadWorkingSheet(run.id, templateId, mode).subscribe({
      next: (blob) => {
        saveAs(blob, `Payroll_${templateId}_${this.monthLabel(run.month)}-${run.year}${mode === 'snapshot' ? '_FINAL' : ''}.xlsx`);
        this.exportingSheet = false;
      },
      error: (e) => {
        this.msg.add({ severity: 'error', summary: e?.error?.message || 'Export failed' });
        this.exportingSheet = false;
      },
    });
  }

  deleteRun(run: PayrollRun): void {
    if (!confirm(`Delete DRAFT payroll run for ${this.monthLabel(run.month)} ${run.year}?`)) return;
    this.svc.deletePayrollRun(run.id).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Run deleted' }); this.loadRuns(); },
      error: (e) => this.msg.add({ severity: 'error', summary: e?.error?.message || 'Delete failed' }),
    });
  }

  // ── Month-end freeze ──────────────────────────────────────────────────────
  // Publishing makes payslips visible; locking asserts the figures are final
  // and blocks delete / re-import / arrears on that run.

  lockRun(run: PayrollRun): void {
    if (!confirm(
      `Lock payroll for ${this.monthLabel(run.month)} ${run.year}?\n\n` +
      `After locking, this run cannot be deleted, re-imported, or have arrears added. ` +
      `You can unlock it again if something needs correcting.`
    )) return;

    this.svc.lockPayrollRun(run.id).subscribe({
      next: (r) => {
        this.msg.add({ severity: 'success', summary: 'Payroll month locked' });
        this.loadRuns();
        if (this.selectedRun?.id === run.id) this.selectedRun = { ...this.selectedRun!, ...r };
      },
      error: (e) => this.msg.add({ severity: 'error', summary: e?.error?.message || 'Lock failed' }),
    });
  }

  unlockRun(run: PayrollRun): void {
    if (!confirm(`Unlock ${this.monthLabel(run.month)} ${run.year}? The month will become editable again.`)) return;
    this.svc.unlockPayrollRun(run.id).subscribe({
      next: (r) => {
        this.msg.add({ severity: 'success', summary: 'Payroll month unlocked' });
        this.loadRuns();
        if (this.selectedRun?.id === run.id) this.selectedRun = { ...this.selectedRun!, ...r };
      },
      error: (e) => this.msg.add({ severity: 'error', summary: e?.error?.message || 'Unlock failed' }),
    });
  }

  // ── Payslip PDF + distribution ────────────────────────────────────────────

  downloadingPayslipId: number | null = null;

  downloadPayslipPdf(payslip: Payslip): void {
    this.downloadingPayslipId = payslip.id;
    this.svc.downloadPayslipPdf(payslip.id).subscribe({
      next: (blob) => {
        const code = payslip.employee?.employeeCode || payslip.employeeId;
        saveAs(blob, `Payslip_${code}_${this.monthLabel(payslip.month)}-${payslip.year}.pdf`);
        this.downloadingPayslipId = null;
      },
      error: async (e) => {
        this.downloadingPayslipId = null;
        this.msg.add({ severity: 'error', summary: (await this.readBlobError(e)) || 'Could not generate the payslip' });
      },
    });
  }

  emailingPayslips = false;
  protectPayslips = false;

  emailPayslips(run: PayrollRun): void {
    if (!confirm(
      `Email payslips for ${this.monthLabel(run.month)} ${run.year} to all ${run._count?.payslips ?? ''} employees in this run?`
    )) return;

    this.emailingPayslips = true;
    this.svc.emailPayslips(run.id, { protect: this.protectPayslips }).subscribe({
      next: (r) => {
        this.emailingPayslips = false;
        this.msg.add({
          severity: r.failed.length ? 'warn' : 'success',
          summary: `Sent ${r.sent} of ${r.requested}`,
          detail: r.failed.length ? `${r.failed.length} skipped — see the run for details` : undefined,
        });
      },
      error: (e) => {
        this.emailingPayslips = false;
        this.msg.add({ severity: 'error', summary: e?.error?.message || 'Could not send payslips' });
      },
    });
  }

  // ── Working-sheet import ──────────────────────────────────────────────────

  importDialog = false;
  importFile: File | null = null;
  importReport: ImportReport | null = null;
  importing = false;

  openImport(): void {
    this.importFile = null;
    this.importReport = null;
    this.importDialog = true;
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importFile = input.files?.[0] ?? null;
    this.importReport = null;
  }

  previewImport(): void {
    if (!this.importFile || !this.selectedRun) return;
    this.importing = true;
    this.svc.previewSheetImport(this.selectedRun.id, this.importFile, this.selectedTemplateId).subscribe({
      next: (report) => { this.importReport = report; this.importing = false; },
      error: (e) => {
        this.importing = false;
        this.msg.add({ severity: 'error', summary: e?.error?.message || 'Could not read the sheet' });
      },
    });
  }

  confirmImport(force = false): void {
    if (!this.importFile || !this.selectedRun) return;
    this.importing = true;
    this.svc.applySheetImport(this.selectedRun.id, this.importFile, this.selectedTemplateId, force).subscribe({
      next: (r) => {
        this.importing = false;
        this.importDialog = false;
        this.msg.add({ severity: 'success', summary: r.message });
        this.openRun(this.selectedRun!);
      },
      error: (e) => {
        this.importing = false;
        // 422 = validation errors; offer the force path rather than dead-ending.
        if (e?.status === 422) {
          this.msg.add({
            severity: 'warn',
            summary: e?.error?.message || 'Some rows have errors',
            life: 8000,
          });
        } else {
          this.msg.add({ severity: 'error', summary: e?.error?.message || 'Import failed' });
        }
      },
    });
  }

  /** Rows in the preview that would actually change something. */
  get changedImportRows(): ImportRowChange[] {
    return (this.importReport?.rows || []).filter((r) => Object.keys(r.changes).length);
  }

  get erroredImportRows(): ImportRowChange[] {
    return (this.importReport?.rows || []).filter((r) => r.errors.length);
  }

  changeKeys(row: ImportRowChange): string[] {
    return Object.keys(row.changes);
  }

  // ── Arrears ───────────────────────────────────────────────────────────────

  arrears: SalaryArrear[] = [];
  arrearsLoading = false;
  arrearPreview: ArrearPreview | null = null;
  arrearBusy = false;
  arrearStatusFilter = 'PENDING';

  loadArrears(): void {
    this.arrearsLoading = true;
    this.svc.listArrears(this.arrearStatusFilter || undefined).subscribe({
      next: (rows) => { this.arrears = rows; this.arrearsLoading = false; },
      error: () => { this.arrearsLoading = false; this.arrears = []; },
    });
  }

  runArrearPreview(): void {
    this.arrearBusy = true;
    this.svc.previewArrears().subscribe({
      next: (p) => {
        this.arrearPreview = p;
        this.arrearBusy = false;
        if (!p.count) {
          this.msg.add({
            severity: 'info',
            summary: 'No arrears due',
            detail: 'Every published payslip already matches the current salary structures.',
          });
        }
      },
      error: (e) => {
        this.arrearBusy = false;
        this.msg.add({ severity: 'error', summary: e?.error?.message || 'Preview failed' });
      },
    });
  }

  generateArrears(): void {
    if (!this.arrearPreview?.count) return;
    if (!confirm(
      `Record ${this.arrearPreview.count} arrear(s) totalling ${this.inr(this.arrearPreview.totalArrear)}?\n\n` +
      `They will sit as PENDING until you apply them to a draft payroll run.`
    )) return;

    this.arrearBusy = true;
    this.svc.generateArrears().subscribe({
      next: (r) => {
        this.arrearBusy = false;
        this.msg.add({ severity: 'success', summary: `${r.created} arrear(s) recorded` });
        this.arrearPreview = null;
        this.loadArrears();
      },
      error: (e) => {
        this.arrearBusy = false;
        this.msg.add({ severity: 'error', summary: e?.error?.message || 'Could not record arrears' });
      },
    });
  }

  applyArrearsToSelectedRun(): void {
    if (!this.selectedRun) {
      this.msg.add({ severity: 'warn', summary: 'Open a draft payroll run first' });
      return;
    }
    this.arrearBusy = true;
    this.svc.applyArrears(this.selectedRun.id).subscribe({
      next: (r) => {
        this.arrearBusy = false;
        this.msg.add({
          severity: 'success',
          summary: `Applied ${r.applied} arrear(s) to this run`,
          detail: r.skipped.length ? `${r.skipped.length} skipped` : undefined,
        });
        this.loadArrears();
        this.openRun(this.selectedRun!);
      },
      error: (e) => {
        this.arrearBusy = false;
        this.msg.add({ severity: 'error', summary: e?.error?.message || 'Could not apply arrears' });
      },
    });
  }

  cancelArrear(a: SalaryArrear): void {
    if (!confirm('Discard this pending arrear?')) return;
    this.svc.cancelArrear(a.id).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Arrear cancelled' }); this.loadArrears(); },
      error: (e) => this.msg.add({ severity: 'error', summary: e?.error?.message || 'Could not cancel' }),
    });
  }

  arrearPeriod(a: { fromMonth: number; fromYear: number; toMonth: number; toYear: number }): string {
    const from = `${this.monthLabel(a.fromMonth)} ${a.fromYear}`;
    const to = `${this.monthLabel(a.toMonth)} ${a.toYear}`;
    return from === to ? from : `${from} – ${to}`;
  }

  inr(n?: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  }

  /** Error bodies arrive as Blobs on responseType:'blob' requests. */
  private async readBlobError(e: any): Promise<string> {
    try {
      if (e?.error instanceof Blob) return JSON.parse(await e.error.text())?.message || '';
      return e?.error?.message || '';
    } catch {
      return '';
    }
  }

  // ── Payslips (HR view) ────────────────────────────────────────────────────
  loadPayslips(): void {
    this.payslipsLoading = true;
    this.svc.listPayslips({
      month: this.payslipFilterMonth ?? undefined,
      year:  this.payslipFilterYear  ?? undefined,
      employeeId: this.payslipFilterEmployee?.id,
      page: this.payslipPage, limit: 20,
    }).subscribe({
      next: (r) => { this.payslips = r.data; this.payslipsTotal = r.total; this.payslipsLoading = false; },
      error: () => this.payslipsLoading = false,
    });
  }

  onPayslipPage(e: any): void {
    this.payslipPage = Math.floor(e.first / e.rows) + 1;
    this.loadPayslips();
  }

  searchEmployeesForPayslip(event: any): void {
    this.employeeSvc.getEmployees(1, 20, event.query).subscribe({
      next: (res: any) => {
        const list = res.employees ?? res.data ?? res ?? [];
        this.payslipEmployeeSuggestions = list.map((e: any) => ({
          ...e, label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
        }));
      },
      error: () => this.payslipEmployeeSuggestions = [],
    });
  }

  sum(arr: any[], field: string): number {
    return arr.reduce((acc, item) => acc + (item[field] || 0), 0);
  }

  onPayslipEmployeeSelect(): void { this.payslipPage = 1; this.loadPayslips(); }
  onPayslipFilterChange(): void   { this.payslipPage = 1; this.loadPayslips(); }
  clearPayslipFilters(): void {
    this.payslipFilterMonth = null; this.payslipFilterYear = null;
    this.payslipFilterEmployee = null; this.payslipPage = 1; this.loadPayslips();
  }

  openPayslip(p: Payslip): void {
    this.svc.getPayslip(p.id).subscribe({
      next: (full) => { this.selectedPayslip = full; this.remarksEdit = full.remarks || ''; this.showPayslipDialog = true; },
      error: () => {},
    });
  }

  saveRemarks(): void {
    if (!this.selectedPayslip) return;
    this.savingRemarks = true;
    this.svc.updateRemarks(this.selectedPayslip.id, this.remarksEdit).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Remarks saved' });
        this.selectedPayslip!.remarks = this.remarksEdit;
        this.savingRemarks = false;
      },
      error: () => this.savingRemarks = false,
    });
  }

  // ── My Payslips (employee view) ───────────────────────────────────────────
  loadMyPayslips(): void {
    this.myPayslipsLoading = true;
    this.svc.getMyPayslips().subscribe({
      next: (r) => { this.myPayslips = r; this.myPayslipsLoading = false; },
      error: () => this.myPayslipsLoading = false,
    });
  }

  openMyPayslip(p: Payslip): void {
    this.svc.getPayslip(p.id).subscribe({
      next: (full) => { this.selectedMyPayslip = full; this.showMyPayslipDialog = true; },
      error: () => {},
    });
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  monthLabel(m: number): string {
    return this.months.find(x => x.value === m)?.label ?? String(m);
  }

  get editingGross(): number {
    return this.grossOf(this.editingStructure as any);
  }

  runStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    return status === 'PUBLISHED' ? 'success' : 'warn';
  }

  formatINR(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  }
  // ── Approval calendar drill-down ──────────────────────────────────────────
  // The approval screen used to show four numbers per employee. This opens the
  // whole month behind any payslip so an approver can actually approve.

  calendarDialog = false;
  calendarEmployeeId: number | null = null;
  calendarEmployeeName = '';

  openCalendar(payslip: Payslip): void {
    this.calendarEmployeeId = payslip.employeeId;
    this.calendarEmployeeName =
      `${payslip.employee?.firstName ?? ''} ${payslip.employee?.lastName ?? ''}`.trim();
    this.calendarDialog = true;
  }

  // ── Run-wide exception triage ─────────────────────────────────────────────

  exceptions: RunExceptions | null = null;
  exceptionsLoading = false;

  loadExceptions(): void {
    if (!this.selectedRun) return;
    this.exceptionsLoading = true;
    this.svc.getRunExceptions(this.selectedRun.id).subscribe({
      next: (r) => { this.exceptions = r; this.exceptionsLoading = false; },
      error: (e) => {
        this.exceptionsLoading = false;
        this.msg.add({ severity: 'error', summary: e?.error?.message || 'Could not load exceptions' });
      },
    });
  }

  openCalendarFor(employeeId: number, name: string): void {
    this.calendarEmployeeId = employeeId;
    this.calendarEmployeeName = name;
    this.calendarDialog = true;
  }

  // ── Loan / incentive lines pulled into the run ────────────────────────────

  adjustments: RunAdjustments | null = null;
  adjustmentsLoading = false;

  loadAdjustments(): void {
    if (!this.selectedRun) return;
    this.adjustmentsLoading = true;
    this.svc.getRunAdjustments(this.selectedRun.id).subscribe({
      next: (r) => { this.adjustments = r; this.adjustmentsLoading = false; },
      error: () => { this.adjustmentsLoading = false; this.adjustments = null; },
    });
  }

  // ── Send the verified workbook to Finance ─────────────────────────────────
  // The last manual step of month-end: previously HR downloaded the sheet and
  // attached it to an email by hand, which is how the wrong month goes out.

  dispatchDialog = false;
  dispatchPreview: DispatchPreview | null = null;
  dispatchLoading = false;
  dispatching = false;

  dispatchTo = '';
  dispatchCc = '';
  dispatchNote = '';
  dispatchSubject = '';
  dispatchTemplates: string[] = ['medfin-working-sheet'];
  dispatchMode: 'template' | 'snapshot' = 'snapshot';
  acknowledgeDraft = false;

  openDispatch(): void {
    if (!this.selectedRun) return;
    this.dispatchDialog = true;
    this.dispatchPreview = null;
    this.dispatchLoading = true;
    this.acknowledgeDraft = false;

    this.svc.getDispatchPreview(this.selectedRun.id).subscribe({
      next: (p) => {
        this.dispatchPreview = p;
        this.dispatchTo = p.defaultRecipients || '';
        this.dispatchSubject =
          `${p.status !== 'PUBLISHED' ? '[DRAFT] ' : ''}Payroll ${p.monthLabel}` +
          `${p.company?.name ? ' — ' + p.company.name : ''}`;
        // A published run goes out as final values; a draft as a working file
        // Finance can still edit.
        this.dispatchMode = p.status === 'PUBLISHED' ? 'snapshot' : 'template';
        this.dispatchLoading = false;
      },
      error: (e) => {
        this.dispatchLoading = false;
        this.msg.add({ severity: 'error', summary: e?.error?.message || 'Could not prepare the dispatch' });
      },
    });
  }

  toggleDispatchTemplate(id: string, checked: boolean): void {
    this.dispatchTemplates = checked
      ? [...new Set([...this.dispatchTemplates, id])]
      : this.dispatchTemplates.filter((t) => t !== id);
  }

  get canDispatch(): boolean {
    if (!this.dispatchPreview || this.dispatching) return false;
    if (this.dispatchPreview.blockers.length) return false;
    if (!this.dispatchTo.trim()) return false;
    if (!this.dispatchTemplates.length) return false;
    if (this.dispatchPreview.status !== 'PUBLISHED' && !this.acknowledgeDraft) return false;
    return true;
  }

  sendDispatch(): void {
    if (!this.selectedRun || !this.canDispatch) return;

    this.dispatching = true;
    this.svc.dispatchPayrollSheet(this.selectedRun.id, {
      to: this.dispatchTo,
      cc: this.dispatchCc || undefined,
      templates: this.dispatchTemplates,
      mode: this.dispatchMode,
      note: this.dispatchNote || undefined,
      subject: this.dispatchSubject || undefined,
      acknowledgeDraft: this.acknowledgeDraft,
    }).subscribe({
      next: (r) => {
        this.dispatching = false;
        this.dispatchDialog = false;
        this.msg.add({
          severity: 'success',
          summary: r.message,
          detail: `Attached: ${r.attachments.join(', ')}`,
          life: 6000,
        });
      },
      error: (e) => {
        this.dispatching = false;
        this.msg.add({
          severity: 'error',
          summary: e?.error?.message || 'Could not send the workbook',
          life: 8000,
        });
      },
    });
  }

}
