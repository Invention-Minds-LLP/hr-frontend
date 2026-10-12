import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { Recuriting, CandidateAssignedTestRow } from '../../services/recruiting/recuriting';

/**
 * Candidate Tests — every test assigned to an interview candidate.
 *
 * The sibling "Assigned Tests" tab lists EMPLOYEE assignments; a candidate's
 * test used to be visible only inside their own interview row, so there was no
 * way to see who had been assigned what, who hasn't started, or who is past
 * their deadline. Paging, search and the status filter are all server-side
 * (GET /recruiting/tests/assigned).
 */
@Component({
  selector: 'app-candidate-assigned-test',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    IconFieldModule, InputIconModule, SkeletonModule, TooltipModule,
    DialogModule, ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './candidate-assigned-test.html',
  styleUrls: ['../assigned-test/assigned-test.css', './candidate-assigned-test.css'],
})
export class CandidateAssignedTest implements OnInit, OnDestroy {
  rows: CandidateAssignedTestRow[] = [];
  total = 0;
  page = 1;
  pageSize = 10;
  loading = true;
  loadError = '';

  search = '';
  statusFilter: string | null = null;
  showFilterDropdown = false;

  // Placeholder rows the table renders while loading — `any[]` so the template
  // can hand either these or real rows to p-table.
  readonly skeletonRows: any[] = [1, 2, 3, 4, 5];
  readonly statusOptions = [
    { label: 'All statuses', value: null },
    { label: 'Not started', value: 'NotStarted' },
    { label: 'In progress', value: 'InProgress' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];

  private readonly searchChanged = new Subject<string>();
  private readonly destroyed = new Subject<void>();

  // ── Evaluation dialog ─────────────────────────────────────────────────────
  evalVisible = false;
  evalLoading = false;
  evalSaving = false;
  overview: any = null;
  reviewNote = '';

  constructor(private recruiting: Recuriting, private toast: MessageService) { }

  ngOnInit(): void {
    this.searchChanged
      .pipe(debounceTime(350), takeUntil(this.destroyed))
      .subscribe(() => this.load(1));
    this.load(1);
    document.addEventListener('click', this.closeDropdown);
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
    document.removeEventListener('click', this.closeDropdown);
  }

  private closeDropdown = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter')) this.showFilterDropdown = false;
  };

