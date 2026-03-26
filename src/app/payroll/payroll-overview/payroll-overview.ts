import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { PayrollService, SalaryStructure, PayrollRun, Payslip } from '../../services/payroll/payroll.service';
import { Employees } from '../../services/employees/employees';

@Component({
  selector: 'app-payroll-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TabsModule, TableModule, ButtonModule, InputTextModule, InputNumberModule,
    SelectModule, TagModule, ToastModule, DialogModule, CheckboxModule,
    DividerModule, SkeletonModule, AutoCompleteModule, TooltipModule,
    ModuleGuide,
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

  deleteRun(run: PayrollRun): void {
    if (!confirm(`Delete DRAFT payroll run for ${this.monthLabel(run.month)} ${run.year}?`)) return;
    this.svc.deletePayrollRun(run.id).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Run deleted' }); this.loadRuns(); },
      error: (e) => this.msg.add({ severity: 'error', summary: e?.error?.message || 'Delete failed' }),
    });
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
}
