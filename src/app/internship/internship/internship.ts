
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { DatePicker } from 'primeng/datepicker';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableLazyLoadEvent } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  Internships,
  InternshipStatus,
  CreateInternshipDto,
  UpdateInternshipDto,
  ConvertPayload,
  InternshipListResponse
} from '../../services/internship/internship-service.model';
import { InternshipService } from '../../services/internship/internship-service';
import { Select } from "primeng/select";

type ActionKind = 'create' | 'edit' | 'offer' | 'activate' | 'extend' | 'complete' | 'drop' | 'convert';
// add near the top with your other types
type PrimeSeverity = 'success' | 'info' | 'warning' | 'danger';







@Component({
  selector: 'app-internship',
  imports: [CommonModule, FormsModule, DatePipe, DatePicker, TableModule, ButtonModule, TagModule, Select],
  templateUrl: './internship.html',
  styleUrl: './internship.css'
})
export class Internship implements OnInit {
  // Table
  items: Internships[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  order: 'asc' | 'desc' = 'desc';
  loading = false;
  error = '';

  // Filters
  q = '';
  status: string = ''; // CSV or single
  employeeId?: number;
  mentorId?: number;
  startFrom?: string;
  startTo?: string;
  endFrom?: string;
  endTo?: string;

  // Modal
  modalOpen = false;
  action: ActionKind | null = null;
  selected?: Internships;

  // Forms (template-driven)
  createForm: CreateInternshipDto = {
    candidateName: '',
    startDate: this.todayStr(),
    email: '',
    phone: '',
    title: '',
    stipend: undefined,
    notes: '',
    employeeId: null,
    mentorId: null,
    endDate: null,
    status: 'DRAFT'
  };

  editForm: UpdateInternshipDto = {};
  workflowForm: any = {};  // changes based on action

  statuses: InternshipStatus[] = ['DRAFT', 'OFFERED', 'ACTIVE', 'COMPLETED', 'CONVERTED', 'DROPPED'];

  allowedStatusOptions(it: Internship) {
    // lock rows that are already CONVERTED or DROPPED
    if (it.status === 'CONVERTED' || it.status === 'DROPPED') {
      return [{ label: it.status, value: it.status }];
    }
    return this.statusOptions;
  }
  readonly severityMap: Record<InternshipStatus, PrimeSeverity> = {
    DRAFT: 'info',
    OFFERED: 'warning',
    ACTIVE: 'success',
    COMPLETED: 'success',
    CONVERTED: 'success',
    DROPPED: 'danger',
  };
  
  getSeverity(status: InternshipStatus | string): PrimeSeverity {
    return this.severityMap[status as InternshipStatus] ?? 'info';
  }


  statusOptions = this.statuses.map(s => ({ label: s, value: s }));

  onStatusChange(it: Internships, ev: { value: InternshipStatus }) {
    const next = ev.value;
    const prev = it.status;

    // optimistic UI
    it.status = next;

    this.api.update(it.id, { status: next }).subscribe({
      next: (updated) => { it.status = updated.status; },
      error: (err) => {
        it.status = prev; // revert on failure
        alert(err?.error?.error || 'Failed to update status');
      },
    });
  }

  constructor(private api: InternshipService) { }
  // debounce for the search box
private search$ = new Subject<void>();

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300)).subscribe(() => {
      this.page = 1;
      this.load();
    });
    this.load();
  }

  private todayStr(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.list({
      q: this.q || undefined,
      status: this.status || undefined,
      employeeId: this.employeeId,
      mentorId: this.mentorId,
      activeFrom: this.activeFrom, // NEW
      activeTo: this.activeTo,     // NEW    
      page: this.page,
      pageSize: this.pageSize,
      order: this.order,
    }).pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (resp: InternshipListResponse) => {
          this.items = resp.items;
          this.total = resp.total;
          this.page = resp.page;
          this.pageSize = resp.pageSize;
        },
        error: (err) => {
          this.error = err?.error?.error || err.message || 'Failed to load internships';
          this.items = [];
          this.total = 0;
        },
      });
  }

  resetFilters() {
    this.q = '';
    this.status = '';
    this.employeeId = undefined;
    this.mentorId = undefined;
    this.startFrom = this.startTo = this.endFrom = this.endTo = undefined;
    this.page = 1;
    this.load();
  }

  // Pagination helpers
  canPrev() { return this.page > 1; }
  canNext() { return this.page * this.pageSize < this.total; }
  prev() { if (this.canPrev()) { this.page--; this.load(); } }
  next() { if (this.canNext()) { this.page++; this.load(); } }

  // Open modals
  openCreate() {
    this.action = 'create';
    this.createForm = {
      candidateName: '',
      startDate: this.todayStr(),
      email: '',
      phone: '',
      title: '',
      stipend: undefined,
      notes: '',
      employeeId: null,
      mentorId: null,
      endDate: null,
      status: 'DRAFT'
    };
    this.modalOpen = true;
  }

  openEdit(it: Internships) {
    this.selected = it;
    this.action = 'edit';
    this.editForm = {
      candidateName: it.candidateName,
      email: it.email || '',
      phone: it.phone || '',
      title: it.title || '',
      stipend: it.stipend ?? undefined,
      notes: it.notes || '',
      employeeId: it.employeeId,
      mentorId: it.mentorId,
      startDate: it.startDate?.slice(0, 10),
      endDate: it.endDate ? it.endDate.slice(0, 10) : null,
      status: it.status,
    };
    this.modalOpen = true;
  }

  openAction(kind: ActionKind, it: Internships) {
    this.selected = it;
    this.action = kind;
    // minimal per-action forms
    if (kind === 'offer') this.workflowForm = { startDate: it.startDate?.slice(0, 10) || this.todayStr() };
    if (kind === 'activate') this.workflowForm = { startDate: it.startDate?.slice(0, 10) || this.todayStr(), employeeId: it.employeeId ?? null };
    if (kind === 'extend') this.workflowForm = { endDate: it.endDate?.slice(0, 10) || this.todayStr() };
    if (kind === 'complete') this.workflowForm = { endDate: it.endDate?.slice(0, 10) || this.todayStr() };
    if (kind === 'drop') this.workflowForm = { reason: '' };
    if (kind === 'convert') this.workflowForm = { employeeId: it.employeeId ?? null, createEmployee: { firstName: '', lastName: '', email: '', departmentId: undefined, branchId: undefined, dateOfJoining: this.todayStr() } };
    this.modalOpen = true;
  }

  close() {
    this.modalOpen = false;
    this.action = null;
    this.selected = undefined;
    this.editForm = {};
    this.workflowForm = {};
  }

  // Submit handlers
  submitCreate() {
    this.api.create(this.createForm).subscribe({
      next: () => { this.close(); this.load(); },
      error: (err) => alert(err?.error?.error || 'Create failed'),
    });
  }

  submitEdit() {
    if (!this.selected) return;
    this.api.update(this.selected.id, this.editForm).subscribe({
      next: () => { this.close(); this.load(); },
      error: (err) => alert(err?.error?.error || 'Update failed'),
    });
  }

  submitAction() {
    if (!this.selected || !this.action) return;
    const id = this.selected.id;
    const a = this.action;

    if (a === 'offer') {
      this.api.offer(id, { startDate: this.workflowForm.startDate }).subscribe(this.afterAction, this.onErr);
    } else if (a === 'activate') {
      this.api.activate(id, { startDate: this.workflowForm.startDate, employeeId: this.workflowForm.employeeId ?? null }).subscribe(this.afterAction, this.onErr);
    } else if (a === 'extend') {
      if (!this.workflowForm.endDate) return alert('endDate is required');
      this.api.extend(id, { endDate: this.workflowForm.endDate }).subscribe(this.afterAction, this.onErr);
    } else if (a === 'complete') {
      this.api.complete(id, { endDate: this.workflowForm.endDate || undefined }).subscribe(this.afterAction, this.onErr);
    } else if (a === 'drop') {
      this.api.drop(id, { reason: this.workflowForm.reason || undefined }).subscribe(this.afterAction, this.onErr);
    } else if (a === 'convert') {
      const payload: ConvertPayload = {};
      if (this.workflowForm.employeeId) payload.employeeId = Number(this.workflowForm.employeeId);
      if (!payload.employeeId && this.workflowForm.createEmployee?.firstName && this.workflowForm.createEmployee?.lastName) {
        payload.createEmployee = this.workflowForm.createEmployee;
      }
      this.api.convert(id, payload).subscribe(this.afterAction, this.onErr);
    }
  }

  private afterAction = () => { this.close(); this.load(); };
  private onErr = (err: any) => alert(err?.error?.error || 'Action failed');

  // Small helpers
  trackById(_i: number, x: Internships) { return x.id; }
  statusClass(s: InternshipStatus) {
    return {
      DRAFT: 'muted', OFFERED: 'warn', ACTIVE: 'good',
      COMPLETED: 'good', CONVERTED: 'good', DROPPED: 'danger'
    }[s] || '';
  }
  // add to your component
  activeRange: Date[] | null = null;
  activeFrom?: string;   // yyyy-MM-dd
  activeTo?: string;     // yyyy-MM-dd

  private toYMD(d?: Date): string | undefined {
    if (!d) return;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  onRangeChange(range: Date[] | null) {
    this.activeFrom = this.toYMD(range?.[0]);
    this.activeTo = this.toYMD(range?.[1]);
    this.page = 1;
    this.load(); // call your API with activeFrom/activeTo
  }
  rowsPerPageOptions = [10, 20, 50];

  onLazyLoad(e: TableLazyLoadEvent) {
    // e.first (0-based index), e.rows (page size)
    const first = e.first ?? 0;
    const rows = e.rows ?? this.pageSize;

    this.page = Math.floor(first / rows) + 1;  // 1-based for your API
    this.pageSize = rows;

    // Optionally read sorting if you add it later:
    // this.order = e.sortOrder === 1 ? 'asc' : 'desc';

    this.load();
  }
  onSearchChange(_q: string) {
    this.page = 1;
    this.search$.next();
  }
  
  // called by status dropdown (apply immediately)
  onImmediateFilterChange() {
    this.page = 1;
    this.load();
  }
  
}
