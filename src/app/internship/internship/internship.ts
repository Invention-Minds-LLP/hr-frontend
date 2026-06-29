
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
import { Subject, forkJoin } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Department, Departments } from '../../services/departments/departments';
import { Employees } from '../../services/employees/employees';
import {
  Internships,
  InternshipStatus,
  CreateInternshipDto,
  UpdateInternshipDto,
  ConvertPayload,
  InternshipListResponse,
  InternshipEvaluation,
  CreateEvaluationDto,
  InternshipRecommendation,
  InternshipStipend,
  CreateStipendDto,
  StipendStatus,
  StipendSummary,
  InternshipAnalytics,
} from '../../services/internship/internship-service.model';
import { InternshipService } from '../../services/internship/internship-service';
import { Select } from "primeng/select";
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { ModuleGuide } from '../../shared/module-guide/module-guide';

type ActionKind = 'create' | 'edit' | 'offer' | 'activate' | 'extend' | 'complete' | 'drop' | 'convert' | 'evaluations' | 'stipends';
// add near the top with your other types
type PrimeSeverity = 'success' | 'info' | 'warn' | 'danger';

type EmpPick = { id: number; firstName: string; lastName: string; employeeCode?: string | null; departmentId?: number | null };





@Component({
  selector: 'app-internship',
  imports: [CommonModule, FormsModule, DatePipe, DatePicker, TableModule, ButtonModule, TagModule, Select, SkeletonModule, ModuleGuide],
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

  // In-flight flags for submit buttons
  creating = false;
  savingEval = false;

  isLoading = true

  // Filters
  q = '';
  status: string = ''; // CSV or single
  employeeId?: number;
  mentorId?: number;
  startFrom?: string;
  startTo?: string;
  endFrom?: string;
  endTo?: string;

  // Analytics (module-level stats strip)
  analytics?: InternshipAnalytics;

  // Bulk selection
  selectedRows: Internships[] = [];

  // Role-based scope: roleId 3 & 5 are restricted to interns they mentor.
  // Everyone else (incl. roleId 4 / deptId 1 = HR) sees all.
  restrictedToOwn = false;



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
    status: 'DRAFT',
    departmentId: null,
  };
  departmentId?: number;                 // filter (optional)
  departments: Department[] = [];        // dropdown source
  deptOptions: { label: string, value: number }[] = [];

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
    OFFERED: 'warn',
    ACTIVE: 'success',
    COMPLETED: 'success',
    CONVERTED: 'success',
    DROPPED: 'danger',
  };

  getSeverity(status: InternshipStatus | string): PrimeSeverity {
    return this.severityMap[status as InternshipStatus] ?? 'info';
  }
  onCreateStatusChange(s: InternshipStatus) {
    this.createForm.status = s;
    if (s !== 'CONVERTED') this.createForm.employeeId = null;  // clear when not converted
  }

  onEditStatusChange(s: InternshipStatus) {
    this.editForm.status = s;
    if (s !== 'CONVERTED') this.editForm.employeeId = undefined; // don't send on patch
  }


  private lastStatus: Record<number, InternshipStatus> = {};

  // store current status when the select gets focus
  rememberStatus(it: Internships) {
    if (it?.id) this.lastStatus[it.id] = it.status;
  }
  statusOptions = this.statuses.map(s => ({ label: s, value: s }));
  private statusToAction(next: InternshipStatus | string): ActionKind | null {
    switch (next) {
      case 'OFFERED': return 'offer';
      case 'ACTIVE': return 'activate';
      case 'COMPLETED': return 'complete';
      case 'DROPPED': return 'drop';
      case 'CONVERTED': return 'convert';
      default: return null; // DRAFT or unknown -> no modal
    }
  }

  onStatusChange(it: Internships, ev: { value: InternshipStatus }) {
    const next = ev.value;
    const prev = this.lastStatus[it.id] ?? it.status;

    const action = this.statusToAction(next);
    if (!action) {
      // No action modal for this choice (e.g., DRAFT). Just persist status if you want:
      // this.api.update(it.id, { status: next }).subscribe(/* refresh */);
      it.status = prev; // or keep next if you do update above
      return;
    }

    // Revert immediately; we'll switch after the action succeeds
    it.status = prev;

    // Open the corresponding workflow modal you already have
    this.openAction(action, it);
  }

  constructor(private api: InternshipService, private dept: Departments, private empService: Employees, private messageService: MessageService) { }
  // debounce for the search box
  private search$ = new Subject<void>();

  ngOnInit(): void {
    this.isLoading = true
    // Departments feed the filter/mentor dropdowns; loading them must not gate
    // the table skeleton (which is driven by the actual list fetch below).
    this.dept.getDepartments().subscribe({
      next: (rows) => {
        this.departments = rows || [];
        this.deptOptions = this.departments.map(d => ({ label: d.name, value: d.id! }));
      },
      error: () => {
        this.departments = []; this.deptOptions = [];
      }
    });
    this.search$.pipe(debounceTime(300)).subscribe(() => {
      this.page = 1;
      this.load();
    });
    this.applyRoleScope();
    this.load();
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.api.analytics().subscribe({
      next: (a) => this.analytics = a,
      error: () => { /* stats strip is non-critical; ignore */ },
    });
  }

  private localNum(key: string): number | undefined {
    if (typeof localStorage === 'undefined') return undefined;
    const raw = localStorage.getItem(key);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }

  /**
   * Scope the list to the logged-in user's role:
   *   roleId 3 & 5  → only the interns they mentor (mentorId = own empId)
   *   everyone else (incl. roleId 4 / deptId 1 = HR) → all interns
   * Called once on init before the first load.
   */
  private applyRoleScope() {
    const roleId = this.localNum('roleId');
    const empId = this.localNum('empId');
    if ((roleId === 3 || roleId === 5) && empId) {
      this.mentorId = empId;
      this.restrictedToOwn = true;
    } else {
      this.restrictedToOwn = false;
    }
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
      departmentId: this.departmentId,
    }).pipe(finalize(() => { this.loading = false; this.isLoading = false; }))
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
  private toMentorOptions(list: EmpPick[]) {
    return list.map(e => ({
      label: `${e.firstName} ${e.lastName}${e.employeeCode ? ' (' + e.employeeCode + ')' : ''}`,
      value: e.id,
    }));
  }

  // fetch employees for a dept
  private async loadMentors(deptId: number) {
    const list = await this.empService.list({ departmentId: deptId, status: 'ACTIVE' }).toPromise();
    return this.toMentorOptions(list || []);
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
      status: 'DRAFT',
      departmentId: null, // optional, can be set later
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
      mentorId: it.mentorId ?? null,
      startDate: it.startDate?.slice(0, 10),
      endDate: it.endDate ? it.endDate.slice(0, 10) : null,
      status: it.status,
      departmentId: it.departmentId ?? null,
    };
    if (this.editForm.departmentId) {
      this.loadMentors(this.editForm.departmentId).then(opts => this.mentorOptionsEdit = opts);
    } else {
      this.mentorOptionsEdit = [];
    }
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
    if (kind === 'convert') this.workflowForm = { employeeId: it.employeeId ?? null, createEmployee: { firstName: '', lastName: '', email: it.email ?? '', phone: it.phone ?? '', departmentId: it.departmentId ?? undefined, branchId: undefined, dateOfJoining: this.todayStr() } };
    this.modalOpen = true;
  }

  // ── Evaluations ───────────────────────────────────────────────────────────
  evaluations: InternshipEvaluation[] = [];
  evalLoading = false;
  evaluatorOptions: { label: string; value: number }[] = [];
  ratingOptions = [1, 2, 3, 4, 5];
  recommendationOptions: InternshipRecommendation[] = ['RETAIN', 'EXTEND', 'COMPLETE', 'TERMINATE'];
  evalForm: CreateEvaluationDto = {};
  editingEvalId: number | null = null;

  private resetEvalForm(it: Internships) {
    this.editingEvalId = null;
    this.evalForm = {
      evaluatorId: it.mentorId ?? null,
      periodLabel: '',
      evaluationDate: this.todayStr(),
      rating: null,
      strengths: '',
      areasToImprove: '',
      comments: '',
      recommendation: null,
    };
  }

  editEvaluation(ev: InternshipEvaluation) {
    this.editingEvalId = ev.id;
    this.evalForm = {
      evaluatorId: ev.evaluatorId,
      periodLabel: ev.periodLabel,
      evaluationDate: ev.evaluationDate ? ev.evaluationDate.slice(0, 10) : this.todayStr(),
      rating: ev.rating,
      strengths: ev.strengths,
      areasToImprove: ev.areasToImprove,
      comments: ev.comments,
      recommendation: ev.recommendation,
    };
  }

  cancelEvalEdit() {
    if (this.selected) this.resetEvalForm(this.selected);
  }

  openEvaluations(it: Internships) {
    this.selected = it;
    this.action = 'evaluations';
    this.resetEvalForm(it);
    this.evaluations = [];
    this.evaluatorOptions = [];
    if (it.departmentId) {
      this.loadMentors(it.departmentId).then(opts => this.evaluatorOptions = opts);
    }
    this.loadEvaluations(it.id);
    this.modalOpen = true;
  }

  loadEvaluations(id: number) {
    this.evalLoading = true;
    this.api.listEvaluations(id)
      .pipe(finalize(() => this.evalLoading = false))
      .subscribe({
        next: (resp) => { this.evaluations = resp.items || []; },
        error: (err) => this.messageService.add({
          severity: 'error', summary: 'Error',
          detail: err?.error?.error || 'Failed to load evaluations',
        }),
      });
  }

  submitEvaluation() {
    if (!this.selected) return;
    const id = this.selected.id;
    const done = (detail: string) => {
      this.messageService.add({ severity: 'success', summary: 'Saved', detail });
      this.resetEvalForm(this.selected!);
      this.loadEvaluations(id);
    };
    const onErr = (err: any) => this.messageService.add({
      severity: 'error', summary: 'Error',
      detail: err?.error?.error || 'Failed to save evaluation',
    });

    this.savingEval = true;
    const req$ = this.editingEvalId
      ? this.api.updateEvaluation(id, this.editingEvalId, this.evalForm)
      : this.api.createEvaluation(id, this.evalForm);
    const msg = this.editingEvalId ? 'Evaluation updated' : 'Evaluation added';
    req$.pipe(finalize(() => this.savingEval = false)).subscribe({
      next: () => done(msg), error: onErr,
    });
  }

  deleteEvaluation(evalId: number) {
    if (!this.selected) return;
    const id = this.selected.id;
    this.api.deleteEvaluation(id, evalId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Evaluation removed' });
        this.loadEvaluations(id);
      },
      error: (err) => this.messageService.add({
        severity: 'error', summary: 'Error',
        detail: err?.error?.error || 'Failed to delete evaluation',
      }),
    });
  }

  // ── Stipends ──────────────────────────────────────────────────────────────
  stipends: InternshipStipend[] = [];
  stipendSummary: StipendSummary = { paidAmount: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0 };
  stipendLoading = false;
  stipendStatusOptions: StipendStatus[] = ['PENDING', 'PAID', 'CANCELLED'];
  stipendMonth = '';                       // yyyy-MM from <input type="month">
  stipendForm: { amount?: number | null; status?: StipendStatus; notes?: string } = {};

  private thisMonthStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  private resetStipendForm() {
    this.stipendMonth = this.thisMonthStr();
    this.stipendForm = { amount: this.selected?.stipend ?? null, status: 'PENDING', notes: '' };
  }

  openStipends(it: Internships) {
    this.selected = it;
    this.action = 'stipends';
    this.stipends = [];
    this.resetStipendForm();
    this.loadStipends(it.id);
    this.modalOpen = true;
  }

  loadStipends(id: number) {
    this.stipendLoading = true;
    this.api.listStipends(id)
      .pipe(finalize(() => this.stipendLoading = false))
      .subscribe({
        next: (resp) => { this.stipends = resp.items || []; this.stipendSummary = resp.summary; },
        error: (err) => this.messageService.add({
          severity: 'error', summary: 'Error',
          detail: err?.error?.error || 'Failed to load stipends',
        }),
      });
  }

  submitStipend() {
    if (!this.selected) return;
    if (!this.stipendMonth) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Select a month' });
      return;
    }
    const id = this.selected.id;
    const body: CreateStipendDto = {
      periodMonth: `${this.stipendMonth}-01`,
      amount: Number(this.stipendForm.amount ?? 0),
      status: this.stipendForm.status ?? 'PENDING',
      notes: this.stipendForm.notes || null,
    };
    this.api.createStipend(id, body).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Stipend added' });
        this.resetStipendForm();
        this.loadStipends(id);
      },
      error: (err) => this.messageService.add({
        severity: 'error', summary: 'Error',
        detail: err?.error?.error || 'Failed to add stipend',
      }),
    });
  }

  markStipendPaid(s: InternshipStipend) {
    if (!this.selected) return;
    const id = this.selected.id;
    this.api.updateStipend(id, s.id, { status: 'PAID' }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Marked as paid' });
        this.loadStipends(id);
      },
      error: (err) => this.messageService.add({
        severity: 'error', summary: 'Error',
        detail: err?.error?.error || 'Failed to update stipend',
      }),
    });
  }

  deleteStipend(stipendId: number) {
    if (!this.selected) return;
    const id = this.selected.id;
    this.api.deleteStipend(id, stipendId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Stipend removed' });
        this.loadStipends(id);
      },
      error: (err) => this.messageService.add({
        severity: 'error', summary: 'Error',
        detail: err?.error?.error || 'Failed to delete stipend',
      }),
    });
  }

  generateStipendSchedule() {
    if (!this.selected) return;
    const id = this.selected.id;
    this.api.generateStipendSchedule(id).subscribe({
      next: (r) => {
        this.messageService.add({
          severity: 'success', summary: 'Generated',
          detail: `Added ${r.created} of ${r.monthsInRange} month(s)`,
        });
        this.loadStipends(id);
      },
      error: (err) => this.messageService.add({
        severity: 'error', summary: 'Error',
        detail: err?.error?.error || 'Failed to generate schedule',
      }),
    });
  }

  stipendPillClass(status: StipendStatus): string {
    return { PAID: 'good', PENDING: 'warn', CANCELLED: 'danger' }[status] || 'muted';
  }

  close() {
    this.modalOpen = false;
    this.action = null;
    this.selected = undefined;
    this.editForm = {};
    this.workflowForm = {};
    this.evaluations = [];
    this.evalForm = {};
    this.stipends = [];
    this.stipendForm = {};
  }

  // Submit handlers
  submitCreate() {
    this.creating = true;
    this.api.create(this.createForm)
      .pipe(finalize(() => this.creating = false))
      .subscribe({
        next: () => { this.close(); this.load(); this.loadAnalytics(); },
        error: (err) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.error || 'Create failed'
          })
      });
  }

  submitEdit() {
    if (!this.selected) return;
    this.api.update(this.selected.id, this.editForm).subscribe({
      next: () => { this.close(); this.load(); },
      error: (err) =>
        //  alert(err?.error?.error || 'Update failed'),
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.error || 'Update failed'
        })
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
      if (!this.workflowForm.endDate) return
      // alert('endDate is required');
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'endDate is required'
      })
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

  private afterAction = () => { this.close(); this.load(); this.loadAnalytics(); };

  // ── Bulk actions ──────────────────────────────────────────────────────────
  private bulkRun(label: string, calls: Array<ReturnType<InternshipService['complete']>>) {
    if (!calls.length) return;
    forkJoin(calls).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Done', detail: `${label} ${calls.length} internship(s)` });
        this.selectedRows = [];
        this.load();
        this.loadAnalytics();
      },
      error: (err) => this.messageService.add({
        severity: 'error', summary: 'Error',
        detail: err?.error?.error || `Bulk ${label.toLowerCase()} failed`,
      }),
    });
  }

  bulkComplete() {
    // Only ACTIVE internships can be completed.
    const eligible = this.selectedRows.filter(r => r.status === 'ACTIVE');
    if (!eligible.length) {
      this.messageService.add({ severity: 'warn', summary: 'Nothing to do', detail: 'Select ACTIVE internships to complete' });
      return;
    }
    this.bulkRun('Completed', eligible.map(r => this.api.complete(r.id, {})));
  }

  bulkDrop() {
    const eligible = this.selectedRows.filter(r => !['DROPPED', 'COMPLETED', 'CONVERTED'].includes(r.status));
    if (!eligible.length) {
      this.messageService.add({ severity: 'warn', summary: 'Nothing to do', detail: 'No droppable internships selected' });
      return;
    }
    this.bulkRun('Dropped', eligible.map(r => this.api.drop(r.id, { reason: 'Bulk drop' })));
  }
  private onErr = (err: any) =>
    //  alert(err?.error?.error || 'Action failed');
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: err?.error?.error || 'Action failed'
    });

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
  mentorOptionsCreate: { label: string; value: number }[] = [];
  mentorOptionsEdit: { label: string; value: number }[] = [];

  // called when create department changes
  onCreateDeptChange(deptId?: number | null) {
    if (!deptId) { this.mentorOptionsCreate = []; this.createForm.mentorId = null; return; }
    this.loadMentors(deptId).then(opts => {
      this.mentorOptionsCreate = opts;
      // clear mentor if it’s not in the new list
      if (!opts.some(o => o.value === this.createForm.mentorId)) this.createForm.mentorId = null;
    });
  }

  // called when edit department changes
  onEditDeptChange(deptId?: number | null) {
    if (!deptId) { this.mentorOptionsEdit = []; this.editForm.mentorId = null; return; }
    this.loadMentors(deptId).then(opts => {
      this.mentorOptionsEdit = opts;
      if (!opts.some(o => o.value === this.editForm.mentorId)) this.editForm.mentorId = null;
    });
  }

  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }

  getDefaultImage(gender?: string | null): string {
    const g = gender?.toUpperCase?.() || 'MALE';
    return g === 'FEMALE'
      ? '/img-women.png'
      : '/img.png';
  }
}
