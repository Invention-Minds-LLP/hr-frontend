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
import { Departments } from '../../services/departments/departments';
import { Designations } from '../../services/designations/designations';
import { Roles } from '../../services/roles/roles';
import { Employees } from '../../services/employees/employees';

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
  // Subject targeting — which appraised employees get this question.
  // All four empty = applies to everyone.
  targetDepartmentIds: number[];
  targetDesignationIds: number[];
  targetRoleIds: number[];
  targetEmployeeIds: number[];
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

  // "Target audience" option lists (which appraised employees get the question).
  departmentOptions: { label: string; value: number }[] = [];
  designationOptions: { label: string; value: number }[] = [];
  roleOptions: { label: string; value: number }[] = [];
  // Full active-employee roster; the "Specific employees" picker is derived from
  // this and narrowed by the selected department / designation / role.
  private allEmployees: { id: number; firstName: string; lastName: string; employeeCode?: string | null; departmentId?: number | null; designationId?: number | null; roleId?: number | null }[] = [];

  constructor(
    private appraisalService: Appraisal,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private departmentsService: Departments,
    private designationsService: Designations,
    private rolesService: Roles,
    private employeesService: Employees,
  ) {}

  ngOnInit() {
    this.load();
    this.loadTargetOptions();
  }

  /** Load the department / designation / role / employee pickers for targeting. */
  private loadTargetOptions() {
    this.departmentsService.getDepartments().subscribe({
      next: (rows) => {
        this.departmentOptions = (rows || [])
          .filter((d) => d.id != null)
          .map((d) => ({ label: d.name, value: d.id as number }));
      },
      error: () => {},
    });
    this.designationsService.getDesignations().subscribe({
      next: (rows) => {
        this.designationOptions = (rows || [])
          .filter((d) => d.id != null)
          .map((d) => ({ label: d.name, value: d.id as number }));
      },
      error: () => {},
    });
    this.rolesService.getRoles().subscribe({
      next: (rows) => {
        this.roleOptions = (rows || [])
          .filter((r) => r.id != null)
          .map((r) => ({ label: r.name, value: r.id as number }));
      },
      error: () => {},
    });
    this.employeesService.getActiveEmployees().subscribe({
      next: (rows: any[]) => {
        this.allEmployees = (rows || []).filter((e) => e?.id != null);
      },
      error: () => {},
    });
  }

  /**
   * "Specific employees" options, narrowed by the selected department /
   * designation / role (union). When none of those axes are set, every active
   * employee is offered. Already-selected employees are always kept visible so
   * editing a scoped question never silently drops them.
   */
  get filteredEmployeeOptions(): { label: string; value: number }[] {
    const dep = this.form.targetDepartmentIds || [];
    const des = this.form.targetDesignationIds || [];
    const rol = this.form.targetRoleIds || [];
    const hasFilter = dep.length > 0 || des.length > 0 || rol.length > 0;
    const selected = new Set(this.form.targetEmployeeIds || []);
    return this.allEmployees
      .filter((e) =>
        !hasFilter
        || (e.departmentId != null && dep.includes(e.departmentId))
        || (e.designationId != null && des.includes(e.designationId))
        || (e.roleId != null && rol.includes(e.roleId))
        || selected.has(e.id))
      .map((e) => ({
        label: `${e.firstName} ${e.lastName}${e.employeeCode ? ' (' + e.employeeCode + ')' : ''}`,
        value: e.id,
      }));
  }

  load() {
    this.loading = true;
    this.appraisalService.listReviewQuestions({ includeInactive: true }).subscribe({
      next: (rows: any[]) => {
        this.questions = (rows || []).map((r) => ({
          ...r,
          levels: this.normaliseLevels(r.levels),
          prompts: Array.isArray(r.prompts) ? r.prompts : (r.prompts ? [String(r.prompts)] : []),
          targetDepartmentIds: Array.isArray(r.targetDepartmentIds) ? r.targetDepartmentIds : [],
          targetDesignationIds: Array.isArray(r.targetDesignationIds) ? r.targetDesignationIds : [],
          targetRoleIds: Array.isArray(r.targetRoleIds) ? r.targetRoleIds : [],
          targetEmployeeIds: Array.isArray(r.targetEmployeeIds) ? r.targetEmployeeIds : [],
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
    this.form = {
      ...q,
      levels: [...q.levels],
      targetDepartmentIds: [...(q.targetDepartmentIds || [])],
      targetDesignationIds: [...(q.targetDesignationIds || [])],
      targetRoleIds: [...(q.targetRoleIds || [])],
      targetEmployeeIds: [...(q.targetEmployeeIds || [])],
    };
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
      targetDepartmentIds: [],
      targetDesignationIds: [],
      targetRoleIds: [],
      targetEmployeeIds: [],
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
      targetDepartmentIds: this.form.targetDepartmentIds || [],
      targetDesignationIds: this.form.targetDesignationIds || [],
      targetRoleIds: this.form.targetRoleIds || [],
      targetEmployeeIds: this.form.targetEmployeeIds || [],
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
  /** True when the question is scoped to a subset of employees (any target set). */
  isTargeted(q: ReviewQuestion): boolean {
    return !!(q.targetDepartmentIds?.length || q.targetDesignationIds?.length
      || q.targetRoleIds?.length || q.targetEmployeeIds?.length);
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
