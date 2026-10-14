import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Employees } from '../../services/employees/employees';
import {
  ProbationService,
  ProbationCategory,
  ProbationOutcome,
  ProbationRating,
} from '../../services/probation/probation.service';

/**
 * One component serves both halves of the workflow: the manager fills it in,
 * and HR reads exactly the same rendered form before deciding. Splitting them
 * would mean maintaining two renderings of the same document.
 */
@Component({
  selector: 'app-probation-evaluation-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, ToastModule, TextareaModule, RadioButtonModule,
    TooltipModule, DividerModule, ConfirmDialogModule, DatePickerModule, SelectModule,
  ],
  templateUrl: './probation-evaluation-form.html',
  styleUrl: './probation-evaluation-form.css',
  providers: [MessageService, ConfirmationService],
})
export class ProbationEvaluationForm implements OnInit {
  @Input() evaluationId: number | null = null;
  /**
   * Capture mode: HR is transcribing a decision already signed on paper, so the
   * manager's section, HR's decision and both paper dates are filled in one
   * pass and nobody is notified.
   */
  @Input() captureMode = false;
  /**
   * The due-list row being captured when no evaluation exists yet (pre-cutoff
   * backlog). Ignored when `evaluationId` is set.
   */
  @Input() captureFor: any = null;
  /** Emits true when something was saved, so the list knows to reload. */
  @Output() closed = new EventEmitter<boolean>();

  loading = true;
  saving = false;

  data: any = null;
  categories: ProbationCategory[] = [];
  ratingOptions: { code: ProbationRating; label: string }[] = [];
  extensionMonths = 3;

  // ── Manager form ──────────────────────────────────────────────────────────
  ratings: Record<string, ProbationRating> = {};
  strongPoints = '';
  improvementPoints = '';
  employeeComments = '';
  recommendation: ProbationOutcome | null = null;
  managerComments = '';

  // ── HR form ───────────────────────────────────────────────────────────────
  hrDecision: ProbationOutcome | null = null;
  hrComments = '';

  // ── Capture mode (paper transcription) ────────────────────────────────────
  /** Date the manager signed the paper form. */
  paperEvaluationDate: Date | null = null;
  /** Date HR approved it on paper; blank falls back to the manager's date. */
  paperHrDecidedAt: Date | null = null;
  /** No future dates — this is a historical record. */
  readonly today = new Date();
  /**
   * Who actually signed the paper form. Defaults to the employee's current
   * reporting manager, but must be overridable: on an old record the signatory
   * has often since left or moved, and the PDF's "Supervisor Name" would
   * otherwise name someone who never signed it.
   */
  signedByManagerId: number | null = null;
  managerOptions: { label: string; value: number }[] = [];

  readonly outcomes: { code: ProbationOutcome; label: string; hint: string }[] = [
    { code: 'CONFIRM', label: 'Confirm Probation', hint: 'Successfully completed; recommended for confirmation.' },
    { code: 'EXTEND', label: 'Extend Probation', hint: 'Extended by 3 months from the evaluation date.' },
    { code: 'TERMINATE', label: 'Do Not Confirm / Terminate', hint: 'Found unsuitable for the role.' },
    { code: 'DEPARTMENT_TRANSFER', label: 'Department Transfer', hint: 'Recommend moving to another department.' },
  ];

