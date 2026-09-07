import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { PermissionService } from '../../services/auth/permission.service';
import { Employees } from '../../services/employees/employees';
import { ProbationService } from '../../services/probation/probation.service';
import { ProbationEvaluationForm } from '../probation-evaluation-form/probation-evaluation-form';

type Tab = 'mine' | 'hr' | 'unassigned' | 'all' | 'due';

@Component({
  selector: 'app-probation-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, ToastModule, DialogModule,
    SelectModule, TooltipModule,
    ModuleGuide, ProbationEvaluationForm,
  ],
  templateUrl: './probation-overview.html',
  styleUrl: './probation-overview.css',
  providers: [MessageService],
})
export class ProbationOverview implements OnInit {
  /**
   * Drives which tabs exist, not what the server returns — the API narrows a
   * non-HR caller to their own assignments regardless of what is asked for.
   */
  canManage = false;

  activeTab: Tab = 'mine';
  loading = false;

  rows: any[] = [];
  dueRows: any[] = [];

  /** Set to open the form; cleared to return to the list. */
  selectedId: number | null = null;

  // ── Assign-manager dialog (HR clears the unassigned bucket) ────────────────
  assignDialogVisible = false;
  assignTarget: any = null;
  assignManagerId: number | null = null;
  employeeOptions: { label: string; value: number }[] = [];
  assigning = false;

  generating = false;

  constructor(
    private probation: ProbationService,
    private employees: Employees,
    private perms: PermissionService,
    private messageService: MessageService,
  ) {}

  /**
   * Built once, not exposed as a getter. A getter returning fresh object
   * literals hands *ngFor a brand-new item identity on every change-detection
   * pass, so the buttons are destroyed and rebuilt constantly — and a click is
   * lost whenever that happens between mousedown and mouseup. The notification
   * SSE stream keeps change detection busy enough for that to be the norm.
   */
  tabs: { key: Tab; label: string }[] = [];

  ngOnInit(): void {
    this.canManage = this.perms.has('admin.probation.manage');
    this.tabs = [
      { key: 'mine', label: 'My Pending' },
      ...(this.canManage
        ? ([
            { key: 'hr', label: 'Awaiting HR Review' },
            { key: 'unassigned', label: 'No Reporting Manager' },
            { key: 'all', label: 'All Evaluations' },
            { key: 'due', label: 'Upcoming Due' },
          ] as { key: Tab; label: string }[])
        : []),
    ];
    // A manager with no HR rights only ever has one meaningful tab.
    this.activeTab = 'mine';
    this.load();
  }

  /** Keeps the buttons stable across change detection. */
  trackTab = (_: number, t: { key: Tab }) => t.key;

  switchTab(tab: Tab) {
    this.activeTab = tab;
    this.selectedId = null;
    this.load();
  }

  load() {
    this.loading = true;

    if (this.activeTab === 'due') {
      this.probation.listDue(60).subscribe({
        next: (rows) => { this.dueRows = rows; this.loading = false; },
        error: (err) => this.fail(err, 'Could not load upcoming probations'),
      });
      return;
    }

    const filters =
      this.activeTab === 'mine' ? { mine: true, status: 'PENDING_MANAGER' as const }
      : this.activeTab === 'hr' ? { status: 'PENDING_HR' as const }
      : this.activeTab === 'unassigned' ? { unassigned: true, status: 'PENDING_MANAGER' as const }
      : {};

    this.probation.listEvaluations(filters).subscribe({
      next: (rows) => { this.rows = rows; this.loading = false; },
      error: (err) => this.fail(err, 'Could not load evaluations'),
    });
  }

  private fail(err: any, fallback: string) {
    this.loading = false;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: err?.error?.error || fallback,
    });
  }

  open(row: any) {
    this.selectedId = row.id;
  }

  onFormClosed(changed: boolean) {
    this.selectedId = null;
    if (changed) this.load();
  }

  /** HR's manual run of the same job the 09:15 cron performs. */
  generate() {
    this.generating = true;
    this.probation.generateDue().subscribe({
      next: (r) => {
        this.generating = false;
        this.messageService.add({
          severity: r.opened ? 'success' : 'info',
          summary: r.opened ? 'Evaluations opened' : 'Nothing due',
          detail: r.opened
            ? `${r.opened} evaluation${r.opened === 1 ? '' : 's'} opened` +
              (r.unassigned ? ` — ${r.unassigned} with no reporting manager` : '')
            : 'No employee has a probation period closing today.',
        });
        this.load();
      },
      error: (err) => { this.generating = false; this.fail(err, 'Could not generate evaluations'); },
    });
  }

  openAssignDialog(row: any) {
    this.assignTarget = row;
    this.assignManagerId = null;
    this.assignDialogVisible = true;

    if (!this.employeeOptions.length) {
      this.employees.getActiveEmployees().subscribe({
        next: (list) => {
          this.employeeOptions = (list || [])
            .map((e: any) => ({
              label: `${e.firstName ?? ''} ${e.lastName ?? ''} (${e.employeeCode ?? ''})`.trim(),
              value: e.id,
            }))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));
        },
        error: (err) => this.fail(err, 'Could not load employees'),
      });
    }
  }

  confirmAssign() {
    if (!this.assignTarget || !this.assignManagerId) return;
    this.assigning = true;
    this.probation.assignManager(this.assignTarget.id, this.assignManagerId).subscribe({
      next: () => {
        this.assigning = false;
        this.assignDialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Evaluator assigned',
          detail: 'The evaluation has been assigned and the evaluator notified.',
        });
        this.load();
      },
      error: (err) => { this.assigning = false; this.fail(err, 'Could not assign evaluator'); },
    });
  }

  statusClass(status: string) {
    switch (status) {
      case 'PENDING_MANAGER': return 'badge-warning';
      case 'PENDING_HR': return 'badge-active';
      case 'COMPLETED': return 'badge-improved';
      case 'CANCELLED': return 'badge-default';
      default: return 'badge-default';
    }
  }

  statusLabel(status: string) {
    switch (status) {
      case 'PENDING_MANAGER': return 'Awaiting Manager';
      case 'PENDING_HR': return 'Awaiting HR';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }

  decisionLabel(code: string | null) {
    switch (code) {
      case 'CONFIRM': return 'Confirm';
      case 'EXTEND': return 'Extend';
      case 'TERMINATE': return 'Terminate';
      case 'DEPARTMENT_TRANSFER': return 'Dept. Transfer';
      default: return '—';
    }
  }
}
