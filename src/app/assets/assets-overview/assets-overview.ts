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
import {
  AssetsService, Asset, AssetAllocation, AssetSummary, ExitAssetReport, ReturnCondition,
} from '../../services/assets/assets.service';
import { Employees } from '../../services/employees/employees';

@Component({
  selector: 'app-assets-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TabsModule, TableModule, ButtonModule, InputTextModule, InputNumberModule,
    SelectModule, TagModule, ToastModule, DialogModule, CheckboxModule,
    DividerModule, SkeletonModule, TooltipModule, DatePickerModule,
    ConfirmDialogModule, ModuleGuide,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './assets-overview.html',
  styleUrl: './assets-overview.css',
})
export class AssetsOverview implements OnInit {

  activeTab = 0;
  readonly skeletonRows: any[] = [1, 2, 3, 4, 5];

  // ── Register ────────────────────────────────────────────────────────────────
  assets: Asset[] = [];
  assetsTotal = 0;
  assetsLoading = false;
  page = 1;
  search = '';
  statusFilter = '';
  categoryFilter = '';

  summary: AssetSummary | null = null;

  categoryOptions: { label: string; value: string }[] = [];
  statusOptions: { label: string; value: string }[] = [];
  conditionOptions: { label: string; value: string }[] = [];

  // ── Asset editor ────────────────────────────────────────────────────────────
  assetDialog = false;
  editing: Partial<Asset> = {};
  savingAsset = false;
  purchaseDate: Date | null = null;
  warrantyEnd: Date | null = null;

  // ── Allocate ────────────────────────────────────────────────────────────────
  allocateDialog = false;
  allocateTarget: Asset | null = null;
  allocateEmployee: any = null;
  allocateDueOn: Date | null = null;
  allocatePurpose = '';
  allocating = false;

  // ── Return ──────────────────────────────────────────────────────────────────
  returnDialog = false;
  returnTarget: Asset | null = null;
  returnCondition: ReturnCondition = 'GOOD';
  returnRecovery = 0;
  returnWaived = false;
  returnRemarks = '';
  returning = false;

  employees: any[] = [];

  // ── My assets ───────────────────────────────────────────────────────────────
  myAssets: AssetAllocation[] = [];
  myAssetsLoading = false;

  // ── Exit check ──────────────────────────────────────────────────────────────
  exitEmployee: any = null;
  exitReport: ExitAssetReport | null = null;
  exitLoading = false;

  constructor(
    private svc: AssetsService,
    private employeeSvc: Employees,
    private msg: MessageService,
    private confirm: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.svc.getMeta().subscribe({
      next: (m) => {
        this.categoryOptions = m.categories.map((c) => ({ label: this.pretty(c), value: c }));
        this.statusOptions = m.statuses.map((s) => ({ label: this.pretty(s), value: s }));
        this.conditionOptions = m.returnConditions.map((c) => ({ label: this.pretty(c), value: c }));
      },
      error: () => this.err('Could not load asset reference data'),
    });

    this.employeeSvc.getActiveEmployees().subscribe({
      next: (list: any[]) => {
        this.employees = (Array.isArray(list) ? list : []).map((e: any) => ({
          ...e,
          displayName:
            `${e.firstName || ''} ${e.lastName || ''}`.trim() + ` (${e.employeeCode || e.id})`,
        }));
      },
      error: () => { this.employees = []; },
    });

    this.loadAssets();
    this.loadSummary();
    this.loadMyAssets();
  }

  // ── Register ────────────────────────────────────────────────────────────────

  loadSummary(): void {
    this.svc.getSummary().subscribe({
      next: (s) => this.summary = s,
      error: () => this.summary = null,
    });
  }

  loadAssets(): void {
    this.assetsLoading = true;
    this.svc.list({
      search: this.search || undefined,
      status: this.statusFilter || undefined,
      category: this.categoryFilter || undefined,
      page: this.page,
      limit: 20,
    }).subscribe({
      next: (r) => { this.assets = r.data; this.assetsTotal = r.total; this.assetsLoading = false; },
      error: () => { this.assetsLoading = false; this.err('Could not load the asset register'); },
    });
  }

  onPage(event: any): void {
    this.page = Math.floor((event.first || 0) / (event.rows || 20)) + 1;
    this.loadAssets();
  }

  onSearch(): void {
    this.page = 1;
    this.loadAssets();
  }

  openNewAsset(): void {
    this.editing = { category: 'LAPTOP', purchaseCost: 0, currentValue: 0, status: 'AVAILABLE' };
    this.purchaseDate = null;
    this.warrantyEnd = null;
    this.assetDialog = true;
  }

  openEditAsset(a: Asset): void {
    this.editing = { ...a };
    this.purchaseDate = a.purchaseDate ? new Date(a.purchaseDate) : null;
    this.warrantyEnd = a.warrantyEnd ? new Date(a.warrantyEnd) : null;
    this.assetDialog = true;
  }

  saveAsset(): void {
    if (!this.editing.assetTag?.trim()) { this.err('Asset tag is required'); return; }
    if (!this.editing.name?.trim())     { this.err('Asset name is required'); return; }

    this.savingAsset = true;
    this.svc.save({
      ...this.editing,
      purchaseDate: this.purchaseDate ? this.purchaseDate.toISOString() : null,
      warrantyEnd: this.warrantyEnd ? this.warrantyEnd.toISOString() : null,
    }).subscribe({
      next: () => {
        this.savingAsset = false;
        this.assetDialog = false;
        this.ok('Asset saved');
        this.loadAssets();
        this.loadSummary();
      },
      error: (e) => {
        this.savingAsset = false;
        this.err(e?.error?.message || 'Could not save the asset');
      },
    });
  }

