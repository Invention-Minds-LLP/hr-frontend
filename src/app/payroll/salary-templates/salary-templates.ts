import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import {
  PayrollService, SalaryTemplate, TemplateComponent, TemplateValidation,
  TemplatePreview, TemplateInputMode, EligibleEmployee, AssignResult,
} from '../../services/payroll/payroll.service';
import { Departments } from '../../services/departments/departments';
import { Designations } from '../../services/designations/designations';
import { Branches } from '../../services/branches/branches';
import { Roles } from '../../services/roles/roles';

interface AssignRow extends EligibleEmployee {
  selected: boolean;
  amount: number | null;
}

@Component({
  selector: 'app-salary-templates',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule, InputNumberModule, SelectModule,
    TagModule, ToastModule, DialogModule, CheckboxModule, RadioButtonModule,
    DividerModule, SkeletonModule, TooltipModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './salary-templates.html',
  styleUrl: './salary-templates.css',
})
export class SalaryTemplates implements OnInit {

  readonly skeletonRows: any[] = [1, 2, 3];

  templates: SalaryTemplate[] = [];
  loading = false;
  showInactive = false;

  // Reference data
  percentageKeys: { key: string; label: string }[] = [];
  fixedKeys: { key: string; label: string }[] = [];
  defaultComponents: TemplateComponent[] = [];
  inputModes: { value: TemplateInputMode; label: string; hint: string }[] = [];

  departments: any[] = [];
  designations: any[] = [];
  branches: any[] = [];
  roles: any[] = [];
  employmentTypes = [
    { label: 'Any', value: null },
    { label: 'Full time', value: 'FULL_TIME' },
    { label: 'Part time', value: 'PART_TIME' },
    { label: 'Contract', value: 'CONTRACT' },
    { label: 'Intern', value: 'INTERN' },
  ];

  // ── Builder ─────────────────────────────────────────────────────────────────
  builderDialog = false;
  editing: Partial<SalaryTemplate> = {};
  components: TemplateComponent[] = [];
  validation: TemplateValidation | null = null;
  saving = false;

  // Live preview inside the builder
  previewMode: TemplateInputMode = 'GROSS';
  previewAmount = 45000;
  preview: TemplatePreview | null = null;
  previewing = false;

  // ── Assign ──────────────────────────────────────────────────────────────────
  assignDialog = false;
  assignTemplate: SalaryTemplate | null = null;
  assignMode: TemplateInputMode = 'GROSS';
  assignRows: AssignRow[] = [];
  assignLoading = false;
  bulkAmount: number | null = null;
  overwriteExisting = true;

  filters: any = {
    departmentId: null, designationId: null, roleId: null,
    branchId: null, employmentType: null, search: '',
    onlyWithoutStructure: false,
  };

  dryRun: AssignResult | null = null;
  assigning = false;

  constructor(
    private svc: PayrollService,
    private deptSvc: Departments,
    private desigSvc: Designations,
    private branchSvc: Branches,
    private roleSvc: Roles,
    private msg: MessageService,
    private confirm: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.svc.getTemplateMeta().subscribe({
      next: (m) => {
        this.percentageKeys = m.percentageKeys;
        this.fixedKeys = m.fixedKeys;
        this.defaultComponents = m.defaultComponents;
        this.inputModes = m.inputModes;
      },
      error: () => this.err('Could not load template reference data'),
    });

    this.deptSvc.getDepartments().subscribe({ next: (d: any) => this.departments = d, error: () => {} });
    this.desigSvc.getDesignations().subscribe({ next: (d: any) => this.designations = d, error: () => {} });
    this.branchSvc.getBranches().subscribe({ next: (b: any) => this.branches = b, error: () => {} });
    this.roleSvc.getRoles().subscribe({ next: (r: any) => this.roles = r, error: () => {} });

    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.listSalaryTemplates({ includeInactive: this.showInactive }).subscribe({
      next: (rows) => { this.templates = rows; this.loading = false; },
      error: () => { this.loading = false; this.err('Could not load templates'); },
    });
  }

  // ── Builder ─────────────────────────────────────────────────────────────────

