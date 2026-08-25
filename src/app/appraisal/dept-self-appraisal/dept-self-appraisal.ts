import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PerformanceService } from '../../services/performances/performance-service';
import { ModuleGuide } from '../../shared/module-guide/module-guide';

/**
 * Self-appraisal for the Dept Performance Indicator — the executive's own
 * assessment, while their in-charge and supervisor score the indicator itself.
 *
 * Deliberately mirrors the managerial self-appraisal's shape (questions grouped
 * by section, 1–5 rating plus comments, then the four free-text blocks) because
 * it asks the same questions from the same master. What differs is only where it
 * is stored and how it is gated.
 */
@Component({
  selector: 'app-dept-self-appraisal',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, InputTextModule,
    TextareaModule, TableModule, ToastModule, DialogModule, TooltipModule, ModuleGuide,
  ],
  providers: [MessageService],
  templateUrl: './dept-self-appraisal.html',
  styleUrl: './dept-self-appraisal.css',
})
export class DeptSelfAppraisal implements OnInit {
  loggedEmpId = Number(localStorage.getItem('empId')) || 0;

  loadingCycles = true;
  /** One entry per assigned (cycle, period). */
  cycles: Array<{
    cycle: string; period: string; periodLabel: string;
    milestoneDate: string | null; open: boolean; submitted: boolean;
    submittedAt: string | null; started: boolean; lastSaved: string | null;
  }> = [];

  /** Managerial appraisals the same person holds. Their self-appraisal for
   *  those belongs to the managerial module — shown here only so nobody fills
   *  two by mistake. */
  managerialAppraisals: Array<{ id: number; cycle: string; status: string; submitted: boolean }> = [];
  hasBoth = false;

  /** The (cycle, period) whose form is open in the dialog. */
  activeCycle: string | null = null;
  activePeriod: string | null = null;
  activePeriodLabel = '';
  /** The questionnaire lives in a dialog, as the managerial one does — an
   *  inline form on the Individual page made it scroll a long way. */
  formDialogVisible = false;
  loadingForm = false;
  saving = false;

  employee: any = null;
  canEdit = false;
  readOnly = false;
  submittedAt: string | null = null;
  selfAppraisalId: number | null = null;

  groupedQuestions: Array<{ section: string; questions: any[] }> = [];
  answers: Array<{ questionId: number; text: string; rating: number | null; comments: string }> = [];
  readonly ratingScale = [1, 2, 3, 4, 5];

  achievements = '';
  goalsObjective = '';
  challenges = '';
  trainingNeeds = '';

  constructor(
    private performanceService: PerformanceService,
    private messageService: MessageService,
  ) {}

  ngOnInit() {
    this.loadCycles();
  }

