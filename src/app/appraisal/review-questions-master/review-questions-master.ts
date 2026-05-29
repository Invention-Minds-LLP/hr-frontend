import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Appraisal } from '../../services/appraisal/appraisal';

type ReviewLevel = 'INCHARGE' | 'MANAGER' | 'MANAGEMENT';

interface ReviewQuestion {
  id?: number;
  title: string;
  description: string | null;
  prompts: string[] | null;
  aboveAverage: string | null;
  average: string | null;
  belowAverage: string | null;
  category: string | null;
  section: string | null;
  levels: ReviewLevel[];
  displayOrder: number;
  isActive: boolean;
}

@Component({
  selector: 'app-review-questions-master',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, DialogModule, ButtonModule, InputTextModule, TextareaModule,
    InputNumberModule, ToggleSwitchModule, MultiSelectModule, TooltipModule,
    ToastModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './review-questions-master.html',
  styleUrl: './review-questions-master.css',
})
export class ReviewQuestionsMaster implements OnInit {

  loading = true;
  saving = false;
  questions: ReviewQuestion[] = [];

  // Dialog state
  dialogVisible = false;
  editingId: number | null = null;
  form: ReviewQuestion = this.emptyForm();
  promptsText = ''; // one prompt per line; split on \n at save time

  // "Applies to" — same questions for all by default, but HR can scope per level.
  readonly levelOptions: { label: string; value: ReviewLevel }[] = [
    { label: 'In-charge', value: 'INCHARGE' },
    { label: 'Manager',   value: 'MANAGER' },
    { label: 'Management', value: 'MANAGEMENT' },
  ];

  constructor(
    private appraisalService: Appraisal,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.appraisalService.listReviewQuestions({ includeInactive: true }).subscribe({
      next: (rows: any[]) => {
        this.questions = (rows || []).map((r) => ({
          ...r,
          levels: this.normaliseLevels(r.levels),
          prompts: Array.isArray(r.prompts) ? r.prompts : (r.prompts ? [String(r.prompts)] : []),
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load questions' });
      },
    });
  }

  private normaliseLevels(raw: any): ReviewLevel[] {
    if (Array.isArray(raw)) {
      const allowed = new Set(['INCHARGE', 'MANAGER', 'MANAGEMENT']);
      return raw.filter((x: any) => allowed.has(x)) as ReviewLevel[];
    }
    return ['INCHARGE', 'MANAGER', 'MANAGEMENT'];
  }

  // ── Dialog open/close ────────────────────────────────────────────
  openAdd() {
    this.editingId = null;
    this.form = this.emptyForm();
    this.promptsText = '';
    this.dialogVisible = true;
  }

  openEdit(q: ReviewQuestion) {
    this.editingId = q.id ?? null;
    this.form = { ...q, levels: [...q.levels] };
    this.promptsText = (q.prompts || []).join('\n');
    this.dialogVisible = true;
  }

  closeDialog() {
    this.dialogVisible = false;
  }

  private emptyForm(): ReviewQuestion {
    return {
      title: '',
      description: '',
      prompts: [],
      aboveAverage: '',
      average: '',
      belowAverage: '',
      category: null,
      section: null,
      levels: ['INCHARGE', 'MANAGER', 'MANAGEMENT'],
      displayOrder: (this.questions[this.questions.length - 1]?.displayOrder ?? 0) + 1,
      isActive: true,
    };
  }

  // ── Save ─────────────────────────────────────────────────────────
  save() {
    if (!this.form.title || !this.form.title.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Title required', detail: 'Please enter a title.' });
      return;
    }
    if (!this.form.levels || this.form.levels.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Select levels', detail: 'Pick at least one reviewer level.' });
      return;
    }

    const promptsArr = (this.promptsText || '')
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload = {
      title: this.form.title.trim(),
      description: this.form.description || null,
      prompts: promptsArr,
      aboveAverage: this.form.aboveAverage || null,
      average: this.form.average || null,
      belowAverage: this.form.belowAverage || null,
      category: this.form.category || null,
      section: this.form.section || null,
      levels: this.form.levels,
      displayOrder: this.form.displayOrder,
      isActive: this.form.isActive,
    };

    this.saving = true;
    const obs = this.editingId
      ? this.appraisalService.updateReviewQuestion(this.editingId, payload)
      : this.appraisalService.createReviewQuestion(payload);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.dialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: this.editingId ? 'Updated' : 'Created',
          detail: this.editingId ? 'Question updated.' : 'Question created.',
        });
        this.load();
      },
      error: (e: any) => {
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.error?.error || 'Save failed' });
      },
    });
  }

  // ── Toggle active ────────────────────────────────────────────────
  toggleActive(q: ReviewQuestion) {
    if (!q.id) return;
    this.appraisalService.toggleReviewQuestion(q.id).subscribe({
      next: () => {
        q.isActive = !q.isActive;
        this.messageService.add({ severity: 'success', summary: 'Updated', detail: `Question ${q.isActive ? 'activated' : 'deactivated'}.` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Toggle failed' });
      },
    });
  }

  // ── Delete (soft-deactivates if answers reference it) ────────────
  remove(q: ReviewQuestion) {
    if (!q.id) return;
    this.confirmationService.confirm({
      message: `Delete "${q.title}"? If any submitted reviews reference it, the question will be deactivated instead.`,
      header: 'Delete question',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.appraisalService.deleteReviewQuestion(q.id!).subscribe({
          next: (res: any) => {
            this.messageService.add({
              severity: 'success',
              summary: res?.deactivated ? 'Deactivated' : 'Deleted',
              detail: res?.deactivated
                ? 'Question kept (referenced by existing reviews); now deactivated.'
                : 'Question deleted.',
            });
            this.load();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed' });
          },
        });
      },
    });
  }

  // ── Helpers for template ─────────────────────────────────────────
  levelChipLabel(level: ReviewLevel): string {
    return level === 'INCHARGE' ? 'In-charge' : level === 'MANAGER' ? 'Manager' : 'Management';
  }
  appliesToAll(q: ReviewQuestion): boolean {
    return q.levels?.length === 3;
  }

  /** One-shot seeder for the 13 defaults (idempotent on the server). */
  runSeed() {
    this.appraisalService.seedReviewQuestions().subscribe({
      next: (res: any) => {
        this.messageService.add({
          severity: res?.inserted ? 'success' : 'info',
          summary: res?.inserted ? 'Seeded' : 'Already seeded',
          detail: res?.message ?? '',
        });
        if (res?.inserted) this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Seed failed' });
      },
    });
  }
}