  load(page = this.page): void {
    this.loading = true;
    this.loadError = '';
    this.page = page;
    this.recruiting
      .listCandidateAssignedTests({
        page,
        pageSize: this.pageSize,
        q: this.search.trim() || undefined,
        status: this.statusFilter ?? undefined,
      })
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: (res) => {
          this.rows = res?.data ?? [];
          this.total = res?.total ?? 0;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load candidate assigned tests', err);
          this.rows = [];
          this.total = 0;
          this.loadError = 'Could not load candidate tests. Please retry.';
          this.loading = false;
        },
      });
  }

  onSearch(value: string): void {
    this.search = value;
    this.searchChanged.next(value);
  }

  selectStatus(option: { label: string; value: string | null }): void {
    this.statusFilter = option.value;
    this.showFilterDropdown = false;
    this.load(1);
  }

  /** p-table is in lazy mode: it reports first/rows, we page the API. */
  onPage(event: TablePageEvent): void {
    this.pageSize = event.rows;
    this.load(Math.floor(event.first / event.rows) + 1);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'NotStarted': return 'Not started';
      case 'InProgress': return 'In progress';
      default: return status || '—';
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'cat-pill cat-done';
      case 'InProgress': return 'cat-pill cat-progress';
      case 'Cancelled': return 'cat-pill cat-cancelled';
      default: return 'cat-pill cat-pending';
    }
  }

  /**
   * Where the paper has got to: marked by whoever knows the subject, then
   * passed or failed by HR. "Awaiting HR decision" is the state that used to
   * be missing, which left marked tests still reading "Awaiting review".
   */
  resultLabel(row: CandidateAssignedTestRow): string {
    if (row.reviewDecision) return row.reviewDecision;
    if (row.status !== 'Completed') return '—';
    return row.evaluatedAt ? 'Awaiting HR decision' : 'Awaiting evaluation';
  }

  resultClass(row: CandidateAssignedTestRow): string {
    if (row.reviewDecision === 'PASS') return 'cat-pill cat-done';
    if (row.reviewDecision === 'FAIL') return 'cat-pill cat-cancelled';
    if (row.status === 'Completed' && row.evaluatedAt) return 'cat-pill cat-progress';
    return 'cat-muted';
  }

  /** Who did what, for the hover on the Result cell. */
  resultTooltip(row: CandidateAssignedTestRow): string {
    const parts: string[] = [];
    if (row.evaluatedByName) parts.push(`Marked by ${row.evaluatedByName}`);
    else if (row.evaluatedAt) parts.push('Marked automatically (no written answers)');
    if (row.reviewedByName) parts.push(`${row.reviewDecision} by ${row.reviewedByName}`);
    return parts.join(' · ');
  }

  /** A deadline that has passed with the test unfinished is the one HR chases. */
  isOverdue(row: CandidateAssignedTestRow): boolean {
    if (!row.deadlineDate) return false;
    if (row.status === 'Completed' || row.status === 'Cancelled') return false;
    return new Date(row.deadlineDate).getTime() < Date.now();
  }

  scoreText(row: CandidateAssignedTestRow): string {
    return row.score === null || row.score === undefined ? '—' : String(row.score);
  }

  // ── Evaluation ────────────────────────────────────────────────────────────

  /** Only a submitted attempt has anything to read. */
  canEvaluate(row: CandidateAssignedTestRow): boolean {
    return row.status === 'Completed' || row.status === 'InProgress';
  }

  openEvaluation(row: CandidateAssignedTestRow): void {
    this.evalVisible = true;
    this.evalLoading = true;
    this.overview = null;
    this.reviewNote = '';
    this.recruiting
      .getCandidateTestOverview(row.id)
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: (data) => {
          this.overview = data;
          this.reviewNote = data?.reviewNote || '';
          this.evalLoading = false;
        },
        error: (err) => {
          console.error('Failed to load candidate test overview', err);
          this.evalLoading = false;
          this.evalVisible = false;
          this.toast.add({
            severity: 'error',
            summary: 'Error',
            // A 403 here is a real answer: this viewer isn't HR, the department
            // head, or on the panel.
            detail: err?.error?.error || 'Could not load the submission.',
          });
        },
      });
  }

  descriptiveRows(): any[] {
    return (this.overview?.rows || []).filter((r: any) => r.type !== 'MCQ');
  }

  /** The evaluator must give a mark between 0 and the question's weight. */
  invalidMark(row: any): boolean {
    if (row.manualScore === null || row.manualScore === undefined || row.manualScore === '') return false;
    const n = Number(row.manualScore);
    return !Number.isFinite(n) || n < 0 || n > (row.weight ?? 1);
  }

  saveEvaluation(): void {
    const rows = this.descriptiveRows();
    const scored = rows.filter(
      (r) => r.manualScore !== null && r.manualScore !== undefined && r.manualScore !== ''
    );

    if (!scored.length) {
      this.toast.add({
        severity: 'warn',
        summary: 'No marks entered',
        detail: 'Enter a mark for at least one descriptive answer.',
      });
      return;
    }
    if (scored.some((r) => this.invalidMark(r))) {
      this.toast.add({
        severity: 'warn',
        summary: 'Check the marks',
        detail: 'Each mark must be between 0 and the question weight.',
      });
      return;
    }

    this.evalSaving = true;
    this.recruiting
      .evaluateCandidateTest(
        this.overview.assignedId,
        scored.map((r) => ({
          questionId: r.questionId,
          manualScore: Number(r.manualScore),
          remarks: r.remarks || '',
        }))
      )
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: (res) => {
          this.evalSaving = false;
          this.evalVisible = false;
          this.toast.add({
            severity: 'success',
            summary: 'Evaluation saved',
            detail: `Score is now ${res?.score ?? '—'}% (${res?.earned ?? '?'} of ${res?.totalWeight ?? '?'} marks).`,
          });
          this.load(this.page); // the recomputed score belongs in the list
        },
        error: (err) => {
          console.error('Failed to save evaluation', err);
          this.evalSaving = false;
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save the evaluation.' });
        },
      });
  }

  /** HR's PASS / FAIL. Managers never see the control — the API refuses them too. */
  decide(decision: 'PASS' | 'FAIL'): void {
    if (!this.overview?.viewer?.canDecide) return;
    this.evalSaving = true;
    this.recruiting
      .reviewCandidateTest(this.overview.applicationId, this.overview.assignedId, {
        decision,
        note: this.reviewNote?.trim() || undefined,
      })
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: () => {
          this.evalSaving = false;
          this.evalVisible = false;
          this.toast.add({ severity: 'success', summary: 'Decision saved', detail: `Marked ${decision}.` });
          this.load(this.page);
        },
        error: (err) => {
          console.error('Failed to save the decision', err);
          this.evalSaving = false;
          this.toast.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.error || 'Could not save the decision.',
          });
        },
      });
  }

  /** Marks still outstanding — HR shouldn't decide on a half-marked paper. */
  get marksOutstanding(): boolean {
    return (this.overview?.totals?.pendingManual ?? 0) > 0;
  }

  fmtDuration(seconds?: number | null): string {
    if (seconds === null || seconds === undefined) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m ? `${m}m ${s}s` : `${s}s`;
  }
}
