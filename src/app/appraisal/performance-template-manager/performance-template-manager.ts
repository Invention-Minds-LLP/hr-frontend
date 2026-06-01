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
import { PerformanceService } from '../../services/performances/performance-service';
import { Departments } from '../../services/departments/departments';

type Mode = 'list' | 'edit';

@Component({
  selector: 'app-performance-template-manager',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    ButtonModule, InputTextModule, TextareaModule,
    SelectModule, TableModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './performance-template-manager.html',
  styleUrl: './performance-template-manager.css',
})
export class PerformanceTemplateManager implements OnInit {
  mode: Mode = 'list';

  departments: any[] = [];
  cycles: Array<{ label: string; value: string }> = [];

  listDepartmentId: number | null = null;
  listCycle: string = '';
  templates: any[] = [];
  loadingList = false;

  editingId: number | null = null;
  form!: FormGroup;
  saving = false;
  loadingDetail = false;

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
    this.generateCycles();
  }

  generateCycles() {
    const currentYear = new Date().getFullYear();
    this.cycles = [];
    for (let i = 0; i < 20; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      const cycle = `APR-${startYear} TO MAR-${endYear}`;
      this.cycles.push({ label: cycle, value: cycle });
    }
  }

  // ---------- LIST MODE ----------

  loadList() {
    if (!this.listDepartmentId) {
      this.templates = [];
      return;
    }
    this.loadingList = true;
    this.performanceService.listTemplates(this.listDepartmentId, this.listCycle || undefined).subscribe({
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

  // ---------- EDIT MODE ----------

  openNew() {
    this.editingId = null;
    this.buildForm();
    if (this.listDepartmentId) this.form.patchValue({ departmentId: this.listDepartmentId });
    if (this.listCycle) this.form.patchValue({ cycle: this.listCycle });
    this.mode = 'edit';
  }

  openEdit(t: any) {
    this.editingId = t.id;
    this.loadingDetail = true;
    this.mode = 'edit';
    this.buildForm();
    this.performanceService.getTemplateDetail(t.id).subscribe({
      next: (detail) => {
        this.loadingDetail = false;
        if (detail.responseCount > 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Read-only',
            detail: `This template has ${detail.responseCount} response(s). Editing is disabled — clone instead.`,
            life: 6000,
          });
        }
        this.form.patchValue({
          title: detail.title,
          departmentId: detail.departmentId,
          cycle: detail.cycle,
        });
        this.form.get('departmentId')?.disable();
        this.form.get('cycle')?.disable();
        this.questionsArray.clear();
        for (const q of detail.questions || []) {
          this.questionsArray.push(this.makeQuestionRow(q));
        }
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
    this.form = this.fb.group({
      title: ['', Validators.required],
      departmentId: [null, Validators.required],
      cycle: ['', Validators.required],
      questions: this.fb.array([]),
    });
  }

  get questionsArray(): FormArray {
    return this.form.get('questions') as FormArray;
  }

  makeQuestionRow(q?: { category?: string; text?: string; orderNo?: number }): FormGroup {
    return this.fb.group({
      category: [q?.category ?? '', Validators.required],
      text: [q?.text ?? '', Validators.required],
      orderNo: [q?.orderNo ?? this.questionsArray?.length ?? 0],
    });
  }

  addQuestion() {
    this.questionsArray.push(this.makeQuestionRow());
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
    this.renumber();
    const raw = this.form.getRawValue();
    this.saving = true;

    if (this.editingId) {
      this.performanceService.updateTemplate(this.editingId, {
        title: raw.title,
        questions: raw.questions,
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
        cycle: raw.cycle,
        title: raw.title,
        questions: raw.questions,
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
