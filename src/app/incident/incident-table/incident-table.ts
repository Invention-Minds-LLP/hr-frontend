import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

import { Incident } from '../../services/incident/incident';

@Component({
  selector: 'app-incident-table',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, TableModule, TooltipModule,
    InputTextModule, SelectModule, ButtonModule,
  ],
  templateUrl: './incident-table.html',
  styleUrl: './incident-table.css',
})
export class IncidentTable implements OnInit, OnChanges {
  /** Optional scope — when set, only that employee's / reporter's rows shown. */
  @Input() employeeId?: number;
  @Input() reporterId?: number;
  /** Auto-refresh trigger from parent (e.g. after a new submission). */
  @Input() refreshTick = 0;
  /** Emit incident-id when a row is clicked so parent can open the detail page. */
  @Output() open = new EventEmitter<number>();

  /* ── Filters ──────────────────────────────────────── */
  filters: {
    status: string | null;
    severity: string | null;
    categoryId: number | null;
    q: string;
  } = { status: null, severity: null, categoryId: null, q: '' };

  statusOptions = [
    { label: 'All statuses',        value: null },
    { label: 'Open',                value: 'OPEN' },
    { label: 'Acknowledged',        value: 'ACKNOWLEDGED' },
    { label: 'Investigating',       value: 'INVESTIGATING' },
    { label: 'Escalated',           value: 'ESCALATED' },
    { label: 'Resolved',            value: 'RESOLVED' },
    { label: 'Closed',              value: 'CLOSED' },
    { label: 'Rejected',            value: 'REJECTED' },
    { label: 'Duplicate',           value: 'DUPLICATE' },
    { label: 'Withdrawn',           value: 'WITHDRAWN' },
  ];
  severityOptions = [
    { label: 'All severities', value: null },
    { label: 'Critical',  value: 'CRITICAL' },
    { label: 'High',      value: 'HIGH' },
    { label: 'Medium',    value: 'MEDIUM' },
    { label: 'Low',       value: 'LOW' },
  ];
  categoryOptions: any[] = [{ label: 'All categories', value: null }];

  /* ── Pagination ───────────────────────────────────── */
  page = 1;
  pageSize = 25;
  total = 0;
  rows: any[] = [];
  loading = false;

  constructor(private api: Incident) {}

  ngOnInit() {
    this.loadCategories();
    this.load();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Parent-triggered refresh (e.g. after creating an incident)
    if (changes['refreshTick'] && !changes['refreshTick'].firstChange) {
      this.load();
    }
  }

  private loadCategories() {
    this.api.listCategories().subscribe({
      next: (cats) => {
        this.categoryOptions = [
          { label: 'All categories', value: null },
          ...(cats ?? []).map((c) => ({ label: c.name, value: c.id })),
        ];
      },
      error: () => { /* silent — filter is optional */ },
    });
  }

  load() {
    this.loading = true;
    this.api.listIncidents({
      ...this.filters,
      employeeId: this.employeeId ?? undefined,
      assignedTo: undefined,
      page: this.page,
      pageSize: this.pageSize,
    } as any).subscribe({
      next: (res) => {
        // The new endpoint returns {total, rows}; legacy returned a plain array.
        // Handle both so older callers keep working.
        if (Array.isArray(res)) {
          this.rows = res; this.total = res.length;
        } else {
          this.rows = res?.rows ?? []; this.total = res?.total ?? 0;
        }
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  /* ── Filter handlers ─────────────────────────────── */
  onFilterChange() { this.page = 1; this.load(); }
  onPageChange(e: any) {
    this.page     = (e.first / e.rows) + 1;
    this.pageSize = e.rows;
    this.load();
  }
  resetFilters() {
    this.filters = { status: null, severity: null, categoryId: null, q: '' };
    this.page = 1;
    this.load();
  }

  /* ── Row click → tell parent which incident to open ── */
  openRow(row: any) {
    if (row?.id) this.open.emit(row.id);
  }

  /* ── Workflow: what's the next step from each status? ── */
  nextStepFor(status: string): { label: string; nextStatus: string } | null {
    switch (status) {
      case 'OPEN':           return { label: 'Acknowledge', nextStatus: 'ACKNOWLEDGED' };
      case 'ACKNOWLEDGED':   return { label: 'Investigate', nextStatus: 'INVESTIGATING' };
      case 'INVESTIGATING':
      case 'ESCALATED':      return { label: 'Resolve',     nextStatus: 'RESOLVED' };
      case 'RESOLVED':       return { label: 'Close',       nextStatus: 'CLOSED' };
      default:               return null;
    }
  }

  /** Permission gate — only HR / managers / assignees can advance state. */
  get canAct(): boolean {
    const role = (localStorage.getItem('role') || '').trim();
    return ['HR', 'HR Manager', 'Manager', 'Management', 'Admin'].includes(role);
  }

  quickAdvance(row: any, ev: MouseEvent) {
    ev.stopPropagation();
    const next = this.nextStepFor(row.status);
    if (!next) return;
    const prev = row.status;
    row.status = next.nextStatus;          // optimistic
    this.api.updateIncident(row.id, { status: next.nextStatus }).subscribe({
      error: () => { row.status = prev; }, // revert on failure
    });
  }

  /* ── UI helpers ──────────────────────────────────── */
  severityClass(s: string): string {
    switch (s) {
      case 'CRITICAL': return 'sev-critical';
      case 'HIGH':     return 'sev-high';
      case 'MEDIUM':   return 'sev-medium';
      case 'LOW':      return 'sev-low';
      default:         return 'sev-medium';
    }
  }
  statusClass(s: string): string {
    switch (s) {
      case 'CLOSED':   case 'RESOLVED':   return 'st-good';
      case 'ESCALATED':                   return 'st-danger';
      case 'INVESTIGATING':               return 'st-info';
      case 'ACKNOWLEDGED':                return 'st-info';
      case 'REJECTED':  case 'DUPLICATE':
      case 'WITHDRAWN':                   return 'st-neutral';
      default:                            return 'st-warn';
    }
  }
}