  openNew(): void {
    this.editing = {
      name: '', code: '', description: '',
      pfApplicable: true, esiApplicable: true, ptApplicable: true,
      isActive: true,
      departmentId: null, designationId: null, roleId: null, branchId: null,
      employmentType: null,
    };
    this.components = this.defaultComponents.map((c) => ({ ...c }));
    this.preview = null;
    this.revalidate();
    this.builderDialog = true;
  }

  openEdit(t: SalaryTemplate): void {
    this.editing = { ...t };
    this.components = (t.components || []).map((c) => ({ ...c }));
    this.preview = null;
    this.revalidate();
    this.builderDialog = true;
  }

  /** Percentage components only — these must total 100. */
  get pctComponents(): TemplateComponent[] {
    return this.components.filter((c) => !c.isFixed);
  }

  get fixedComponents(): TemplateComponent[] {
    return this.components.filter((c) => c.isFixed);
  }

  get totalPercentage(): number {
    return Math.round(this.pctComponents.reduce((s, c) => s + (Number(c.percentage) || 0), 0) * 100) / 100;
  }

  get totalFixed(): number {
    return Math.round(this.fixedComponents.reduce((s, c) => s + (Number(c.fixedAmount) || 0), 0) * 100) / 100;
  }

  get remainingPercentage(): number {
    return Math.round((100 - this.totalPercentage) * 100) / 100;
  }

  get isBalanced(): boolean {
    return Math.abs(this.totalPercentage - 100) < 0.001;
  }

  /** Which percentage keys are still unused, so the Add menu only offers those. */
  get availablePctKeys(): { key: string; label: string }[] {
    const used = new Set(this.components.map((c) => c.key));
    return this.percentageKeys.filter((k) => !used.has(k.key));
  }

  get availableFixedKeys(): { key: string; label: string }[] {
    const used = new Set(this.components.map((c) => c.key));
    return this.fixedKeys.filter((k) => !used.has(k.key));
  }

  addComponent(key: string, isFixed: boolean): void {
    const meta = (isFixed ? this.fixedKeys : this.percentageKeys).find((k) => k.key === key);
    if (!meta) return;
    this.components = [
      ...this.components,
      {
        key: meta.key,
        label: meta.label,
        percentage: 0,
        isFixed,
        fixedAmount: 0,
        isBalancing: false,
        orderNo: this.components.length + 1,
      },
    ];
    this.revalidate();
  }

  removeComponent(key: string): void {
    this.components = this.components.filter((c) => c.key !== key);
    this.revalidate();
  }

  /**
   * Which component balances, as a single bound value.
   *
   * Exposed as a getter/setter pair rather than binding the radio straight to
   * `c.isBalancing`: a radio group needs one shared model, and binding each row
   * to its own boolean lets two rows be selected at once — which the engine
   * rejects. Assigning here clears every other row in the same step.
   */
  get balancingKey(): string | null {
    return this.components.find((c) => !c.isFixed && c.isBalancing)?.key ?? null;
  }

  set balancingKey(key: string | null) {
    this.components = this.components.map((c) => ({
      ...c,
      isBalancing: !c.isFixed && c.key === key,
    }));
    this.revalidate();
  }

  /** Push the shortfall into the balancing component so the total hits 100. */
  autoBalance(): void {
    const balancing = this.pctComponents.find((c) => c.isBalancing);
    if (!balancing) {
      this.err('Pick a balancing component first');
      return;
    }
    const others = this.pctComponents
      .filter((c) => c.key !== balancing.key)
      .reduce((s, c) => s + (Number(c.percentage) || 0), 0);
    const target = Math.round((100 - others) * 100) / 100;
    if (target < 0) {
      this.err(`The other components already total ${others}% — reduce them before balancing.`);
      return;
    }
    this.components = this.components.map((c) =>
      c.key === balancing.key ? { ...c, percentage: target } : c);
    this.revalidate();
    this.ok(`${balancing.label} set to ${target}% — the template now totals 100%.`);
  }

  revalidate(): void {
    // Local check drives the UI instantly; the server re-validates on save, so
    // the two can never disagree about what gets stored.
    this.svc.validateSalaryTemplate(this.components).subscribe({
      next: (v) => { this.validation = v; if (v.valid) this.runPreview(); },
      error: () => { this.validation = null; },
    });
  }