  deleteAsset(a: Asset): void {
    this.confirm.confirm({
      header: 'Delete asset',
      message:
        `Delete ${a.assetTag} — ${a.name}? If it has allocation history it will be retired instead, ` +
        `so the audit trail survives.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.svc.remove(a.id!).subscribe({
          next: (r) => { this.ok(r.message); this.loadAssets(); this.loadSummary(); },
          error: (e) => this.err(e?.error?.message || 'Could not delete the asset'),
        });
      },
    });
  }

  // ── Allocate / return ───────────────────────────────────────────────────────

  openAllocate(a: Asset): void {
    this.allocateTarget = a;
    this.allocateEmployee = null;
    this.allocateDueOn = null;
    this.allocatePurpose = '';
    this.allocateDialog = true;
  }

  allocate(): void {
    if (!this.allocateTarget?.id || !this.allocateEmployee) {
      this.err('Select an employee');
      return;
    }

    this.allocating = true;
    this.svc.allocate(this.allocateTarget.id, {
      employeeId: this.allocateEmployee.id,
      dueOn: this.allocateDueOn ? this.allocateDueOn.toISOString() : undefined,
      purpose: this.allocatePurpose || undefined,
    }).subscribe({
      next: () => {
        this.allocating = false;
        this.allocateDialog = false;
        this.ok('Asset allocated — the employee has been notified');
        this.loadAssets();
        this.loadSummary();
      },
      error: (e) => {
        this.allocating = false;
        this.err(e?.error?.message || 'Could not allocate the asset');
      },
    });
  }

  openReturn(a: Asset): void {
    this.returnTarget = a;
    this.returnCondition = 'GOOD';
    this.returnWaived = false;
    this.returnRemarks = '';
    // Pre-fill the recovery with book value; only relevant if marked LOST.
    this.returnRecovery = 0;
    this.returnDialog = true;
  }

  onReturnConditionChange(): void {
    // Lost assets default to recovering book value; damage is HR's judgement.
    if (this.returnCondition === 'LOST' && this.returnTarget) {
      this.returnRecovery =
        this.returnTarget.currentValue || this.returnTarget.purchaseCost || 0;
    } else if (this.returnCondition === 'GOOD') {
      this.returnRecovery = 0;
    }
  }

  submitReturn(): void {
    if (!this.returnTarget?.allocationId) {
      this.err('This asset has no open allocation to close');
      return;
    }

    this.returning = true;
    this.svc.returnAsset(this.returnTarget.allocationId, {
      returnCondition: this.returnCondition,
      recoveryAmount: this.returnRecovery,
      recoveryWaived: this.returnWaived,
      remarks: this.returnRemarks || undefined,
    }).subscribe({
      next: () => {
        this.returning = false;
        this.returnDialog = false;
        this.ok('Return recorded');
        this.loadAssets();
        this.loadSummary();
      },
      error: (e) => {
        this.returning = false;
        this.err(e?.error?.message || 'Could not record the return');
      },
    });
  }

  // ── My assets ───────────────────────────────────────────────────────────────

  loadMyAssets(): void {
    this.myAssetsLoading = true;
    this.svc.listMine().subscribe({
      next: (rows) => { this.myAssets = rows; this.myAssetsLoading = false; },
      error: () => { this.myAssetsLoading = false; this.myAssets = []; },
    });
  }

  acknowledge(a: AssetAllocation): void {
    this.svc.acknowledge(a.id).subscribe({
      next: () => { this.ok('Receipt acknowledged'); this.loadMyAssets(); },
      error: (e) => this.err(e?.error?.message || 'Could not acknowledge'),
    });
  }

  // ── Exit check ──────────────────────────────────────────────────────────────

  runExitCheck(): void {
    if (!this.exitEmployee) { this.err('Select an employee'); return; }
    this.exitLoading = true;
    this.svc.getExitReport(this.exitEmployee.id).subscribe({
      next: (r) => { this.exitReport = r; this.exitLoading = false; },
      error: (e) => {
        this.exitLoading = false;
        this.exitReport = null;
        this.err(e?.error?.message || 'Could not run the exit check');
      },
    });
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  pretty(v?: string): string {
    if (!v) return '—';
    return v.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  }

  statusSeverity(s?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (s) {
      case 'AVAILABLE': return 'success';
      case 'ALLOCATED': return 'info';
      case 'IN_REPAIR': return 'warn';
      case 'LOST': case 'SCRAPPED': return 'danger';
      default: return 'secondary';
    }
  }

  conditionSeverity(c?: string | null): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (c) {
      case 'GOOD': return 'success';
      case 'MINOR_DAMAGE': return 'warn';
      case 'MAJOR_DAMAGE': case 'LOST': return 'danger';
      default: return 'secondary';
    }
  }

  inr(n?: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  }

  isOverdue(a: AssetAllocation): boolean {
    return !a.returnedOn && !!a.dueOn && new Date(a.dueOn) < new Date();
  }

  private ok(detail: string) { this.msg.add({ severity: 'success', summary: 'Done', detail }); }
  private err(detail: string) { this.msg.add({ severity: 'error', summary: 'Error', detail }); }
}
