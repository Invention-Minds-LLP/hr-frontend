import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Recuriting, EvalTestLite } from '../../services/recruiting/recuriting';

type RoundRow = {
  seq: number;
  type: 'TEST' | 'PANEL' | 'MANAGEMENT';
  name: string;
  testId: number | null;
  isRequired: boolean;
};

/**
 * The round order for ONE job.
 *
 * A department rarely hires a single kind of person: a staff nurse may be
 * screened by a written test before anyone meets them, while a ward clerk is
 * interviewed first. The department's sequence is only a starting point, so
 * this overrides it for a single job without touching the template or any
 * other job using it.
 */
@Component({
  selector: 'app-job-rounds',
  imports: [CommonModule, FormsModule, DialogModule, SelectModule, InputTextModule, ToastModule],
  providers: [MessageService],
  templateUrl: './job-rounds.html',
  styleUrl: './job-rounds.css',
})
export class JobRounds implements OnChanges {
  /** The job to edit. Null closes the dialog. */
  @Input() job: any = null;
  @Output() closed = new EventEmitter<void>();

  visible = false;
  loading = false;
  saving = false;
  /** False while the job is still following its department's sequence. */
  configured = false;
  rounds: RoundRow[] = [];
  templates: any[] = [];
  tests: EvalTestLite[] = [];

  readonly typeOptions = [
    { label: 'Written test', value: 'TEST' },
    { label: 'Panel interview', value: 'PANEL' },
    { label: 'Management round', value: 'MANAGEMENT' },
  ];

  constructor(private api: Recuriting, private toast: MessageService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['job']) return;
    if (!this.job) { this.visible = false; return; }

    this.visible = true;
    this.loading = true;
    this.rounds = [];

    this.api.getJobRounds(this.job.id).subscribe({
      next: (res) => {
        this.configured = !!res?.configured;
        this.rounds = (res?.rounds || []).map((r: any, i: number) => ({
          seq: i + 1, type: r.type, name: r.name, testId: r.testId ?? null, isRequired: r.isRequired !== false,
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load this job\'s rounds.' });
      },
    });

    if (!this.templates.length) {
      this.api.listRoundTemplates().subscribe({ next: (t) => (this.templates = t || []), error: () => {} });
    }
    if (!this.tests.length) {
      this.api.listPublishedTests().subscribe({ next: (t) => (this.tests = t || []), error: () => {} });
    }
  }

  close(): void {
    this.visible = false;
    this.closed.emit();
  }

  /** Start from a named sequence, then adjust it for this job if needed. */
  applyTemplate(templateId: number): void {
    const template = this.templates.find((t) => t.id === templateId);
    if (!template) return;
    this.rounds = (template.items || []).map((i: any, idx: number) => ({
      seq: idx + 1, type: i.type, name: i.name, testId: i.testId ?? null, isRequired: i.isRequired !== false,
    }));
  }

  addRound(): void {
    this.rounds.push({ seq: this.rounds.length + 1, type: 'PANEL', name: 'Panel', testId: null, isRequired: true });
  }

  removeRound(index: number): void {
    this.rounds.splice(index, 1);
    this.renumber();
  }

  move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.rounds.length) return;
    const [row] = this.rounds.splice(index, 1);
    this.rounds.splice(target, 0, row);
    this.renumber();
  }

  private renumber(): void {
    this.rounds.forEach((r, i) => (r.seq = i + 1));
  }

  onTypeChange(row: RoundRow, previousType: string): void {
    const defaults: Record<string, string> = { TEST: 'Test', PANEL: 'Panel', MANAGEMENT: 'Management' };
    if (!row.name?.trim() || row.name === defaults[previousType]) row.name = defaults[row.type] || row.name;
    if (row.type !== 'TEST') row.testId = null;
  }

  save(): void {
    if (!this.rounds.length) {
      this.toast.add({ severity: 'warn', summary: 'No rounds', detail: 'Add at least one round.' });
      return;
    }
    this.saving = true;
    this.api.setJobRounds(this.job.id, { rounds: this.rounds }).subscribe({
      next: () => {
        this.saving = false;
        this.configured = true;
        this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Round order saved for this job.' });
        this.close();
      },
      error: (err) => {
        this.saving = false;
        this.toast.add({
          severity: 'error', summary: 'Error',
          detail: err?.error?.error || 'Could not save the round order.',
        });
      },
    });
  }
}