  runPreview(): void {
    if (!this.isBalanced || !this.previewAmount) { this.preview = null; return; }
    this.previewing = true;
    this.svc.previewSalaryTemplate({
      components: this.components,
      inputMode: this.previewMode,
      inputAmount: this.previewAmount,
      pfApplicable: this.editing.pfApplicable !== false,
      esiApplicable: this.editing.esiApplicable !== false,
      ptApplicable: this.editing.ptApplicable !== false,
    }).subscribe({
      next: (p) => { this.preview = p; this.previewing = false; },
      error: () => { this.previewing = false; this.preview = null; },
    });
  }

  save(): void {
    if (!this.editing.name?.trim()) { this.err('Template name is required'); return; }
    if (!this.isBalanced) {
      this.err(`Components total ${this.totalPercentage}%, not 100%. Fix that before saving.`);
      return;
    }

    this.saving = true;
    this.svc.saveSalaryTemplate({ ...this.editing, components: this.components }).subscribe({
      next: () => {
        this.saving = false;
        this.builderDialog = false;
        this.ok('Template saved');
        this.load();
      },
      error: (e) => {
        this.saving = false;
        const errors = e?.error?.errors;
        this.err(errors?.length ? errors.join(' ') : (e?.error?.message || 'Could not save the template'));
      },
    });
  }