  constructor(
    private probation: ProbationService,
    private employees: Employees,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  /** Only needed in capture mode — the normal workflow never reassigns here. */
  private loadManagerOptions() {
    this.employees.getActiveEmployees().subscribe({
      next: (list) => {
        this.managerOptions = (list || [])
          .map((e: any) => ({
            label: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() +
              (e.employeeCode ? ` (${e.employeeCode})` : ''),
            value: e.id,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
      },
      error: () => {
        // Non-fatal: the capture can still be saved against the default manager.
      },
    });
  }

  ngOnInit(): void {
    this.probation.getFormMeta().subscribe({
      next: (meta) => {
        this.categories = meta.categories;
        this.ratingOptions = meta.ratings;
        this.extensionMonths = meta.extensionMonths;
        this.outcomes[1].hint = `Extended by ${meta.extensionMonths} months from the evaluation date.`;
      },
      error: () => {
        // Non-fatal: the evaluation itself carries the categories too.
      },
    });
    if (this.captureMode) this.loadManagerOptions();

    if (this.evaluationId) {
      this.reload();
    } else {
      // Pre-cutoff backlog: no round exists, so the form starts blank and the
      // employee details come from the due-list row.
      this.data = {
        employeeName: this.captureFor?.employeeName,
        employee: {
          employeeCode: this.captureFor?.employeeCode,
          dateOfJoining: this.captureFor?.dateOfJoining,
          Department: { name: this.captureFor?.departmentName },
          designation: { name: this.captureFor?.designationName },
        },
        managerName: this.captureFor?.managerName,
        dueDate: this.captureFor?.dueDate,
        round: 1,
        status: 'PENDING_MANAGER',
        canEdit: true,
        previousRounds: [],
      };
      this.signedByManagerId = this.captureFor?.managerId ?? null;
      this.loading = false;
    }
  }

  reload() {
    this.loading = true;
    this.probation.getEvaluation(this.evaluationId!).subscribe({
      next: (d) => {
        this.data = d;
        if (!this.categories.length) this.categories = d.categories ?? [];
        this.ratings = { ...(d.ratings ?? {}) };
        this.strongPoints = d.strongPoints ?? '';
        this.improvementPoints = d.improvementPoints ?? '';
        this.employeeComments = d.employeeComments ?? '';
        this.recommendation = d.managerRecommendation ?? null;
        this.managerComments = d.managerComments ?? '';
        this.hrDecision = d.hrDecision ?? null;
        this.hrComments = d.hrComments ?? '';
        this.signedByManagerId = d.managerId ?? null;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.error || 'Could not load the evaluation',
        });
      },
    });
  }

  // In capture mode HR fills every section, so the server's per-role flags
  // (which describe the normal two-step workflow) don't apply.
  get canEdit(): boolean { return this.captureMode || !!this.data?.canEdit; }
  get canDecide(): boolean { return this.captureMode || !!this.data?.canDecide; }
  get isCompleted(): boolean { return !this.captureMode && this.data?.status === 'COMPLETED'; }

  /** Everything the capture form needs before it can be saved. */
  get captureValid(): boolean {
    return (
      this.managerFormValid &&
      !!this.hrDecision &&
      !!this.hrComments.trim() &&
      !!this.paperEvaluationDate &&
      !(this.paperHrDecidedAt && this.paperHrDecidedAt < this.paperEvaluationDate)
    );
  }

  /** The one ordering mistake that's easy to make and easy to catch. */
  get hrDateBeforeManagerDate(): boolean {
    return !!this.paperHrDecidedAt && !!this.paperEvaluationDate &&
      this.paperHrDecidedAt < this.paperEvaluationDate;
  }

  get unratedCount(): number {
    return this.categories.filter((c) => !this.ratings[c.code]).length;
  }

  /** Mirrors the server's rule so the button state matches what will be accepted. */
  get managerFormValid(): boolean {
    if (this.unratedCount > 0) return false;
    if (!this.strongPoints.trim() || !this.improvementPoints.trim()) return false;
    if (!this.recommendation) return false;
    if (this.recommendation !== 'CONFIRM' && !this.managerComments.trim()) return false;
    return true;
  }

  get managerCommentsRequired(): boolean {
    return !!this.recommendation && this.recommendation !== 'CONFIRM';
  }

  /** HR choosing something other than what the manager recommended. */
  get hrDisagrees(): boolean {
    return (
      !!this.hrDecision &&
      !!this.data?.managerRecommendation &&
      this.hrDecision !== this.data.managerRecommendation
    );
  }

  outcomeLabel(code: string | null): string {
    return this.outcomes.find((o) => o.code === code)?.label ?? '—';
  }

  ratingLabel(code: string | undefined): string {
    return this.ratingOptions.find((r) => r.code === code)?.label ?? '—';
  }

  submitManager() {
    if (!this.managerFormValid || this.saving) return;

    this.confirmationService.confirm({
      header: 'Submit evaluation',
      message:
        `This will be sent to HR for the final decision and cannot be edited afterwards. ` +
        `Your recommendation: ${this.outcomeLabel(this.recommendation)}.`,
      acceptLabel: 'Submit',
      rejectLabel: 'Review again',
      accept: () => {
        this.saving = true;
        this.probation
          .submitManagerEvaluation(this.evaluationId!, {
            ratings: this.ratings,
            strongPoints: this.strongPoints.trim(),
            improvementPoints: this.improvementPoints.trim(),
            recommendation: this.recommendation!,
            managerComments: this.managerComments.trim(),
            employeeComments: this.employeeComments.trim(),
          })
          .subscribe({
            next: () => {
              this.saving = false;
              this.messageService.add({
                severity: 'success',
                summary: 'Submitted',
                detail: 'The evaluation has been sent to HR for review.',
              });
              this.closed.emit(true);
            },
            error: (err) => this.fail(err, 'Could not submit the evaluation'),
          });
      },
    });
  }

  submitHr() {
    if (!this.hrDecision || !this.hrComments.trim() || this.saving) return;

    const disagreeNote = this.hrDisagrees
      ? ` This differs from the manager's recommendation to ${this.outcomeLabel(this.data.managerRecommendation)}, and will be recorded as such on the PDF.`
      : '';

    this.confirmationService.confirm({
      header: 'Confirm final decision',
      message:
        `Final decision: ${this.outcomeLabel(this.hrDecision)}.${disagreeNote}` +
        (this.hrDecision === 'TERMINATE'
          ? ' This will terminate the employee and revoke their system access.'
          : this.hrDecision === 'CONFIRM'
            ? ' The employee will be marked permanent.'
            : ''),
      acceptLabel: 'Confirm decision',
      rejectLabel: 'Cancel',
      accept: () => {
        this.saving = true;
        this.probation.submitHrDecision(this.evaluationId!, this.hrDecision!, this.hrComments.trim()).subscribe({
          next: () => {
            this.saving = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Decision recorded',
              detail: 'The probation decision has been applied.',
            });
            this.closed.emit(true);
          },
          error: (err) => this.fail(err, 'Could not record the decision'),
        });
      },
    });
  }

