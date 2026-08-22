import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { PerformanceService } from '../../services/performances/performance-service';
import { Departments } from '../../services/departments/departments';

type Mode = 'list' | 'edit';

@Component({
  selector: 'app-performance-template-manager',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    ButtonModule, InputTextModule, TextareaModule,
    SelectModule, TableModule, ConfirmDialogModule, DialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './performance-template-manager.html',
  styleUrl: './performance-template-manager.css',
})
export class PerformanceTemplateManager implements OnInit {
  mode: Mode = 'list';

  departments: any[] = [];

  listDepartmentId: number | null = null;
  templates: any[] = [];
  loadingList = false;

  editingId: number | null = null;
  form!: FormGroup;
  saving = false;
  loadingDetail = false;

  /** True when the open template has responses and can only be cloned. */
  readOnlyTemplate = false;

  // ---------- CLONE ----------
  cloneDialogVisible = false;
  cloneSource: any = null;
  cloneTitle = '';
  cloneDepartmentId: number | null = null;
  cloning = false;

  constructor(
    private fb: FormBuilder,
    private performanceService: PerformanceService,
    private departmentService: Departments,
    private messageService: MessageService,
    private confirmService: ConfirmationService,
  ) {
    this.buildForm();
  }

  ngOnInit() {
    this.departmentService.getDepartments().subscribe((res: any) => (this.departments = res));
  }

  // ---------- LIST MODE ----------

  loadList() {
    if (!this.listDepartmentId) {
      this.templates = [];
      return;
    }
    this.loadingList = true;
    this.performanceService.listTemplates(this.listDepartmentId).subscribe({
      next: (rows) => {
        this.templates = rows || [];
        this.loadingList = false;
      },
      error: () => {
        this.templates = [];
        this.loadingList = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load templates' });
      },
    });
  }

