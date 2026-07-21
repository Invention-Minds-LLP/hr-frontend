import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { Appraisal } from '../../services/appraisal/appraisal';

type ReviewLevel = 'INCHARGE' | 'MANAGER' | 'MANAGEMENT';

interface QuestionVM {
  id: number;
  title: string;
  description: string | null;
  prompts: string[];
  aboveAverage: string | null;
  average: string | null;
  belowAverage: string | null;
  rating: number | null;
  comments: string;
}

/**
 * Dynamic review form used for all three reviewer levels (In-charge, Manager,
 * Management). Questions come from the AppraisalReviewQuestion master table;
 * existing draft answers are loaded from AppraisalForm.reviewAnswers filtered
 * by `level`.
 */
@Component({
  selector: 'app-appraisal-review-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    InputNumberModule, InputTextModule, TextareaModule, ButtonModule,
    TooltipModule, ToastModule, SkeletonModule,
  ],
  providers: [MessageService],
  templateUrl: './appraisal-review-form.html',
  styleUrl: './appraisal-review-form.css',
})
export class AppraisalReviewForm implements OnInit, OnChanges {
  @Input() appraisalId!: number;
  @Input() level: ReviewLevel = 'MANAGER';
  /** Selected appraisal — used for the header (employee name, cycle, etc.). */
  @Input() selectedAppraisal: any = null;
  @Input() readOnly = false;

  @Output() submitted = new EventEmitter<void>();
  @Output() backToList = new EventEmitter<void>();

  loading = true;
  saving = false;
  questions: QuestionVM[] = [];

  // Overall fields (manager/management additionally submit these on the legacy path).
  overallScore: number | null = null;
  overallComments = '';
  recommendations = '';
  finalDecision = '';
  finalComments = '';

  constructor(
    private appraisalService: Appraisal,
    private messageService: MessageService,
  ) {}