  remove(t: SalaryTemplate): void {
    this.confirm.confirm({
      header: 'Delete template',
      message:
        `Delete "${t.name}"? If employee structures were created from it, it is deactivated ` +
        `instead so the audit trail survives.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.svc.deleteSalaryTemplate(t.id!).subscribe({
          next: (r) => { this.ok(r.message); this.load(); },
          error: (e) => this.err(e?.error?.message || 'Could not delete the template'),
        });
      },
    });
  }

  // ── Assign ──────────────────────────────────────────────────────────────────

  openAssign(t: SalaryTemplate): void {
    this.assignTemplate = t;
    this.assignMode = 'GROSS';
    this.assignRows = [];
    this.dryRun = null;
    this.bulkAmount = null;
    this.overwriteExisting = true;
    // Pre-fill the filter from the template's own scope — if it is a Nursing
    // template, HR almost certainly wants Nursing employees.
    this.filters = {
      departmentId: t.departmentId ?? null,
      designationId: t.designationId ?? null,
      roleId: t.roleId ?? null,
      branchId: t.branchId ?? null,
      employmentType: t.employmentType ?? null,
      search: '',
      onlyWithoutStructure: false,
    };
    this.assignDialog = true;
    this.loadEligible();
  }

  loadEligible(): void {
    this.assignLoading = true;
    this.dryRun = null;
    this.svc.listEligibleEmployees(this.filters).subscribe({
      next: (r) => {
        this.assignRows = r.data.map((e) => ({
          ...e,
          selected: false,
          // Seed with the current gross so an unchanged employee keeps their pay.
          amount: e.currentGross ?? null,
        }));
        this.assignLoading = false;
      },
      error: () => { this.assignLoading = false; this.assignRows = []; this.err('Could not load employees'); },
    });
  }

  clearFilters(): void {
    this.filters = {
      departmentId: null, designationId: null, roleId: null,
      branchId: null, employmentType: null, search: '', onlyWithoutStructure: false,
    };
    this.loadEligible();
  }

  get selectedRows(): AssignRow[] {
    return this.assignRows.filter((r) => r.selected);
  }

  get selectedValid(): AssignRow[] {
    return this.selectedRows.filter((r) => (r.amount ?? 0) > 0);
  }

  get allSelected(): boolean {
    return this.assignRows.length > 0 && this.assignRows.every((r) => r.selected);
  }

  toggleAll(checked: boolean): void {
    this.assignRows = this.assignRows.map((r) => ({ ...r, selected: checked }));
  }

  applyBulkAmount(): void {
    if (!this.bulkAmount || this.bulkAmount <= 0) {
      this.err('Enter an amount above zero');
      return;
    }
    const targets = this.selectedRows.length ? this.selectedRows : this.assignRows;
    const ids = new Set(targets.map((t) => t.id));
    this.assignRows = this.assignRows.map((r) =>
      ids.has(r.id) ? { ...r, amount: this.bulkAmount, selected: true } : r);
    this.ok(`Applied to ${ids.size} employee(s)`);
  }

  /** Dry run first — nothing is written until HR sees the resulting structures. */
  runDryRun(): void {
    if (!this.assignTemplate?.id) return;
    if (!this.selectedValid.length) {
      this.err('Select at least one employee and give them an amount above zero');
      return;
    }

    this.assigning = true;
    this.svc.assignSalaryTemplate({
      templateId: this.assignTemplate.id,
      inputMode: this.assignMode,
      dryRun: true,
      overwrite: this.overwriteExisting,
      assignments: this.selectedValid.map((r) => ({ employeeId: r.id, amount: r.amount! })),
    }).subscribe({
      next: (r) => { this.dryRun = r; this.assigning = false; },
      error: (e) => {
        this.assigning = false;
        this.err(e?.error?.message || 'Could not preview the assignment');
      },
    });
  }

  commit(): void {
    if (!this.assignTemplate?.id || !this.dryRun) return;

    const inexact = this.dryRun.inexactNetCount;
    const message = inexact
      ? `Apply to ${this.dryRun.applied} employee(s)?\n\n${inexact} could not hit the exact net ` +
        `because of statutory slab steps — the closest achievable figure will be used and the ` +
        `variance recorded.`
      : `Apply "${this.assignTemplate.name}" to ${this.dryRun.applied} employee(s)? ` +
        `Existing structures will be overwritten and a salary revision recorded.`;

    this.confirm.confirm({
      header: 'Confirm assignment',
      message,
      acceptLabel: 'Apply',
      rejectLabel: 'Cancel',
      accept: () => {
        this.assigning = true;
        this.svc.assignSalaryTemplate({
          templateId: this.assignTemplate!.id!,
          inputMode: this.assignMode,
          dryRun: false,
          overwrite: this.overwriteExisting,
          assignments: this.selectedValid.map((r) => ({ employeeId: r.id, amount: r.amount! })),
        }).subscribe({
          next: (r) => {
            this.assigning = false;
            this.assignDialog = false;
            this.ok(`Applied to ${r.applied} employee(s)` +
              (r.skippedCount ? `, ${r.skippedCount} skipped` : ''));
            this.load();
          },
          error: (e) => {
            this.assigning = false;
            this.err(e?.error?.message || 'Assignment failed');
          },
        });
      },
    });
  }

  employeeName(employeeId: number): string {
    return this.assignRows.find((r) => r.id === employeeId)?.name ?? `#${employeeId}`;
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  scopeLabel(t: SalaryTemplate): string {
    const parts: string[] = [];
    if (t.department?.name) parts.push(t.department.name);
    if (t.designation?.name) parts.push(t.designation.name);
    if (t.employmentType) parts.push(this.pretty(t.employmentType));
    return parts.length ? parts.join(' · ') : 'Any employee';
  }

  componentSummary(t: SalaryTemplate): string {
    return (t.components || [])
      .filter((c) => !c.isFixed)
      .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
      .map((c) => `${c.label} ${c.percentage}%`)
      .join(' · ');
  }

  pretty(v?: string | null): string {
    if (!v) return '—';
    return v.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  }

  inr(n?: number | null): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  }

  /** Component values out of the preview response, in display order. */
  previewRows(): { label: string; value: number; pct: number }[] {
    if (!this.preview) return [];
    return this.components
      .slice()
      .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
      .map((c) => ({
        label: c.label,
        value: (this.preview!.components as any)[c.key] ?? 0,
        pct: c.isFixed ? 0 : c.percentage,
      }))
      .filter((r) => r.value > 0 || r.pct > 0);
  }

  private ok(detail: string) { this.msg.add({ severity: 'success', summary: 'Done', detail }); }
  private err(detail: string) { this.msg.add({ severity: 'error', summary: 'Error', detail, life: 6000 }); }
}
