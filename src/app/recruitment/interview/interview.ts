import { Component, inject, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Recuriting } from '../../services/recruiting/recuriting';
import { FormBuilder, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';


// PrimeNG (optional)
import { TableModule } from 'primeng/table';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { ModuleGuide } from '../../shared/module-guide/module-guide';

@Component({
  selector: 'app-interview',
  imports: [CommonModule, DatePipe, TableModule, CardModule, ButtonModule, RadioButtonModule, DividerModule,
    FormsModule, DialogModule, Tag, ReactiveFormsModule, TextareaModule, SkeletonModule, PaginatorModule, TooltipModule, ModuleGuide],
  templateUrl: './interview.html',
  styleUrl: './interview.css'
})
export class Interview {
  private svc = inject(Recuriting);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private messages = inject(MessageService);
  @Output() evaluate = new EventEmitter<any>();
  showReviewDialog = false;
  reviewCtx: any | null = null;
  currentApp: any | null = null;
  readOnlyReview = false;
  loading = true;
  isLoading = false;
  page = 1;
  pageSize = 10;
  totalRecords = 0;
  rows = signal<any[]>([]);



  reviewForm = this.fb.group({
    decision: this.fb.control<string | null>(null, { validators: Validators.required }),
    note: this.fb.control<string>(''),
  });



  ngOnInit() { this.load(); }
  load() {
    this.loading = true;

    this.svc.getAllInterview(this.page, this.pageSize).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.totalRecords = res.total;
        this.loading = false;
      },
      error: () => {
        this.rows.set([]);
        this.loading = false;
      }
    });
  }
  onPageChange(event: any) {
    this.page = event.page + 1;
    this.pageSize = event.rows;
    this.load();
  }

  /** Map a status string to one of the colour classes used by the Status pill
   *  in the table (.iv-good / .iv-warn / .iv-info / .iv-danger / .iv-neutral). */
  statusClass(status: string | null | undefined): string {
    if (!status) return 'iv-neutral';
    const s = String(status).toLowerCase();
    if (/(pass|completed|approved|cleared|hired|done|present)/i.test(s)) return 'iv-good';
    if (/(shortlist|in[ _-]?progress|scheduled)/i.test(s))               return 'iv-info';
    if (/(pending|not[ _-]?started|review)/i.test(s))                    return 'iv-warn';
    if (/(fail|reject|cancel|absent|no[ _-]?show|declined)/i.test(s))    return 'iv-danger';
    return 'iv-neutral';
  }

  /** Map a numeric score to a colour band — green (strong), amber (mid),
   *  red (weak). Score scale here is 0–10 (panel) or 0–100 (test); we
   *  normalise tests to /10 so thresholds stay simple. */
  scoreClass(score: number | string | null | undefined): string {
    if (score === null || score === undefined || score === '' || score === '—') return 'iv-neutral';
    let n = Number(score);
    if (Number.isNaN(n)) return 'iv-neutral';
    if (n > 10) n = n / 10;            // assume /100 → normalise
    if (n >= 7) return 'iv-good';
    if (n >= 4) return 'iv-warn';
    return 'iv-danger';
  }

  onEvaluate(row: any) {
    console.log(row)
    if (row.candidateAssignedTestId && row.candidateAssignedTest) {
      const test = row.candidateAssignedTest;

      // Case 1: test not yet completed
      if (!/completed/i.test(test.status)) {
        this.messages.add({
          severity: 'info',
          summary: 'Test not completed',
          detail: 'Candidate has not finished the test yet.'
        });
        return;
      }

      // Case 2: completed but not reviewed
      if (test.status === 'Completed' && !test.reviewedAt) {
        this.reviewCtx = test;
        this.currentApp = row.application;
        this.reviewForm.reset({ decision: null, note: '' });
        this.showReviewDialog = true;
        return;
      }
      if (test.status === 'Completed' && test.reviewedAt) {
        this.reviewCtx = test;
        this.currentApp = row.application;
        this.readOnlyReview = true;    // 👈 mark read-only
        this.showReviewDialog = true;
        return;
      }

      // Case 3: already reviewed -> go to evaluation form
      // this.evaluate.emit(row);
    } else {
      // Case 4: no test, just a panel round
      this.evaluate.emit(row);
    }
  }

  submitReview() {
    if (!this.currentApp || !this.reviewCtx || this.reviewForm.invalid) return;
    const { decision, note } = this.reviewForm.value;
    this.isLoading = true;

    this.svc.reviewCandidateTest(this.currentApp.id, this.reviewCtx.id, {
      decision: decision as 'PASS' | 'FAIL', note: note || undefined
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.messages.add({ severity: 'success', summary: 'Saved', detail: 'Review recorded' });
        this.showReviewDialog = false;
        // update local flags
        this.reviewCtx!.reviewDecision = decision as any;
        this.reviewCtx!.reviewedAt = new Date().toISOString();
        (this.currentApp as any)._hasPendingTestReview = false;
      },
      error: (e) => {
        this.messages.add({ severity: 'error', summary: 'Failed', detail: e?.error?.error || 'Could not save review' });
        this.isLoading = false;
      }
    });
  }
  truncate(text?: string, limit = 10): string {
    return text && text.length > limit ? text.slice(0, limit) + '…' : text || '—';
  }


  selectedform: any | null = null;

  openFrom(form: any) {
    this.selectedform = form;
  }

  closeFrom() {
    this.selectedform = null;
  }
}