  ngOnInit() {
    if (this.appraisalId && this.level) this.loadAll();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['appraisalId'] || changes['level']) {
      if (this.appraisalId && this.level) this.loadAll();
    }
  }

  get levelLabel(): string {
    return this.level === 'INCHARGE' ? 'In-charge'
      : this.level === 'MANAGER' ? 'Manager'
      : 'Management';
  }

  private viewerRoleForLoad(): string {
    return this.level === 'INCHARGE' ? 'INCHARGE'
      : this.level === 'MANAGER' ? 'MANAGER'
      : 'MANAGEMENT';
  }

  /** Fetch questions for this level + any existing answers for resume-from-draft. */
  loadAll() {
    this.loading = true;
    const detail$ = this.appraisalService.getAppraisalDetail(this.appraisalId, this.viewerRoleForLoad());
    const questions$ = this.appraisalService.listReviewQuestions({ level: this.level, appraisalId: this.appraisalId });

    let detail: any = null;
    let questions: any[] = [];
    let done = 0;

    const finish = () => {
      if (++done < 2) return;
      const answersByQ = new Map<number, { rating: number | null; comments: string }>();
      const existing = (detail?.reviewAnswers || []).filter((a: any) => a.level === this.level);
      for (const a of existing) {
        answersByQ.set(a.questionId, {
          rating: a.rating ?? null,
          comments: a.comments ?? '',
        });
      }

      this.questions = (questions || []).map((q: any) => {
        const a = answersByQ.get(q.id);
        return {
          id: q.id,
          title: q.title,
          description: q.description,
          prompts: Array.isArray(q.prompts) ? q.prompts : [],
          aboveAverage: q.aboveAverage,
          average: q.average,
          belowAverage: q.belowAverage,
          rating: a?.rating ?? null,
          comments: a?.comments ?? '',
        };
      });

      // Manager/Management additional fields from the legacy column tables;
      // In-charge supplementary summary from the new AppraisalForm columns.
      if (this.level === 'MANAGER' && detail?.managerReview) {
        this.overallScore = detail.managerReview.overallScore ?? null;
        this.overallComments = detail.managerReview.comments ?? '';
        this.recommendations = detail.managerReview.recommendations ?? '';
      } else if (this.level === 'MANAGEMENT' && detail?.managementReview) {
        this.overallScore = detail.managementReview.overallScore ?? null;
        this.overallComments = detail.managementReview.comments ?? '';
        this.recommendations = detail.managementReview.recommendations ?? '';
      } else if (this.level === 'INCHARGE' && detail) {
        this.overallScore = detail.inchargeOverallScore ?? null;
        this.overallComments = detail.inchargeOverallComments ?? '';
      }
      if (this.level === 'MANAGER' && detail) {
        this.finalDecision = detail.finalDecision ?? '';
        this.finalComments = detail.finalComments ?? '';
      }

      // Initial auto-calculation of overall score from loaded ratings.
      this.recomputeOverall();
      this.loading = false;
    };

    detail$.subscribe({
      next: (d) => { detail = d; finish(); },
      error: () => { detail = null; finish(); },
    });
    questions$.subscribe({
      next: (q) => { questions = q || []; finish(); },
      error: () => { questions = []; finish(); },
    });
  }

  /** Total number of questions on this form. */
  get ratedDenom(): number { return this.questions.length; }

  /** Count of questions with a non-null rating. */
  get ratedCount(): number {
    return this.questions.filter(q => q.rating != null && !isNaN(q.rating as any)).length;
  }

  /** Recompute the overall score as the simple mean of the rated questions,
   *  rounded to 1 decimal. Called whenever a per-question rating changes. */
  recomputeOverall() {
    const rated = this.questions
      .map(q => q.rating)
      .filter((r): r is number => r != null && !isNaN(r as any));
    if (!rated.length) {
      this.overallScore = null;
      return;
    }
    const mean = rated.reduce((s, r) => s + r, 0) / rated.length;
    this.overallScore = Math.round(mean * 10) / 10;
  }

  private buildAnswersPayload() {
    return this.questions.map((q) => ({
      questionId: q.id,
      rating: q.rating,
      comments: (q.comments || '').trim() || null,
    }));
  }

  /** Submit (or save draft). Validation: when not draft, every question needs a rating. */
  save(isDraft: boolean) {
    if (this.readOnly) return;

    // In-charge & Manager must rate every question before submitting. Management
    // has no mandatory fields — it can submit without rating all questions.
    if (!isDraft && this.level !== 'MANAGEMENT') {
      const missing = this.questions.filter((q) => q.rating == null || isNaN(q.rating as any));
      if (missing.length) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Missing ratings',
          detail: `Please rate all ${this.questions.length} questions before submitting.`,
        });
        return;
      }
    }

    const answers = this.buildAnswersPayload();
    const commonPayload: any = {
      answers,
      isDraft,
      overallScore: this.overallScore,
      comments: this.overallComments || null,
      recommendations: this.recommendations || null,
    };
    if (this.level === 'MANAGER') {
      commonPayload.finalDecision = this.finalDecision || null;
      commonPayload.finalComments = this.finalComments || null;
    }

    this.saving = true;
    const obs =
      this.level === 'INCHARGE'
        ? this.appraisalService.submitInchargeAppraisal(this.appraisalId, {
            answers,
            isDraft,
            overallScore: this.overallScore,
            comments: this.overallComments || null,
          } as any)
        : this.level === 'MANAGER'
          ? this.appraisalService.submitManagerAppraisalV2(this.appraisalId, commonPayload)
          : this.appraisalService.submitManagementAppraisal(this.appraisalId, commonPayload);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: isDraft ? 'Saved' : 'Submitted',
          detail: isDraft ? 'Draft saved.' : `${this.levelLabel} review submitted.`,
        });
        if (!isDraft) this.submitted.emit();
      },
      error: (e: any) => {
        this.saving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.error?.error || 'Submission failed',
        });
      },
    });
  }

  onBack() {
    this.backToList.emit();
  }
}