  submitCapture() {
    if (!this.captureValid || this.saving) return;

    const iso = (d: Date | null) => (d ? new Date(d).toISOString() : undefined);

    this.confirmationService.confirm({
      header: 'Record paper decision',
      message:
        `This records a decision already taken on paper — it applies the outcome to the employee's ` +
        `record immediately and notifies nobody. Final decision: ${this.outcomeLabel(this.hrDecision)}.` +
        (this.hrDecision === 'TERMINATE'
          ? ' This will terminate the employee and revoke their system access.'
          : this.hrDecision === 'CONFIRM'
            ? ' The employee will be marked permanent.'
            : ''),
      acceptLabel: 'Record it',
      rejectLabel: 'Cancel',
      accept: () => {
        this.saving = true;
        this.probation
          .captureOffline({
            ...(this.evaluationId ? { evaluationId: this.evaluationId } : {}),
            ...(this.captureFor?.employeeId ? { employeeId: this.captureFor.employeeId } : {}),
            managerId: this.signedByManagerId,
            ratings: this.ratings,
            strongPoints: this.strongPoints.trim(),
            improvementPoints: this.improvementPoints.trim(),
            recommendation: this.recommendation!,
            managerComments: this.managerComments.trim(),
            employeeComments: this.employeeComments.trim(),
            decision: this.hrDecision!,
            hrComments: this.hrComments.trim(),
            evaluationDate: iso(this.paperEvaluationDate)!,
            hrDecidedAt: iso(this.paperHrDecidedAt),
          })
          .subscribe({
            next: () => {
              this.saving = false;
              this.messageService.add({
                severity: 'success',
                summary: 'Recorded',
                detail: 'The signed paper evaluation has been recorded and the outcome applied.',
              });
              this.closed.emit(true);
            },
            error: (err) => this.fail(err, 'Could not record the paper evaluation'),
          });
      },
    });
  }

  downloadPdf() {
    this.probation.downloadPdf(this.evaluationId!).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `probation-evaluation-${this.data?.employee?.employeeCode ?? this.evaluationId}-round${this.data?.round ?? 1}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => this.fail(err, 'Could not download the PDF'),
    });
  }

  private fail(err: any, fallback: string) {
    this.saving = false;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: err?.error?.error || fallback,
    });
  }

  close() {
    this.closed.emit(false);
  }
}