  onDelete(t: any) {
    this.confirmService.confirm({
      message: `Delete template "${t.title}"? This cannot be undone.`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.performanceService.deleteTemplate(t.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Template removed' });
            this.loadList();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Cannot delete',
              detail: err?.error?.error || 'Failed to delete template',
            });
          },
        });
      },
    });
  }

  // ---------- CLONE ----------

  /** `source` may be a list row or the template currently open in the editor. */
  openClone(source: any) {
    this.cloneSource = source;
    this.cloneDepartmentId = source?.departmentId ?? this.listDepartmentId ?? null;
    const base = String(source?.title ?? '').replace(/\s*\(copy\)\s*$/i, '').trim();
    this.cloneTitle = base ? `${base} (copy)` : '';
    this.cloneDialogVisible = true;
  }

  confirmClone() {
    if (!this.cloneSource?.id || !this.cloneTitle.trim()) return;
    this.cloning = true;
    this.performanceService.cloneTemplate(this.cloneSource.id, {
      departmentId: this.cloneDepartmentId ?? undefined,
      title: this.cloneTitle.trim(),
    }).subscribe({
      next: (created) => {
        this.cloning = false;
        this.cloneDialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Cloned',
          detail: `${created.questions?.length ?? 0} question(s) copied. Edit what doesn't apply.`,
        });
        // Follow the list to wherever the copy landed, then open it.
        this.listDepartmentId = created.departmentId;
        this.openEdit(created);
      },
      error: (err) => {
        this.cloning = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Clone failed',
          detail: err?.error?.error || 'Could not clone this template',
        });
      },
    });
  }

  // ---------- EDIT MODE ----------

  openNew() {
    this.editingId = null;
    this.readOnlyTemplate = false;
    // Start from blank cut-offs; they fill in from the default as soon as the
    // first question gives the template a maximum.
    this.bandsLoaded = false;
    this.bands = this.DEFAULT_BAND_PERCENTS.map(b => ({ label: b.label, marks: null }));
    this.buildForm();
    if (this.listDepartmentId) this.form.patchValue({ departmentId: this.listDepartmentId });
    this.mode = 'edit';
  }

  openEdit(t: any) {
    this.editingId = t.id;
    this.loadingDetail = true;
    this.mode = 'edit';
    this.readOnlyTemplate = false;
    this.bandsLoaded = false;
    this.buildForm();
    this.performanceService.getTemplateDetail(t.id).subscribe({
      next: (detail) => {
        this.loadingDetail = false;
        this.readOnlyTemplate = detail.responseCount > 0;
        if (this.readOnlyTemplate) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Read-only',
            detail: `This template has ${detail.responseCount} response(s). Editing is disabled — clone it to make changes.`,
            life: 6000,
          });
        }
        this.form.patchValue({
          title: detail.title,
          departmentId: detail.departmentId,
        });
        this.form.get('departmentId')?.disable();
        this.questionsArray.clear();
        for (const q of detail.questions || []) {
          this.questionsArray.push(this.makeQuestionRow(q));
        }
        // After the questions land, so maxMarks is known when converting.
        this.bandsFromDetail(detail.scoreBands);
        if (detail.responseCount > 0) {
          this.form.disable();
        }
      },
      error: () => {
        this.loadingDetail = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load template' });
        this.mode = 'list';
      },
    });
  }

  backToList() {
    this.mode = 'list';
    this.editingId = null;
    this.loadList();
  }

  buildForm() {
    // No cycle field — a department's question set applies to every cycle.
    // The backend stamps TEMPLATE_CYCLE_ANY on new templates.
    this.form = this.fb.group({
      title: ['', Validators.required],
      departmentId: [null, Validators.required],
      questions: this.fb.array([]),
    });
  }

  get questionsArray(): FormArray {
    return this.form.get('questions') as FormArray;
  }

  makeQuestionRow(q?: { category?: string; section?: string | null; text?: string; orderNo?: number; weight?: number | null }): FormGroup {
    return this.fb.group({
      // Two grouping levels, matching the printed sheet's first two columns.
      category: [q?.category ?? '', Validators.required],
      section: [q?.section ?? ''],
      text: [q?.text ?? '', Validators.required],
      orderNo: [q?.orderNo ?? this.questionsArray?.length ?? 0],
      // Optional multiplier. Blank/1 = counts once. Scoring bands are a
      // percentage of the template's own weighted maximum.
      weight: [q?.weight ?? null, [Validators.min(1), Validators.max(10)]],
    });
  }

  // ---------- SCORE BANDS ----------

  /** Highest score any one question can be given. */
  readonly MAX_SCORE_PER_QUESTION = 5;

  /** Cut-offs are entered as marks (the way the printed sheet reads) and stored
   *  as percentages, so the same template works if questions are added later. */
  /** Mirrors DEFAULT_SCORE_BANDS on the backend. Used to pre-fill the editor so
   *  it shows a working example rather than four empty boxes. */
  private readonly DEFAULT_BAND_PERCENTS: Array<{ label: string; minPercent: number }> = [
    { label: 'Outstanding', minPercent: 95 },
    { label: 'Commendable', minPercent: 80 },
    { label: 'Acceptable', minPercent: 60 },
    { label: 'Not Acceptable', minPercent: 0 },
  ];

  bands: Array<{ label: string; marks: number | null }> = this.DEFAULT_BAND_PERCENTS
    .map(b => ({ label: b.label, marks: null }));

  /** True once the template's own bands have loaded, so prefill stops. */
  private bandsLoaded = false;

  get maxMarks(): number {
    return this.questionsArray.controls.reduce((sum, c) => {
      const w = Number(c.value?.weight) || 1;
      return sum + this.MAX_SCORE_PER_QUESTION * w;
    }, 0);
  }

  /** Marks equivalent of a band, or null while the cut-off is blank. */
  bandPercent(b: { marks: number | null }): number | null {
    const max = this.maxMarks;
    if (!max || b.marks === null || b.marks === undefined || (b.marks as any) === '') return null;
    return Math.min(100, Math.max(0, (Number(b.marks) / max) * 100));
  }

  /**
   * Fill blank cut-offs from the system default once a maximum exists. Called
   * whenever the question list changes, but only touches rows the user hasn't
   * filled in, so it never overwrites their numbers.
   */
  seedBandsFromDefault() {
    const max = this.maxMarks;
    if (!max || this.bandsLoaded) return;
    if (this.bands.some(b => b.marks !== null && (b.marks as any) !== '')) return;

    this.bands = this.DEFAULT_BAND_PERCENTS.map(b => ({
      label: b.label,
      marks: Math.round((b.minPercent / 100) * max),
    }));
  }

  addBand() {
    this.bands.splice(this.bands.length - 1, 0, { label: '', marks: null });
  }

  removeBand(i: number) {
    if (this.bands.length <= 2) return;
    this.bands.splice(i, 1);
  }

  /**
   * Reject bands that cannot classify a score. Returns an error message, or null
   * when the set is usable. Blank throughout is fine — that means "use the
   * system default" and sends nothing.
   */
  private validateBands(): string | null {
    const filled = this.bands.filter(b => b.label?.trim());
    if (!filled.length) return null;

    const anySet = filled.some(b => b.marks !== null && (b.marks as any) !== '');
    if (!anySet) return null; // all blank -> fall back to the default

    const missing = filled.filter(b => b.marks === null || (b.marks as any) === '');
    if (missing.length) {
      return `Give every band a cut-off, or clear them all to use the default. Missing: ${missing.map(b => b.label).join(', ')}.`;
    }

    const max = this.maxMarks;
    const over = filled.find(b => Number(b.marks) > max);
    if (over) return `"${over.label}" starts at ${over.marks}, above this template's maximum of ${max}.`;

    const sorted = [...filled].sort((a, b) => Number(b.marks) - Number(a.marks));
    for (let i = 1; i < sorted.length; i++) {
      if (Number(sorted[i].marks) === Number(sorted[i - 1].marks)) {
        return `"${sorted[i].label}" and "${sorted[i - 1].label}" both start at ${sorted[i].marks}. Each band needs its own cut-off.`;
      }
    }

    if (Number(sorted[sorted.length - 1].marks) !== 0) {
      return `The lowest band ("${sorted[sorted.length - 1].label}") must start at 0 so every score lands somewhere.`;
    }
    return null;
  }

  private bandsToPayload(): Array<{ label: string; minPercent: number }> | undefined {
    const max = this.maxMarks;
    if (!max) return undefined;

    const filled = this.bands.filter(
      b => b.label?.trim() && b.marks !== null && (b.marks as any) !== '',
    );
    // Nothing entered -> send nothing, so the backend keeps its own default.
    // Sending zeros here would tie every band at 0% and rate everyone top band.
    if (!filled.length) return undefined;

    return filled.map(b => ({
      label: b.label.trim(),
      minPercent: Math.min(100, Math.max(0, (Number(b.marks) / max) * 100)),
    }));
  }

  private bandsFromDetail(raw: any) {
    const max = this.maxMarks;
    if (!max) return;
    if (Array.isArray(raw) && raw.length) {
      this.bands = raw.map((b: any) => ({
        label: String(b.label ?? ''),
        marks: Math.round(((Number(b.minPercent) || 0) / 100) * max),
      }));
      this.bandsLoaded = true;
      return;
    }
    // Template has no bands of its own — show the default it is actually using.
    this.seedBandsFromDefault();
  }

  addQuestion() {
    this.questionsArray.push(this.makeQuestionRow());
    // The maximum just changed; fill the band table in if it's still blank.
    this.seedBandsFromDefault();
  }

  removeQuestion(i: number) {
    this.questionsArray.removeAt(i);
  }

  moveUp(i: number) {
    if (i <= 0) return;
    const arr = this.questionsArray;
    const above = arr.at(i - 1);
    const cur = arr.at(i);
    arr.setControl(i - 1, cur);
    arr.setControl(i, above);
    this.renumber();
  }

  moveDown(i: number) {
    const arr = this.questionsArray;
    if (i >= arr.length - 1) return;
    const below = arr.at(i + 1);
    const cur = arr.at(i);
    arr.setControl(i + 1, cur);
    arr.setControl(i, below);
    this.renumber();
  }

  renumber() {
    this.questionsArray.controls.forEach((c, idx) => c.patchValue({ orderNo: idx }, { emitEvent: false }));
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Incomplete', detail: 'Fill all required fields' });
      return;
    }
    if (this.questionsArray.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'No questions', detail: 'Add at least one question' });
      return;
    }
    const bandError = this.validateBands();
    if (bandError) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Check the scoring criteria',
        detail: bandError,
        life: 8000,
      });
      return;
    }
    this.renumber();
    const raw = this.form.getRawValue();
    // A blank number input yields null/'' — coerce so Prisma gets Int? not ''.
    const questions = (raw.questions || []).map((q: any) => ({
      category: q.category,
      section: q.section?.trim() ? q.section.trim() : null,
      text: q.text,
      orderNo: q.orderNo,
      weight: q.weight === null || q.weight === '' || q.weight === undefined ? null : Number(q.weight),
    }));
    const scoreBands = this.bandsToPayload();
    this.saving = true;

    if (this.editingId) {
      this.performanceService.updateTemplate(this.editingId, {
        title: raw.title,
        questions,
        scoreBands,
      }).subscribe({
        next: () => {
          this.saving = false;
          this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Template updated' });
          this.backToList();
        },
        error: (err) => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Update failed',
            detail: err?.error?.error || 'Failed to update',
          });
        },
      });
    } else {
      this.performanceService.createTemplate({
        departmentId: raw.departmentId,
        title: raw.title,
        questions,
        scoreBands,
      }).subscribe({
        next: () => {
          this.saving = false;
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Template created' });
          this.backToList();
        },
        error: (err) => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Create failed',
            detail: err?.error?.error || 'Failed to create',
          });
        },
      });
    }
  }
}
