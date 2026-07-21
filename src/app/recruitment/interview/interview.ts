import { Component, inject, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Recuriting } from '../../services/recruiting/recuriting';
import { FormBuilder, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';


// PrimeNG (optional)
import { TableModule } from 'primeng/table';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { DatePicker } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { Employees } from '../../services/employees/employees';
import { SlotPicker } from '../slot-picker/slot-picker';

@Component({
  selector: 'app-interview',
  imports: [CommonModule, DatePipe, TableModule, CardModule, ButtonModule, RadioButtonModule, DividerModule,
    FormsModule, DialogModule, Tag, ReactiveFormsModule, TextareaModule, SkeletonModule, PaginatorModule, TooltipModule,
    DatePicker, MultiSelectModule, SelectModule, CheckboxModule, SlotPicker, ModuleGuide],
  templateUrl: './interview.html',
  styleUrl: './interview.css'
})
export class Interview {
  private svc = inject(Recuriting);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private messages = inject(MessageService);
  private empSvc = inject(Employees);
  @Output() evaluate = new EventEmitter<any>();
  showReviewDialog = false;
  reviewCtx: any | null = null;
  currentApp: any | null = null;
  readOnlyReview = false;
  loading = true;
  isLoading = false;
  page = 1;
  pageSize = 10;
  totalRecords = 0;
  rows = signal<any[]>([]);



  reviewForm = this.fb.group({
    decision: this.fb.control<string | null>(null, { validators: Validators.required }),
    note: this.fb.control<string>(''),
  });



  ngOnInit() { this.load(); }
  load() {
    this.loading = true;

    this.svc.getAllInterview(this.page, this.pageSize).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.totalRecords = res.total;
        this.loading = false;
      },
      error: () => {
        this.rows.set([]);
        this.loading = false;
      }
    });
  }
  onPageChange(event: any) {
    this.page = event.page + 1;
    this.pageSize = event.rows;
    this.load();
  }

  /** Map a status string to one of the colour classes used by the Status pill
   *  in the table (.iv-good / .iv-warn / .iv-info / .iv-danger / .iv-neutral). */
  statusClass(status: string | null | undefined): string {
    if (!status) return 'iv-neutral';
    const s = String(status).toLowerCase();
    if (/(pass|completed|approved|cleared|hired|done|present)/i.test(s)) return 'iv-good';
    if (/(shortlist|in[ _-]?progress|scheduled)/i.test(s))               return 'iv-info';
    if (/(pending|not[ _-]?started|review)/i.test(s))                    return 'iv-warn';
    if (/(fail|reject|cancel|absent|no[ _-]?show|declined)/i.test(s))    return 'iv-danger';
    return 'iv-neutral';
  }

  /** Map a numeric score to a colour band — green (strong), amber (mid),
   *  red (weak). Score scale here is 0–10 (panel) or 0–100 (test); we
   *  normalise tests to /10 so thresholds stay simple. */
  scoreClass(score: number | string | null | undefined): string {
    if (score === null || score === undefined || score === '' || score === '—') return 'iv-neutral';
    let n = Number(score);
    if (Number.isNaN(n)) return 'iv-neutral';
    if (n > 10) n = n / 10;            // assume /100 → normalise
    if (n >= 7) return 'iv-good';
    if (n >= 4) return 'iv-warn';
    return 'iv-danger';
  }

  onEvaluate(row: any) {
    console.log(row)
    if (row.candidateAssignedTestId && row.candidateAssignedTest) {
      const test = row.candidateAssignedTest;

      // Case 1: test not yet completed
      if (!/completed/i.test(test.status)) {
        this.messages.add({
          severity: 'info',
          summary: 'Test not completed',
          detail: 'Candidate has not finished the test yet.'
        });
        return;
      }

      // Case 2: completed but not reviewed
      if (test.status === 'Completed' && !test.reviewedAt) {
        this.reviewCtx = test;
        this.currentApp = row.application;
        this.reviewForm.reset({ decision: null, note: '' });
        this.showReviewDialog = true;
        return;
      }
      if (test.status === 'Completed' && test.reviewedAt) {
        this.reviewCtx = test;
        this.currentApp = row.application;
        this.readOnlyReview = true;    // 👈 mark read-only
        this.showReviewDialog = true;
        return;
      }

      // Case 3: already reviewed -> go to evaluation form
      // this.evaluate.emit(row);
    } else {
      // Case 4: no test, just a panel round
      this.evaluate.emit(row);
    }
  }

  submitReview() {
    if (!this.currentApp || !this.reviewCtx || this.reviewForm.invalid) return;
    const { decision, note } = this.reviewForm.value;
    this.isLoading = true;

    this.svc.reviewCandidateTest(this.currentApp.id, this.reviewCtx.id, {
      decision: decision as 'PASS' | 'FAIL', note: note || undefined
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.messages.add({ severity: 'success', summary: 'Saved', detail: 'Review recorded' });
        this.showReviewDialog = false;
        // update local flags
        this.reviewCtx!.reviewDecision = decision as any;
        this.reviewCtx!.reviewedAt = new Date().toISOString();
        (this.currentApp as any)._hasPendingTestReview = false;
      },
      error: (e) => {
        this.messages.add({ severity: 'error', summary: 'Failed', detail: e?.error?.error || 'Could not save review' });
        this.isLoading = false;
      }
    });
  }
  truncate(text?: string, limit = 10): string {
    return text && text.length > limit ? text.slice(0, limit) + '…' : text || '—';
  }


  selectedform: any | null = null;

  openFrom(form: any) {
    this.selectedform = form;
  }

  closeFrom() {
    this.selectedform = null;
  }

  // ──────────────────────────────────────────────────────────────────
  // Reschedule
  // ──────────────────────────────────────────────────────────────────
  showRescheduleDialog = false;
  rescheduleMode: 'reschedule' | 'addSession' = 'reschedule';
  rescheduleRow: any | null = null;
  reschedulePanelOptions: Array<{ label: string; value: number }> = [];
  rescheduleForm = this.fb.group({
    start: this.fb.control<Date | null>(null, { validators: Validators.required }),
    end: this.fb.control<Date | null>(null, { validators: Validators.required }),
    panelIds: this.fb.control<number[]>([]),
  });

  // Opt-in panel availability
  showSlots = false;
  slotsLoading = false;
  availableSlots: { start: string; end: string }[] = [];

  private rowPanelIds(row: any): number[] {
    if (row?.panel?.length) return row.panel.map((p: any) => p.employeeId);
    return String(row?.panelUserIds ?? '')
      .split(',')
      .map((s: string) => Number(s.trim()))
      .filter((n: number) => Number.isFinite(n) && n > 0);
  }

  openReschedule(row: any) {
    this.rescheduleMode = 'reschedule';
    this.rescheduleRow = row;
    this.rescheduleForm.reset({
      start: row.startTime ? new Date(row.startTime) : null,
      end: row.endTime ? new Date(row.endTime) : null,
      panelIds: this.rowPanelIds(row),
    });
    this.afterOpenReschedule();
  }

  /** Add another session to the same multi-session round (other members / day). */
  openAddSession(row: any) {
    this.rescheduleMode = 'addSession';
    this.rescheduleRow = row;
    // Fresh session: no time yet, and start with an empty panel so HR picks the
    // members attending THIS session.
    this.rescheduleForm.reset({ start: null, end: null, panelIds: [] });
    this.afterOpenReschedule();
  }

  private afterOpenReschedule() {
    this.showSlots = false;
    this.availableSlots = [];
    this.reschedulePanelOptions = [];
    this.empSvc.list({}).subscribe({
      next: (rows: any[]) => {
        this.reschedulePanelOptions = (rows || []).map((e) => ({
          label: `${e.firstName} ${e.lastName}${e.employeeCode ? ` (${e.employeeCode})` : ''}`,
          value: e.id,
        }));
      },
      error: () => { this.reschedulePanelOptions = []; },
    });
    this.showRescheduleDialog = true;
  }

  // ── Panel acknowledgement summary (recruiter view) ──
  panelAckCounts(row: any): { available: number; unavailable: number; pending: number; total: number } {
    const panel = row?.panel ?? [];
    let available = 0, unavailable = 0, pending = 0;
    for (const p of panel) {
      if (p.ackStatus === 'AVAILABLE') available++;
      else if (p.ackStatus === 'UNAVAILABLE') unavailable++;
      else pending++;
    }
    return { available, unavailable, pending, total: panel.length };
  }

  panelAckTooltip(row: any): string {
    return (row?.panel ?? []).map((p: any) => {
      const name = p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : `#${p.employeeId}`;
      const st = p.ackStatus === 'AVAILABLE' ? '✓ available'
        : p.ackStatus === 'UNAVAILABLE' ? `✗ can't attend${p.ackReason ? ' — ' + p.ackReason : ''}`
        : '• pending';
      return `${name}: ${st}`;
    }).join('\n');
  }

  toggleSlots(on: boolean) {
    this.showSlots = on;
    this.availableSlots = [];
    if (on) this.loadAvailableSlots();
  }

  loadAvailableSlots() {
    const panelIds = (this.rescheduleForm.value.panelIds ?? []) as number[];
    if (!panelIds.length) {
      this.messages.add({ severity: 'info', summary: 'Select panel first', detail: 'Choose panel members to see when they are all free.' });
      return;
    }
    this.slotsLoading = true;
    this.svc.getPanelAvailability({ panelUserIds: panelIds, durationMin: 60, days: 7 }).subscribe({
      next: (res) => { this.availableSlots = res.slots; this.slotsLoading = false; },
      error: (err) => {
        this.slotsLoading = false;
        this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.error || err?.error?.message || 'Failed to load availability' });
      },
    });
  }

  pickSlot(slot: { start: string; end: string }) {
    this.rescheduleForm.patchValue({ start: new Date(slot.start), end: new Date(slot.end) });
  }

  submitReschedule() {
    if (!this.rescheduleRow || this.rescheduleForm.invalid) return;
    const v = this.rescheduleForm.value;
    const start = v.start as Date, end = v.end as Date;
    if (!(end > start)) {
      this.messages.add({ severity: 'warn', summary: 'Invalid time', detail: 'End time must be after start time.' });
      return;
    }
    if (!(v.panelIds ?? []).length) {
      this.messages.add({ severity: 'warn', summary: 'Panel required', detail: 'Select at least one panel member.' });
      return;
    }
    this.isLoading = true;

    const onConflict = (err: any, fallback: string) => {
      this.isLoading = false;
      if (err.status === 409 && err.error?.warning) {
        const details = (err.error.conflicts || []).join('\n');
        this.messages.add({ severity: 'warn', summary: 'Scheduling Conflict', detail: `${err.error.message}\n${details}`, life: 8000 });
      } else {
        this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.error || err?.error?.message || fallback, life: 7000 });
      }
    };

    if (this.rescheduleMode === 'addSession') {
      // Create a NEW interview in the same round group.
      const appId = this.rescheduleRow.application?.id;
      const body = {
        stage: this.rescheduleRow.stage,
        startTime: this.toOffsetIso(start),
        endTime: this.toOffsetIso(end),
        panelUserIds: (v.panelIds ?? []).join(','),
        sessionGroupId: this.rescheduleRow.sessionGroupId,
      };
      this.svc.scheduleInterview(appId, body).subscribe({
        next: () => {
          this.isLoading = false;
          this.showRescheduleDialog = false;
          this.messages.add({ severity: 'success', summary: 'Session added', detail: 'Another session was added to this round.' });
          this.load();
        },
        error: (err) => onConflict(err, 'Failed to add session'),
      });
      return;
    }

    const body = {
      startTime: this.toOffsetIso(start),
      endTime: this.toOffsetIso(end),
      panelUserIds: (v.panelIds ?? []).join(','),
      stage: this.rescheduleRow.stage,
    };
    this.svc.rescheduleInterview(this.rescheduleRow.id, body).subscribe({
      next: () => {
        this.isLoading = false;
        this.showRescheduleDialog = false;
        this.messages.add({ severity: 'success', summary: 'Rescheduled', detail: 'Interview moved and everyone notified.' });
        this.load();
      },
      error: (err) => onConflict(err, 'Failed to reschedule'),
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Cancel
  // ──────────────────────────────────────────────────────────────────
  showCancelDialog = false;
  cancelRow: any | null = null;
  cancelReason = '';

  openCancel(row: any) {
    this.cancelRow = row;
    this.cancelReason = '';
    this.showCancelDialog = true;
  }

  submitCancel() {
    if (!this.cancelRow) return;
    this.isLoading = true;
    this.svc.cancelInterview(this.cancelRow.id, this.cancelReason?.trim() || undefined).subscribe({
      next: () => {
        this.isLoading = false;
        this.showCancelDialog = false;
        this.messages.add({ severity: 'success', summary: 'Interview cancelled', detail: 'Candidate and panel notified.' });
        this.load();
      },
      error: (err) => {
        this.isLoading = false;
        this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.error || err?.error?.message || 'Failed to cancel', life: 7000 });
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Move ONE member to their own session (single-member reschedule)
  // ──────────────────────────────────────────────────────────────────
  showSplitDialog = false;
  splitRow: any | null = null;
  splitMemberOptions: Array<{ label: string; value: number; disabled: boolean }> = [];
  splitEmployeeId: number | null = null;
  splitStart: Date | null = null;
  splitEnd: Date | null = null;
  splitShowSlots = false;
  splitSlotsLoading = false;
  splitSlots: { start: string; end: string }[] = [];

  /** True if this member already submitted feedback (can't be moved). */
  memberSubmitted(row: any, employeeId: number): boolean {
    return (row?.InterviewFeedback ?? []).some((f: any) => Number(f.panelUserId) === Number(employeeId));
  }

  openSplit(row: any) {
    this.splitRow = row;
    this.splitMemberOptions = (row?.panel ?? []).map((p: any) => {
      const submitted = this.memberSubmitted(row, p.employeeId);
      const name = `${p.employee?.firstName ?? ''} ${p.employee?.lastName ?? ''}`.trim() || `#${p.employeeId}`;
      return { label: submitted ? `${name} — feedback submitted` : name, value: p.employeeId, disabled: submitted };
    });
    this.splitEmployeeId = null;
    this.splitStart = null;
    this.splitEnd = null;
    this.splitShowSlots = false;
    this.splitSlots = [];
    this.showSplitDialog = true;
  }

  toggleSplitSlots(on: boolean) {
    this.splitShowSlots = on;
    this.splitSlots = [];
    if (on) this.loadSplitSlots();
  }

  loadSplitSlots() {
    if (!this.splitEmployeeId) {
      this.messages.add({ severity: 'info', summary: 'Select member first', detail: 'Choose the member to see when they are free.' });
      return;
    }
    this.splitSlotsLoading = true;
    this.svc.getPanelAvailability({ panelUserIds: [this.splitEmployeeId], durationMin: 60, days: 7 }).subscribe({
      next: (res) => { this.splitSlots = res.slots; this.splitSlotsLoading = false; },
      error: (err) => {
        this.splitSlotsLoading = false;
        this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.error || err?.error?.message || 'Failed to load availability' });
      },
    });
  }

  pickSplitSlot(slot: { start: string; end: string }) {
    this.splitStart = new Date(slot.start);
    this.splitEnd = new Date(slot.end);
  }

  submitSplit() {
    if (!this.splitRow) return;
    if (!this.splitEmployeeId) { this.messages.add({ severity: 'warn', summary: 'Select member', detail: 'Choose which member to move.' }); return; }
    if (!this.splitStart || !this.splitEnd) { this.messages.add({ severity: 'warn', summary: 'Pick a time', detail: 'Set the new start and end.' }); return; }
    if (!(this.splitEnd > this.splitStart)) { this.messages.add({ severity: 'warn', summary: 'Invalid time', detail: 'End must be after start.' }); return; }
    this.isLoading = true;
    this.svc.splitPanelMember(this.splitRow.id, {
      employeeId: this.splitEmployeeId,
      startTime: this.toOffsetIso(this.splitStart),
      endTime: this.toOffsetIso(this.splitEnd),
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.showSplitDialog = false;
        this.messages.add({ severity: 'success', summary: 'Member moved', detail: 'Their own session was created; the rest stay as scheduled.' });
        this.load();
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 409 && err.error?.warning) {
          const details = (err.error.conflicts || []).join('\n');
          this.messages.add({ severity: 'warn', summary: 'Scheduling Conflict', detail: `${err.error.message}\n${details}`, life: 8000 });
        } else {
          this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.error || err?.error?.message || 'Failed to move member', life: 7000 });
        }
      },
    });
  }

  private toOffsetIso(d: Date): string {
    const pad = (n: number) => `${Math.floor(Math.abs(n))}`.padStart(2, '0');
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const hh = pad(off / 60), mm = pad(off % 60);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${hh}:${mm}`;
  }
}
