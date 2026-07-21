import { Component, inject, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CardModule } from 'primeng/card';
import { Recuriting } from '../../services/recruiting/recuriting';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CandidateEvalForm } from '../../candidate-eval-form/candidate-eval-form';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ModuleGuide } from '../../shared/module-guide/module-guide';

@Component({
  selector: 'app-my-interview',
  imports: [CardModule, TableModule, CommonModule, ReactiveFormsModule, FormsModule, CandidateEvalForm, ButtonModule,
    TagModule, SkeletonModule, DialogModule, TooltipModule, ModuleGuide],
  templateUrl: './my-interview.html',
  styleUrl: './my-interview.css'
})
export class MyInterview {
  private svc = inject(Recuriting);
  private messages = inject(MessageService);
  rows = signal<any[]>([]);
  @Output() evaluate = new EventEmitter<any>();
  selectedInterview = signal<any | null>(null);
  loading = true

  ngOnInit() {
    setTimeout(() => {
      this.loading = true
      this.load();
      this.loading = false
    }, 4000)
  }

  load() {
    const empId = Number(localStorage.getItem('empId'));

    this.svc.getPanelInterview(empId).subscribe({
      next: (data) => {
        const processed = (data || []).map((interview: any) => {
          // find feedback for this panel user
          const myFeedback = interview.InterviewFeedback?.find(
            (f: any) => Number(f.panelUserId) === empId
          );

          // determine status text
          const isSubmitted = (myFeedback?.status ?? '').toUpperCase() === 'SUBMITTED';
          const displayStatus = isSubmitted ? 'Interviewed' : 'Pending';

          // optional: compute average score
          const avgScore = myFeedback?.average ?? '—';

          // My own availability acknowledgement for this interview.
          const myPanel = interview.panel?.find((p: any) => Number(p.employeeId) === empId);

          return {
            ...interview,
            displayStatus,
            avgScore,
            myAck: myPanel?.ackStatus ?? 'PENDING',
            myAckReason: myPanel?.ackReason ?? null,
          };
        });

        this.rows.set(processed);
      },
      error: () => this.rows.set([]),
    });
  }


  onEvaluate(row: any) {
    this.selectedInterview.set(row);
  }

  getDefaultImage(gender?: string | null): string {
    const g = gender?.toUpperCase?.() || 'MALE';
    return g === 'FEMALE'
      ? '/img-women.png'
      : '/img.png';
  }

  selectedform: any | null = null;

  openFrom(form: any) {
    this.selectedform = form;
  }

  closeFrom() {
    this.selectedInterview.set(null);
  }

  // ── Availability acknowledgement ────────────────────────────────────
  ackDialogOpen = false;
  ackRow: any | null = null;
  ackReason = '';
  ackSaving = false;

  confirmAvailable(row: any) {
    this.ackSaving = true;
    this.svc.panelAck(row.id, 'AVAILABLE').subscribe({
      next: () => {
        this.ackSaving = false;
        this.messages.add({ severity: 'success', summary: 'Confirmed', detail: 'You’re marked available for this interview.' });
        this.load();
      },
      error: (err) => {
        this.ackSaving = false;
        this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.error || err?.error?.message || 'Failed to confirm' });
      },
    });
  }

  openDecline(row: any) {
    this.ackRow = row;
    this.ackReason = '';
    this.ackDialogOpen = true;
  }

  submitDecline() {
    if (!this.ackRow) return;
    if (!this.ackReason.trim()) {
      this.messages.add({ severity: 'warn', summary: 'Reason required', detail: 'Please tell HR why you can’t attend.' });
      return;
    }
    this.ackSaving = true;
    this.svc.panelAck(this.ackRow.id, 'UNAVAILABLE', this.ackReason.trim()).subscribe({
      next: () => {
        this.ackSaving = false;
        this.ackDialogOpen = false;
        this.messages.add({ severity: 'success', summary: 'Noted', detail: 'HR has been notified so they can reschedule.' });
        this.load();
      },
      error: (err) => {
        this.ackSaving = false;
        this.messages.add({ severity: 'error', summary: 'Error', detail: err?.error?.error || err?.error?.message || 'Failed to submit' });
      },
    });
  }
}
