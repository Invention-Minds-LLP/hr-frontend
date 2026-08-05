import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { CompanyService, Company, StatutoryConfig, PtSlab } from '../../services/company/company.service';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TabsModule, TableModule, ButtonModule, InputTextModule, InputNumberModule,
    SelectModule, TagModule, ToastModule, DialogModule, CheckboxModule,
    DividerModule, SkeletonModule, TooltipModule, DatePickerModule, ConfirmDialogModule,
    ModuleGuide,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './companies.html',
  styleUrl: './companies.css',
})
export class Companies implements OnInit {

  activeTab = 0;

  // Placeholder rows rendered while a table loads — same pattern as payroll.
  readonly skeletonRows: any[] = [1, 2, 3];

  companies: Company[] = [];
  unassigned = 0;
  loading = false;

  companyDialog = false;
  editing: Partial<Company> = {};
  savingCompany = false;

  // ── Statutory ───────────────────────────────────────────────────────────────
  selectedCompanyId: number | null = null;
  companyOptions: { label: string; value: number }[] = [];

  configs: StatutoryConfig[] = [];
  configsLoading = false;

  configDialog = false;
  config: Partial<StatutoryConfig> = {};
  configEffectiveFrom: Date = new Date();
  savingConfig = false;

  ptSlabs: PtSlab[] = [];
  lwfMonths = '';

  lwfFrequencyOptions = [
    { label: 'Monthly', value: 'MONTHLY' },
    { label: 'Half-yearly', value: 'HALF_YEARLY' },
    { label: 'Yearly', value: 'YEARLY' },
  ];

  constructor(
    private companyService: CompanyService,
    private toast: MessageService,
    private confirm: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.companyService.list().subscribe({
      next: (res) => {
        this.companies = res.data;
        this.unassigned = res.unassignedEmployees;
        this.companyOptions = res.data.map((c) => ({ label: c.name, value: c.id }));
        this.loading = false;

        if (!this.selectedCompanyId && res.data.length) {
          const def = res.data.find((c) => c.isDefault) || res.data[0];
          this.selectedCompanyId = def.id;
          this.loadConfigs();
        }
      },
      error: () => { this.loading = false; this.err('Could not load companies'); },
    });
  }

  // ── companies ───────────────────────────────────────────────────────────────

  openNewCompany(): void {
    this.editing = { isActive: true };
    this.companyDialog = true;
  }

  openEditCompany(company: Company): void {
    this.editing = { ...company };
    this.companyDialog = true;
  }

  saveCompany(): void {
    if (!this.editing.name?.trim()) {
      this.err('Company name is required');
      return;
    }

    this.savingCompany = true;
    const payload = { ...this.editing };
    const done = () => {
      this.savingCompany = false;
      this.companyDialog = false;
      this.ok('Company saved');
      this.load();
    };

    const req = this.editing.id
      ? this.companyService.update(this.editing.id, payload)
      : this.companyService.create(payload);

    req.subscribe({
      next: done,
      error: (e) => {
        this.savingCompany = false;
        this.err(e?.error?.message || 'Could not save the company');
      },
    });
  }

  makeDefault(company: Company): void {
    this.confirm.confirm({
      header: 'Change default company',
      message:
        `Employees and payroll runs that have no company assigned will fall back to ` +
        `"${company.name}". Continue?`,
      acceptLabel: 'Set as default',
      rejectLabel: 'Cancel',
      accept: () => {
        this.companyService.setDefault(company.id).subscribe({
          next: () => { this.ok('Default company updated'); this.load(); },
          error: (e) => this.err(e?.error?.message || 'Could not set the default company'),
        });
      },
    });
  }

  runBackfill(): void {
    this.confirm.confirm({
      header: 'Assign unassigned records',
      message:
        `${this.unassigned} employee(s) have no company. This assigns them and any unassigned ` +
        `payroll runs to the default company. Safe to run more than once. Continue?`,
      acceptLabel: 'Run',
      rejectLabel: 'Cancel',
      accept: () => {
        this.companyService.backfill().subscribe({
          next: (r) => {
            this.ok(`Assigned ${r.employeesUpdated} employee(s) and ${r.payrollRunsUpdated} run(s)`);
            this.load();
          },
          error: (e) => this.err(e?.error?.message || 'Backfill failed'),
        });
      },
    });
  }

  // ── statutory config ────────────────────────────────────────────────────────

  loadConfigs(): void {
    if (!this.selectedCompanyId) return;
    this.configsLoading = true;
    this.companyService.listStatutoryConfigs(this.selectedCompanyId).subscribe({
      next: (rows) => { this.configs = rows; this.configsLoading = false; },
      error: () => { this.configsLoading = false; this.err('Could not load statutory configuration'); },
    });
  }

