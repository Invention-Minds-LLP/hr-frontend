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
import {
  TaxService, TaxProfile, TaxDeclaration, DeclarationItem,
  DeclarationSection, TaxProjection, Regime, Form16Record,
} from '../../services/tax/tax.service';

@Component({
  selector: 'app-my-tax',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TabsModule, TableModule, ButtonModule, InputTextModule, InputNumberModule,
    SelectModule, TagModule, ToastModule, DialogModule, CheckboxModule,
    DividerModule, SkeletonModule, TooltipModule, ConfirmDialogModule,
    ModuleGuide,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './my-tax.html',
  styleUrl: './my-tax.css',
})
export class MyTax implements OnInit {

  activeTab = 0;

  // Placeholder rows rendered while a table loads — same pattern as payroll.
  readonly skeletonRows: any[] = [1, 2, 3];

  financialYear = '';
  fyOptions: { label: string; value: string }[] = [];

  profile: TaxProfile | null = null;
  profileLoading = false;
  savingProfile = false;

  declaration: TaxDeclaration | null = null;
  declarationLoading = false;
  savingDeclaration = false;
  items: Partial<DeclarationItem>[] = [];

  sections: DeclarationSection[] = [];
  sectionOptions: { label: string; value: string }[] = [];
  categoryOptions: { label: string; value: string }[] = [];

  projection: TaxProjection | null = null;
  projectionLoading = false;

  form16s: Form16Record[] = [];
  form16Loading = false;

  addItemDialog = false;
  newItem: Partial<DeclarationItem> = this.blankItem();

  constructor(
    private taxService: TaxService,
    private toast: MessageService,
    private confirm: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.fyOptions = this.taxService.financialYearOptions(4).map((fy) => ({ label: fy, value: fy }));
    this.financialYear = this.taxService.currentFinancialYear();

    this.taxService.getSections().subscribe({
      next: (res) => {
        this.sections = res.sections;
        this.sectionOptions = res.sections.map((s) => ({ label: s.label, value: s.section }));
      },
      error: () => this.err('Could not load the declaration sections'),
    });

    this.loadAll();
  }

  // ── loading ─────────────────────────────────────────────────────────────────

  loadAll(): void {
    this.loadProfile();
    this.loadDeclaration();
    this.loadProjection();
    this.loadForm16();
  }

  onFinancialYearChange(): void {
    this.loadAll();
  }

  loadProfile(): void {
    this.profileLoading = true;
    this.taxService.getProfile(this.financialYear).subscribe({
      next: (p) => { this.profile = p; this.profileLoading = false; },
      error: () => { this.profileLoading = false; this.err('Could not load your tax profile'); },
    });
  }

  loadDeclaration(): void {
    this.declarationLoading = true;
    this.taxService.getDeclaration(this.financialYear).subscribe({
      next: (d) => {
        this.declaration = d;
        this.items = (d.items || []).map((i) => ({ ...i }));
        this.declarationLoading = false;
      },
      error: () => { this.declarationLoading = false; this.err('Could not load your declaration'); },
    });
  }

  loadProjection(): void {
    this.projectionLoading = true;
    this.taxService.getProjection().subscribe({
      next: (p) => { this.projection = p; this.projectionLoading = false; },
      error: (e) => {
        this.projectionLoading = false;
        this.projection = null;
        // A missing salary structure is expected for some staff, not an error
        // worth a red toast — the template shows an explanatory empty state.
        if (e?.status !== 404) this.err('Could not load your tax projection');
      },
    });
  }

  loadForm16(): void {
    this.form16Loading = true;
    this.taxService.listForm16(this.financialYear).subscribe({
      next: (rows) => { this.form16s = rows; this.form16Loading = false; },
      error: () => { this.form16Loading = false; this.form16s = []; },
    });
  }

  // ── regime ──────────────────────────────────────────────────────────────────

  get canEditRegime(): boolean {
    return !!this.profile && !this.profile.regimeLocked;
  }

  setRegime(regime: Regime): void {
    if (!this.profile || this.profile.regimeLocked) return;
    this.profile.regime = regime;
  }

  saveProfile(): void {
    if (!this.profile) return;
    this.savingProfile = true;

    this.taxService.updateProfile({
      financialYear: this.financialYear,
      regime: this.profile.regime,
      rentPaidAnnual: this.profile.rentPaidAnnual || 0,
      metroCity: this.profile.metroCity,
      landlordPan: this.profile.landlordPan || null,
      previousEmployerIncome: this.profile.previousEmployerIncome || 0,
      previousEmployerTds: this.profile.previousEmployerTds || 0,
      otherIncome: this.profile.otherIncome || 0,
      housePropertyLoss: this.profile.housePropertyLoss || 0,
    }).subscribe({
      next: (p) => {
        this.profile = p;
        this.savingProfile = false;
        this.ok('Tax profile saved');
        this.loadProjection();
      },
      error: (e) => {
        this.savingProfile = false;
        this.err(e?.error?.message || 'Could not save your tax profile');
      },
    });
  }