  loadCycles() {
    this.loadingCycles = true;
    this.performanceService.getSelfAppraisalCycles().subscribe({
      next: (res) => {
        this.cycles = res.cycles || [];
        this.managerialAppraisals = res.managerialAppraisals || [];
        this.hasBoth = !!res.hasBoth;
        this.loadingCycles = false;
      },
      error: (err) => {
        this.loadingCycles = false;
        this.cycles = [];
        this.managerialAppraisals = [];
        this.hasBoth = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.error || 'Could not load your appraisal cycles.',
        });
      },
    });
  }

  statusLabel(c: { submitted: boolean; started: boolean; open: boolean }): string {
    if (c.submitted) return 'Submitted';
    if (c.started) return 'Draft';
    return c.open ? 'Not Started' : 'Not Open';
  }

  statusClass(c: { submitted: boolean; started: boolean; open: boolean }): string {
    if (c.submitted) return 'st-submitted';
    if (c.started) return 'st-draft';
    return c.open ? 'st-pending' : 'st-locked';
  }

  open(c: { cycle: string; period: string; periodLabel: string }) {
    this.activeCycle = c.cycle;
    this.activePeriod = c.period;
    this.activePeriodLabel = c.periodLabel;
    this.formDialogVisible = true;
    this.loadingForm = true;
    this.resetForm();

    this.performanceService.getSelfAppraisal(c.cycle, c.period).subscribe({
      next: (res) => {
        this.loadingForm = false;
        this.employee = res.employee;
        this.canEdit = res.canEdit;
        this.readOnly = res.readOnly;
        this.submittedAt = res.selfAppraisal?.submittedAt ?? null;
        this.selfAppraisalId = res.selfAppraisal?.id ?? null;

        this.achievements = res.selfAppraisal?.achievements ?? '';
        this.goalsObjective = res.selfAppraisal?.goalsObjective ?? '';
        this.challenges = res.selfAppraisal?.challenges ?? '';
        this.trainingNeeds = res.selfAppraisal?.trainingNeeds ?? '';

        // Group by section, as the managerial form does.
        const sections = new Map<string, any[]>();
        for (const q of res.questions || []) {
          const key = q.section || 'General';
          if (!sections.has(key)) sections.set(key, []);
          sections.get(key)!.push(q);
        }
        this.groupedQuestions = [...sections.entries()].map(([section, questions]) => ({ section, questions }));

        this.answers = (res.questions || []).map((q) => {
          const saved = (res.answers || []).find((a) => a.questionId === q.id);
          return {
            questionId: q.id,
            text: q.text,
            rating: saved?.rating ?? null,
            comments: saved?.comments ?? '',
          };
        });
      },
      error: (err) => {
        this.loadingForm = false;
        this.activeCycle = null;
        this.activePeriod = null;
        this.formDialogVisible = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Cannot open',
          detail: err?.error?.error || 'Could not load the self-appraisal.',
        });
      },
    });
  }

  /** Also runs when the dialog is dismissed via its close button. */
  closeForm() {
    this.formDialogVisible = false;
    this.activeCycle = null;
    this.activePeriod = null;
    this.activePeriodLabel = '';
    this.resetForm();
    this.loadCycles();
  }

  private resetForm() {
    this.groupedQuestions = [];
    this.answers = [];
    this.achievements = '';
    this.goalsObjective = '';
    this.challenges = '';
    this.trainingNeeds = '';
    this.submittedAt = null;
    this.selfAppraisalId = null;
    this.canEdit = false;
    this.readOnly = false;
  }

  answerFor(questionId: number) {
    return this.answers.find(a => a.questionId === questionId);
  }

  setRating(questionId: number, value: number) {
    if (!this.canEdit) return;
    const a = this.answerFor(questionId);
    if (a) a.rating = a.rating === value ? null : value;
  }

  get answeredCount(): number {
    return this.answers.filter(a => a.rating != null).length;
  }

  save(isDraft: boolean) {
    if (!this.activeCycle || !this.activePeriod || !this.canEdit) return;

    // Submitting locks the record, so require a complete set first. Drafts save
    // whatever is there.
    if (!isDraft && this.answeredCount < this.answers.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Incomplete',
        detail: `Rate all ${this.answers.length} questions before submitting — ${this.answeredCount} done.`,
      });
      return;
    }

    this.saving = true;
    this.performanceService.saveSelfAppraisal({
      cycle: this.activeCycle,
      period: this.activePeriod,
      answers: this.answers.map(a => ({
        questionId: a.questionId,
        rating: a.rating,
        comments: a.comments,
      })),
      achievements: this.achievements,
      goalsObjective: this.goalsObjective,
      challenges: this.challenges,
      trainingNeeds: this.trainingNeeds,
      isDraft,
    }).subscribe({
      next: (res) => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: isDraft ? 'Saved' : 'Submitted',
          detail: res?.message || (isDraft ? 'Draft saved.' : 'Self-appraisal submitted.'),
        });
        if (isDraft) {
          this.selfAppraisalId = res?.id ?? this.selfAppraisalId;
          this.loadCycles();
        } else {
          this.closeForm();
        }
      },
      error: (err) => {
        this.saving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Could not save',
          detail: err?.error?.error || 'Failed to save your self-appraisal.',
        });
      },
    });
  }
}
