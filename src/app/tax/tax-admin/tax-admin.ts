import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import { MessageService, ConfirmationService } from 'primeng/api';
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
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { TaxService, TaxDeclaration, DeclarationItem, Form16Record } from '../../services/tax/tax.service';
import { CompanyService, StatutorySummary, StatutoryFiling, Company } from '../../services/company/company.service';

type StatutoryType = 'PF_ECR' | 'ESI' | 'PT' | 'LWF';

@Component({
  selector: 'app-tax-admin',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TabsModule, TableModule, ButtonModule, InputTextModule, InputNumberModule,
    SelectModule, TagModule, ToastModule, DialogModule, CheckboxModule,
    DividerModule, SkeletonModule, TooltipModule, ConfirmDialogModule,
    ModuleGuide,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tax-admin.html',
  styleUrl: './tax-admin.css',
})
export class TaxAdmin implements OnInit {

  activeTab = 0;

  // Placeholder rows rendered while a table loads — same pattern as payroll.
  readonly skeletonRows: any[] = [1, 2, 3, 4, 5];

  financialYear = '';
  fyOptions: { label: string; value: string }[] = [];

  statusOptions = [
    { label: 'All', value: '' },
    { label: 'Submitted', value: 'SUBMITTED' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Partially approved', value: 'PARTIALLY_APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Draft', value: 'DRAFT' },
  ];
  statusFilter = 'SUBMITTED';

  declarations: TaxDeclaration[] = [];
  declarationsTotal = 0;
  declarationsLoading = false;
  page = 1;

  reviewDialog = false;
  reviewing: TaxDeclaration | null = null;
  reviewItems: (DeclarationItem & { _approved: number })[] = [];
  reviewRemarks = '';
  savingReview = false;

  form16s: Form16Record[] = [];
  form16Loading = false;
  emailingForm16 = false;
  emailResult: { sent: number; requested: number; failed: { employeeId: number; reason: string }[] } | null = null;

  // ── Statutory returns ───────────────────────────────────────────────────────
  months = [
    { label: 'January', value: 1 },  { label: 'February', value: 2 },
    { label: 'March', value: 3 },    { label: 'April', value: 4 },
    { label: 'May', value: 5 },      { label: 'June', value: 6 },
    { label: 'July', value: 7 },     { label: 'August', value: 8 },
    { label: 'September', value: 9 },{ label: 'October', value: 10 },
    { label: 'November', value: 11 },{ label: 'December', value: 12 },
  ];
  years: number[] = [];
  statMonth = new Date().getMonth() + 1;
  statYear = new Date().getFullYear();

  companies: Company[] = [];
  companyOptions: { label: string; value: number | null }[] = [];
  selectedCompanyId: number | null = null;

  summary: StatutorySummary | null = null;
  summaryLoading = false;

  filings: StatutoryFiling[] = [];
  filingsLoading = false;

  filedDialog = false;
  filedTarget: StatutoryFiling | null = null;
  filedReference = '';

  constructor(
    private taxService: TaxService,
    private companyService: CompanyService,
    private toast: MessageService,
    private confirm: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.fyOptions = this.taxService.financialYearOptions(4).map((fy) => ({ label: fy, value: fy }));
    this.financialYear = this.taxService.currentFinancialYear();

    const thisYear = new Date().getFullYear();
    this.years = Array.from({ length: 5 }, (_, i) => thisYear - 2 + i);

    this.companyService.list().subscribe({
      next: (res) => {
        this.companies = res.data;
        this.companyOptions = [
          { label: 'All companies', value: null },
          ...res.data.map((c) => ({ label: c.name, value: c.id })),
        ];
      },
      error: () => { /* single-entity clients still work with the default company */ },
    });

    this.loadDeclarations();
    this.loadForm16();
    this.loadSummary();
    this.loadFilings();
  }

  // ── declarations ────────────────────────────────────────────────────────────

  loadDeclarations(): void {
    this.declarationsLoading = true;
    this.taxService.listDeclarations({
      financialYear: this.financialYear,
      status: this.statusFilter || undefined,
      page: this.page,
      limit: 20,
    }).subscribe({
      next: (res) => {
        this.declarations = res.data;
        this.declarationsTotal = res.total;
        this.declarationsLoading = false;
      },
      error: () => { this.declarationsLoading = false; this.err('Could not load declarations'); },
    });
  }

  onPage(event: any): void {
    this.page = Math.floor((event.first || 0) / (event.rows || 20)) + 1;
    this.loadDeclarations();
  }

  openReview(declaration: TaxDeclaration): void {
    this.reviewing = declaration;
    // Pre-fill with the declared amount capped at nothing — HR trims down from
    // what was declared rather than typing every figure from scratch.
    this.reviewItems = (declaration.items || []).map((i) => ({
      ...i,
      _approved: i.approvedAmount > 0 ? i.approvedAmount : i.declaredAmount,
    }));
    this.reviewRemarks = declaration.remarks || '';
    this.reviewDialog = true;
  }

  approveAll(): void {
    this.reviewItems = this.reviewItems.map((i) => ({ ...i, _approved: i.declaredAmount }));
  }

  rejectAll(): void {
    this.reviewItems = this.reviewItems.map((i) => ({ ...i, _approved: 0 }));
  }

  get reviewTotalApproved(): number {
    return this.reviewItems.reduce((s, i) => s + (Number(i._approved) || 0), 0);
  }

  get reviewTotalDeclared(): number {
    return this.reviewItems.reduce((s, i) => s + (Number(i.declaredAmount) || 0), 0);
  }

  submitReview(): void {
    if (!this.reviewing?.id) return;

    const over = this.reviewItems.find((i) => Number(i._approved) > Number(i.declaredAmount));
    if (over) {
      this.err(`Approved amount cannot exceed the declared amount for ${over.section} — ${over.category}`);
      return;
    }

    this.savingReview = true;
    this.taxService.reviewDeclaration(this.reviewing.id, {
      items: this.reviewItems.map((i) => ({
        id: i.id!,
        approvedAmount: Number(i._approved) || 0,
        proofStatus: i.proofStatus,
        remarks: i.remarks || undefined,
      })),
      remarks: this.reviewRemarks || undefined,
    }).subscribe({
      next: () => {
        this.savingReview = false;
        this.reviewDialog = false;
        this.ok('Declaration reviewed — the employee has been notified');
        this.loadDeclarations();
      },
      error: (e) => {
        this.savingReview = false;
        this.err(e?.error?.message || 'Could not save the review');
      },
    });
  }

  // ── Form 16 ─────────────────────────────────────────────────────────────────

  loadForm16(): void {
    this.form16Loading = true;
    this.taxService.listForm16(this.financialYear).subscribe({
      next: (rows) => { this.form16s = rows; this.form16Loading = false; },
      error: () => { this.form16Loading = false; this.form16s = []; },
    });
  }

  downloadFor(employeeId: number, code?: string): void {
    this.taxService.downloadForm16(this.financialYear, employeeId).subscribe({
      next: (blob) => saveAs(blob, `Form16_${code || employeeId}_${this.financialYear}.pdf`),
      error: async (e) => this.err((await this.readBlobError(e)) || 'Could not generate Form 16'),
    });
  }

  emailAll(): void {
    this.confirm.confirm({
      header: 'Email Form 16 to all active employees',
      message:
        `This generates and emails a password-protected Form 16 for ${this.financialYear} to every ` +
        `active employee with published payslips. Employees without payslips or an email address are skipped. Continue?`,
      acceptLabel: 'Send',
      rejectLabel: 'Cancel',
      accept: () => {
        this.emailingForm16 = true;
        this.emailResult = null;
        this.taxService.emailForm16(this.financialYear).subscribe({
          next: (res) => {
            this.emailingForm16 = false;
            this.emailResult = res;
            this.ok(`Sent ${res.sent} of ${res.requested}`);
            this.loadForm16();
          },
          error: (e) => {
            this.emailingForm16 = false;
            this.err(e?.error?.message || 'Could not send Form 16 emails');
          },
        });
      },
    });
  }

  // ── statutory returns ───────────────────────────────────────────────────────

  loadSummary(): void {
    this.summaryLoading = true;
    this.companyService.getStatutorySummary(this.statMonth, this.statYear, this.selectedCompanyId || undefined)
      .subscribe({
        next: (s) => { this.summary = s; this.summaryLoading = false; },
        error: () => { this.summaryLoading = false; this.summary = null; },
      });
  }

  loadFilings(): void {
    this.filingsLoading = true;
    this.companyService.listFilings(this.statYear, this.selectedCompanyId || undefined).subscribe({
      next: (rows) => { this.filings = rows; this.filingsLoading = false; },
      error: () => { this.filingsLoading = false; this.filings = []; },
    });
  }

  onStatPeriodChange(): void {
    this.loadSummary();
    this.loadFilings();
  }

  download(type: StatutoryType): void {
    this.companyService.downloadStatutoryFile(type, this.statMonth, this.statYear, this.selectedCompanyId || undefined)
      .subscribe({
        next: (blob) => {
          const ext = type === 'PF_ECR' ? 'txt' : 'csv';
          saveAs(blob, `${type}_${this.statYear}_${String(this.statMonth).padStart(2, '0')}.${ext}`);
          this.ok(`${this.typeLabel(type)} file downloaded`);
          this.loadFilings();
        },
        error: async (e) => this.err((await this.readBlobError(e)) || `No ${this.typeLabel(type)} data for this month`),
      });
  }

  openMarkFiled(filing: StatutoryFiling): void {
    this.filedTarget = filing;
    this.filedReference = filing.reference || '';
    this.filedDialog = true;
  }

  saveMarkFiled(): void {
    if (!this.filedTarget) return;
    this.companyService.markFiled(this.filedTarget.id, this.filedReference).subscribe({
      next: () => { this.filedDialog = false; this.ok('Marked as filed'); this.loadFilings(); },
      error: (e) => this.err(e?.error?.message || 'Could not update the filing'),
    });
  }

  typeLabel(type: string): string {
    switch (type) {
      case 'PF_ECR': return 'PF ECR';
      case 'ESI':    return 'ESI';
      case 'PT':     return 'Professional Tax';
      case 'LWF':    return 'Labour Welfare Fund';
      default:       return type;
    }
  }

  monthName(m: number): string {
    return this.months.find((x) => x.value === m)?.label || String(m);
  }

  // ── shared helpers ──────────────────────────────────────────────────────────

  private async readBlobError(e: any): Promise<string> {
    try {
      if (e?.error instanceof Blob) return JSON.parse(await e.error.text())?.message || '';
      return e?.error?.message || '';
    } catch {
      return '';
    }
  }

  statusSeverity(status?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    switch (status) {
      case 'APPROVED':           return 'success';
      case 'PARTIALLY_APPROVED': return 'warn';
      case 'REJECTED':           return 'danger';
      case 'SUBMITTED':          return 'info';
      default:                   return 'secondary';
    }
  }

  statusLabel(status?: string): string {
    if (!status) return 'Draft';
    return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  inr(n?: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  }

  empName(e: any): string {
    if (!e) return '—';
    return `${e.firstName || ''} ${e.lastName || ''}`.trim() || '—';
  }

  private ok(detail: string) { this.toast.add({ severity: 'success', summary: 'Done', detail }); }
  private err(detail: string) { this.toast.add({ severity: 'error', summary: 'Error', detail }); }
}
