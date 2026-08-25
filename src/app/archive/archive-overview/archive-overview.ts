import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import {
  ArchiveService, ArchiveRow, ArchiveModuleOption,
} from '../../services/archive/archive.service';

/**
 * One screen for everything HR has retired, across every module that supports
 * archiving.
 *
 * Archiving is not deletion: the record stays in the database and keeps its
 * history, it just leaves the module's working list. This is where HR finds
 * those records again and puts them back.
 */
@Component({
  selector: 'app-archive-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, InputTextModule, SelectModule, TagModule, ToastModule,
    SkeletonModule, TooltipModule, DatePickerModule, CheckboxModule,
    ConfirmDialogModule, ModuleGuide,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './archive-overview.html',
  styleUrl: './archive-overview.css',
})
export class ArchiveOverview implements OnInit {

  readonly skeletonRows: any[] = [1, 2, 3, 4, 5];

  rows: ArchiveRow[] = [];
  total = 0;
  loading = false;

  page = 1;
  readonly limit = 25;

  // ── Filters ───────────────────────────────────────────────────────────────
  modules: ArchiveModuleOption[] = [];
  moduleFilter = '';
  search = '';
  fromDate: Date | null = null;
  toDate: Date | null = null;
  includeRestored = false;

  /** The row currently being restored, so only its button shows the spinner. */
  restoring: number | null = null;

  private searchTimer: any = null;

  constructor(
    private svc: ArchiveService,
    private toast: MessageService,
    private confirm: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.loadModules();
    this.load();
  }

  get moduleOptions() {
    return [{ label: 'All modules', value: '' }].concat(
      this.modules.map((m) => ({ label: `${m.label} (${m.count})`, value: m.key })),
    );
  }

  /** Total across modules, for the header count. */
  get archivedTotal(): number {
    return this.modules.reduce((sum, m) => sum + m.count, 0);
  }

  loadModules() {
    this.svc.listModules().subscribe({
      next: (m) => (this.modules = m || []),
      error: () => (this.modules = []),
    });
  }

  load() {
    this.loading = true;
    this.svc.list({
      module: this.moduleFilter || undefined,
      q: this.search.trim() || undefined,
      from: this.fromDate ? this.ymd(this.fromDate) : undefined,
      to: this.toDate ? this.ymd(this.toDate) : undefined,
      includeRestored: this.includeRestored,
      page: this.page,
      limit: this.limit,
    }).subscribe({
      next: (res) => {
        this.rows = res.rows || [];
        this.total = res.total || 0;
        this.loading = false;
      },
      error: (e) => {
        this.rows = [];
        this.total = 0;
        this.loading = false;
        this.err(e?.error?.error || 'Could not load the archive');
      },
    });
  }

  /** Any filter change resets to the first page — page 3 of the old result set
   *  is meaningless once the filter moves. */
  onFilterChange() {
    this.page = 1;
    this.load();
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.onFilterChange(), 300);
  }

  clearFilters() {
    this.moduleFilter = '';
    this.search = '';
    this.fromDate = null;
    this.toDate = null;
    this.includeRestored = false;
    this.onFilterChange();
  }

  onPage(event: any) {
    const next = Math.floor((event.first ?? 0) / this.limit) + 1;
    if (next === this.page) return;
    this.page = next;
    this.load();
  }

  restore(row: ArchiveRow) {
    this.confirm.confirm({
      header: 'Restore record',
      message: `Bring "${row.label}" back into ${row.moduleLabel}? It will appear in that module's list again.`,
      acceptLabel: 'Restore',
      rejectLabel: 'Cancel',
      accept: () => {
        this.restoring = row.id;
        this.svc.restore(row.module, row.recordId).subscribe({
          next: (r) => {
            this.restoring = null;
            this.ok(r?.message || 'The record is active again.');
            // Reload rather than patching the row: with "show restored" off the
            // record leaves this list entirely, and the module counts move.
            this.loadModules();
            this.load();
          },
          error: (e) => {
            this.restoring = null;
            this.err(e?.error?.error || 'Could not restore the record');
          },
        });
      },
    });
  }

  /** Local yyyy-mm-dd — toISOString() would shift the day in IST. */
  private ymd(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private ok(detail: string) {
    this.toast.add({ severity: 'success', summary: 'Done', detail, life: 5000 });
  }

  private err(detail: string) {
    this.toast.add({ severity: 'error', summary: 'Failed', detail });
  }
}
