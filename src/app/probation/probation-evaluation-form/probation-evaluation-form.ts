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
import { ConfirmationService, MessageService } from 'primeng/api';
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
    TooltipModule, DividerModule, ConfirmDialogModule,
  ],
  templateUrl: './probation-evaluation-form.html',
  styleUrl: './probation-evaluation-form.css',
  providers: [MessageService, ConfirmationService],
})
export class ProbationEvaluationForm implements OnInit {
  @Input({ required: true }) evaluationId!: number;
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

  readonly outcomes: { code: ProbationOutcome; label: string; hint: string }[] = [
    { code: 'CONFIRM', label: 'Confirm Probation', hint: 'Successfully completed; recommended for confirmation.' },
    { code: 'EXTEND', label: 'Extend Probation', hint: 'Extended by 3 months from the evaluation date.' },
    { code: 'TERMINATE', label: 'Do Not Confirm / Terminate', hint: 'Found unsuitable for the role.' },
    { code: 'DEPARTMENT_TRANSFER', label: 'Department Transfer', hint: 'Recommend moving to another department.' },
  ];

  constructor(
    private probation: ProbationService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

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
    this.reload();
  }

  reload() {
    this.loading = true;
    this.probation.getEvaluation(this.evaluationId).subscribe({
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

  get canEdit(): boolean { return !!this.data?.canEdit; }
  get canDecide(): boolean { return !!this.data?.canDecide; }
  get isCompleted(): boolean { return this.data?.status === 'COMPLETED'; }

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
          .submitManagerEvaluation(this.evaluationId, {
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
        this.probation.submitHrDecision(this.evaluationId, this.hrDecision!, this.hrComments.trim()).subscribe({
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

  downloadPdf() {
    this.probation.downloadPdf(this.evaluationId).subscribe({
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