  onCompanyChange(): void {
    this.loadConfigs();
  }

  /** Defaults mirror the engine's LEGACY_DEFAULT_RATES so a new config starts
   *  from what the system already applies rather than from zeros. */
  private blankConfig(): Partial<StatutoryConfig> {
    return {
      pfEnabled: true, pfEmployeeRate: 12, pfEmployerRate: 12, pfWageCeiling: 15000,
      pfCapAtCeiling: false, pfAdminChargeRate: 0.5, edliRate: 0.5, epsRate: 8.33,
      esiEnabled: true, esiEmployeeRate: 0.75, esiEmployerRate: 3.25, esiWageLimit: 21000,
      ptEnabled: true, ptState: null,
      lwfEnabled: false, lwfEmployeeAmount: 0, lwfEmployerAmount: 0, lwfFrequency: 'MONTHLY',
      gratuityEnabled: true, gratuityRate: 4.81, gratuityMinYears: 5,
      bonusEnabled: true, bonusRate: 8.33, bonusEligibilityWage: 21000, bonusCalculationCap: 7000,
      leaveEncashEnabled: false, leaveEncashDaysYear: 0,
    };
  }

  openNewConfig(): void {
    this.config = this.blankConfig();
    this.configEffectiveFrom = new Date();
    this.ptSlabs = [
      { upTo: 15000, amount: 0 },
      { upTo: 20000, amount: 150 },
      { upTo: null, amount: 200 },
    ];
    this.lwfMonths = '';
    this.configDialog = true;
  }

  openEditConfig(row: StatutoryConfig): void {
    this.config = { ...row };
    this.configEffectiveFrom = new Date(row.effectiveFrom);
    this.ptSlabs = Array.isArray(row.ptSlabs) && row.ptSlabs.length
      ? row.ptSlabs.map((s) => ({ ...s }))
      : [{ upTo: 15000, amount: 0 }, { upTo: 20000, amount: 150 }, { upTo: null, amount: 200 }];
    this.lwfMonths = Array.isArray(row.lwfDeductionMonths) ? row.lwfDeductionMonths.join(', ') : '';
    this.configDialog = true;
  }

  addSlab(): void {
    this.ptSlabs = [...this.ptSlabs, { upTo: 0, amount: 0 }];
  }

  removeSlab(index: number): void {
    this.ptSlabs = this.ptSlabs.filter((_, i) => i !== index);
  }

  saveConfig(): void {
    if (!this.selectedCompanyId) return;

    // The open-ended top slab must be last, otherwise the engine short-circuits
    // on it and every higher slab is unreachable.
    const openEnded = this.ptSlabs.findIndex((s) => s.upTo == null);
    if (openEnded !== -1 && openEnded !== this.ptSlabs.length - 1) {
      this.err('The slab with a blank upper limit must be the last row');
      return;
    }

    const months = this.lwfMonths
      .split(',')
      .map((m) => Number(m.trim()))
      .filter((m) => m >= 1 && m <= 12);

    this.savingConfig = true;
    this.companyService.upsertStatutoryConfig(this.selectedCompanyId, {
      ...this.config,
      effectiveFrom: this.configEffectiveFrom.toISOString(),
      ptSlabs: this.ptSlabs,
      lwfDeductionMonths: months.length ? months : null,
    }).subscribe({
      next: () => {
        this.savingConfig = false;
        this.configDialog = false;
        this.ok('Statutory configuration saved');
        this.loadConfigs();
      },
      error: (e) => {
        this.savingConfig = false;
        this.err(e?.error?.message || 'Could not save the configuration');
      },
    });
  }

  deleteConfig(row: StatutoryConfig): void {
    if (!this.selectedCompanyId || !row.id) return;
    this.confirm.confirm({
      header: 'Delete this configuration version',
      message:
        'Payroll for months covered by this version will fall back to the previous one, ' +
        'or to built-in defaults if there is none. Continue?',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.companyService.deleteStatutoryConfig(this.selectedCompanyId!, row.id!).subscribe({
          next: () => { this.ok('Configuration deleted'); this.loadConfigs(); },
          error: (e) => this.err(e?.error?.message || 'Could not delete the configuration'),
        });
      },
    });
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  inr(n?: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  }

  private ok(detail: string) { this.toast.add({ severity: 'success', summary: 'Done', detail }); }
  private err(detail: string) { this.toast.add({ severity: 'error', summary: 'Error', detail }); }
}
