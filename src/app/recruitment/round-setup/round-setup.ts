import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { Recuriting, EvalTestLite } from '../../services/recruiting/recuriting';
import { Departments } from '../../services/departments/departments';

type RoundRow = {
  seq: number;
  type: 'TEST' | 'PANEL' | 'MANAGEMENT';
  name: string;
  testId: number | null;
  isRequired: boolean;
};

/**
 * Interview round setup.
 *
 * The order of rounds used to be hardcoded as Panel → Test → Management, so a
 * role that is screened by a written test first could not be run at all. A
 * template is a named sequence; a job takes a copy of one when it is created,
 * which is why editing a template here never disturbs hiring already under way.
 */
@Component({
  selector: 'app-round-setup',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, SelectModule,
    InputTextModule, CheckboxModule, ToastModule, TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './round-setup.html',
  styleUrl: './round-setup.css',
})
export class RoundSetup implements OnInit, OnDestroy {
  templates: any[] = [];
  departments: any[] = [];
  tests: EvalTestLite[] = [];
  loading = true;
  saving = false;

  // Editor state — null when nothing is open.
  editing: any = null;
  form: { id: number | null; name: string; departmentId: number | null; isDefault: boolean; rounds: RoundRow[] } = {
    id: null, name: '', departmentId: null, isDefault: false, rounds: [],
  };

  readonly typeOptions = [
    { label: 'Written test', value: 'TEST' },
    { label: 'Panel interview', value: 'PANEL' },
    { label: 'Management round', value: 'MANAGEMENT' },
  ];

  private readonly destroyed = new Subject<void>();

  constructor(
    private api: Recuriting,
    private deptService: Departments,
    private toast: MessageService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.deptService.getDepartments().pipe(takeUntil(this.destroyed))
      .subscribe({ next: (d: any) => (this.departments = d || []), error: () => (this.departments = []) });
    this.api.listPublishedTests().pipe(takeUntil(this.destroyed))
      .subscribe({ next: (t) => (this.tests = t || []), error: () => (this.tests = []) });
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  load(): void {
    this.loading = true;
    this.api.listRoundTemplates().pipe(takeUntil(this.destroyed)).subscribe({
      next: (rows) => { this.templates = rows || []; this.loading = false; },
      error: (err) => {
        console.error('Failed to load round templates', err);
        this.loading = false;
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load the round templates.' });
      },
    });
  }

  // ── Editor ───────────────────────────────────────────────────────────────

  newTemplate(): void {
    this.editing = { id: null };
    this.form = {
      id: null, name: '', departmentId: null, isDefault: false,
      // The common case, pre-filled so HR only reorders rather than builds.
      rounds: [
        { seq: 1, type: 'PANEL', name: 'Panel', testId: null, isRequired: true },
        { seq: 2, type: 'TEST', name: 'Test', testId: null, isRequired: true },
      ],
    };
  }

  edit(template: any): void {
    this.editing = template;
    this.form = {
      id: template.id,
      name: template.name,
      departmentId: template.departmentId ?? null,
      isDefault: !!template.isDefault,
      rounds: (template.items || []).map((i: any, idx: number) => ({
        seq: idx + 1, type: i.type, name: i.name, testId: i.testId ?? null, isRequired: i.isRequired !== false,
      })),
    };
  }

  cancel(): void {
    this.editing = null;
  }

  addRound(): void {
    this.form.rounds.push({
      seq: this.form.rounds.length + 1, type: 'PANEL', name: 'Panel', testId: null, isRequired: true,
    });
  }

  removeRound(index: number): void {
    this.form.rounds.splice(index, 1);
    this.renumber();
  }

  move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.form.rounds.length) return;
    const [row] = this.form.rounds.splice(index, 1);
    this.form.rounds.splice(target, 0, row);
    this.renumber();
  }

  /** Round numbers always follow the list order — nobody edits them by hand. */
  private renumber(): void {
    this.form.rounds.forEach((r, i) => (r.seq = i + 1));
  }

  /** Renaming the type renames the round too, unless HR typed their own name. */
  onTypeChange(row: RoundRow, previousType: string): void {
    const defaults: Record<string, string> = { TEST: 'Test', PANEL: 'Panel', MANAGEMENT: 'Management' };
    if (!row.name?.trim() || row.name === defaults[previousType]) row.name = defaults[row.type] || row.name;
    if (row.type !== 'TEST') row.testId = null;
  }

  testName(testId: number | null): string {
    return this.tests.find((t) => t.id === testId)?.name || 'HR picks at assign time';
  }

  save(): void {
    if (!this.form.name.trim()) {
      this.toast.add({ severity: 'warn', summary: 'Name required', detail: 'Give the sequence a name.' });
      return;
    }
    if (!this.form.rounds.length) {
      this.toast.add({ severity: 'warn', summary: 'No rounds', detail: 'Add at least one round.' });
      return;
    }

    this.saving = true;
    const body = {
      name: this.form.name.trim(),
      departmentId: this.form.departmentId,
      isDefault: this.form.isDefault,
      rounds: this.form.rounds,
    };
    const request$ = this.form.id
      ? this.api.updateRoundTemplate(this.form.id, body)
      : this.api.createRoundTemplate(body);

    request$.pipe(takeUntil(this.destroyed)).subscribe({
      next: () => {
        this.saving = false;
        this.editing = null;
        this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Round sequence saved.' });
        this.load();
      },
      error: (err) => {
        this.saving = false;
        console.error('Failed to save round template', err);
        this.toast.add({
          severity: 'error', summary: 'Error',
          detail: err?.error?.error || 'Could not save the round sequence.',
        });
      },
    });
  }

  remove(template: any): void {
    if (!window.confirm(`Remove "${template.name}"? Jobs already using it keep their own copy.`)) return;
    this.api.deleteRoundTemplate(template.id).pipe(takeUntil(this.destroyed)).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Removed', detail: `"${template.name}" removed.` });
        this.load();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Could not remove it.' }),
    });
  }

  summary(template: any): string {
    return (template.items || []).map((i: any) => `${i.seq} ${i.name}`).join('  →  ');
  }
}