  applyRecommendedRegime(): void {
    if (!this.projection || !this.profile || this.profile.regimeLocked) return;
    this.profile.regime = this.projection.comparison.recommended;
    this.saveProfile();
  }

  // ── declaration items ───────────────────────────────────────────────────────

  blankItem(): Partial<DeclarationItem> {
    return { section: '', category: '', description: '', declaredAmount: 0 };
  }

  get isEditable(): boolean {
    const status = this.declaration?.status;
    return !status || status === 'DRAFT' || status === 'REJECTED';
  }

  openAddItem(): void {
    this.newItem = this.blankItem();
    this.categoryOptions = [];
    this.addItemDialog = true;
  }

  onSectionChange(section: string): void {
    const found = this.sections.find((s) => s.section === section);
    this.categoryOptions = (found?.categories || []).map((c) => ({ label: c, value: c }));
    this.newItem.category = '';
  }

  /** Statutory ceiling for a section, or null when uncapped. */
  capFor(section?: string): number | null {
    if (!section) return null;
    return this.sections.find((s) => s.section === section)?.cap ?? null;
  }

  addItem(): void {
    if (!this.newItem.section || !this.newItem.category || !(this.newItem.declaredAmount! > 0)) {
      this.err('Pick a section and category, and enter an amount above zero');
      return;
    }
    this.items = [...this.items, { ...this.newItem }];
    this.addItemDialog = false;
  }

  removeItem(index: number): void {
    this.items = this.items.filter((_, i) => i !== index);
  }

  get totalDeclared(): number {
    return this.items.reduce((s, i) => s + (Number(i.declaredAmount) || 0), 0);
  }

  /** Declared total per section, used to warn when a ceiling is exceeded. */
  declaredForSection(section: string): number {
    return this.items
      .filter((i) => i.section === section)
      .reduce((s, i) => s + (Number(i.declaredAmount) || 0), 0);
  }

  exceedsCap(section?: string): boolean {
    if (!section) return false;
    const cap = this.capFor(section);
    return cap != null && this.declaredForSection(section) > cap;
  }

  saveDeclaration(): void {
    this.savingDeclaration = true;
    this.taxService.saveDeclaration(this.financialYear, this.items).subscribe({
      next: (d) => {
        this.declaration = d;
        this.items = (d.items || []).map((i) => ({ ...i }));
        this.savingDeclaration = false;
        this.ok('Declaration saved as draft');
        this.loadProjection();
      },
      error: (e) => {
        this.savingDeclaration = false;
        this.err(e?.error?.message || 'Could not save the declaration');
      },
    });
  }

  submitDeclaration(): void {
    if (!this.items.length) {
      this.err('Add at least one investment before submitting');
      return;
    }

    this.confirm.confirm({
      header: 'Submit for HR review',
      message:
        'Once submitted you cannot edit this declaration until HR reviews it. ' +
        'Only amounts HR approves will reduce your tax. Continue?',
      acceptLabel: 'Submit',
      rejectLabel: 'Cancel',
      accept: () => {
        // Save first: submit acts on what is stored, not on unsaved edits.
        this.taxService.saveDeclaration(this.financialYear, this.items).subscribe({
          next: () => {
            this.taxService.submitDeclaration(this.financialYear).subscribe({
              next: () => { this.ok('Declaration submitted for review'); this.loadDeclaration(); },
              error: (e) => this.err(e?.error?.message || 'Could not submit the declaration'),
            });
          },
          error: (e) => this.err(e?.error?.message || 'Could not save before submitting'),
        });
      },
    });
  }

  // ── Form 16 ─────────────────────────────────────────────────────────────────

  downloadForm16(): void {
    this.taxService.downloadForm16(this.financialYear).subscribe({
      next: (blob) => {
        saveAs(blob, `Form16_${this.financialYear}.pdf`);
        this.ok('Form 16 downloaded — open it with your PAN + date of birth');
        this.loadForm16();
      },
      error: async (e) => {
        const message = await this.readBlobError(e);
        this.err(message || 'Form 16 is not available yet for this year');
      },
    });
  }

  /** Error bodies come back as Blobs on responseType:'blob' requests. */
  private async readBlobError(e: any): Promise<string> {
    try {
      if (e?.error instanceof Blob) {
        const text = await e.error.text();
        return JSON.parse(text)?.message || '';
      }
      return e?.error?.message || '';
    } catch {
      return '';
    }
  }

  // ── display helpers ─────────────────────────────────────────────────────────

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

  private ok(detail: string) {
    this.toast.add({ severity: 'success', summary: 'Done', detail });
  }

  private err(detail: string) {
    this.toast.add({ severity: 'error', summary: 'Error', detail });
  }
}
