import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { WeeklyRatingService } from '../../services/weekly-rating/weekly-rating';

interface SelfAnswer {
  questionId: number;
  questionText: string;
  score: number | null;
  remarks: string;
}

@Component({
  selector: 'app-self-weekly-rating',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, TextareaModule,
    InputNumberModule, SkeletonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './self-weekly-rating.html',
  styleUrl: './self-weekly-rating.css',
})
export class SelfWeeklyRating implements OnInit {
  loading = true;
  saving = false;

  // current week
  weekStartDate!: Date;
  weekEndDate!: Date;

  // questions + scores
  answers: SelfAnswer[] = [];
  overallRemarks = '';
  existingRatingId: number | null = null;
  isSubmitted = false; // if SUBMITTED, employee can re-edit (still independent of manager)

  // popup form
  formDialogVisible = false;

  // history
  history: any[] = [];
  historyDialogVisible = false;
  selectedHistory: any = null;
  detailDialogVisible = false;

  empId = Number(localStorage.getItem('empId') ?? 0);

  constructor(
    private ratingService: WeeklyRatingService,
    private msg: MessageService,
  ) {}

  ngOnInit() {
    this.setCurrentWeek();
    this.loadCurrentWeekRating();
    this.loadHistory();
  }

  setCurrentWeek() {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    this.weekStartDate = monday;
    this.weekEndDate = sunday;
  }

  private toISODate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  loadCurrentWeekRating() {
    if (!this.empId) {
      this.loading = false;
      return;
    }
    this.loading = true;

    // Fetch questions for this employee's designation
    this.ratingService.getQuestionsForEmployee(this.empId).subscribe({
      next: (qData: any) => {
        const questions = qData.questions || [];

        // Then fetch any existing self rating for this week
        this.ratingService.getMySelfRatingForWeek(this.toISODate(this.weekStartDate)).subscribe({
          next: (existing: any) => {
            const answerMap = new Map<number, { score: number; remarks: string | null }>();
            if (existing) {
              this.existingRatingId = existing.id;
              this.isSubmitted = existing.status === 'SUBMITTED';
              this.overallRemarks = existing.managerRemarks ?? '';
              for (const a of existing.answers || []) {
                answerMap.set(a.questionId, { score: a.score, remarks: a.remarks });
              }
            } else {
              this.existingRatingId = null;
              this.isSubmitted = false;
              this.overallRemarks = '';
            }

            this.answers = questions.map((q: any) => ({
              questionId: q.id,
              questionText: q.text,
              score: answerMap.get(q.id)?.score ?? null,
              remarks: answerMap.get(q.id)?.remarks ?? '',
            }));
            this.loading = false;
          },
          error: () => { this.loading = false; },
        });
      },
      error: () => { this.loading = false; },
    });
  }

  loadHistory() {
    this.ratingService.getMySelfRatings().subscribe({
      next: (data: any[]) => { this.history = data || []; },
    });
  }

  canSubmit(): boolean {
    return this.answers.length > 0 && this.answers.every(a => a.score != null && a.score >= 1 && a.score <= 10);
  }

  submit(asDraft: boolean = false) {
    if (!asDraft && !this.canSubmit()) {
      this.msg.add({ severity: 'warn', summary: 'Incomplete', detail: 'Please score every question (1–10)' });
      return;
    }
    this.saving = true;
    const payload = {
      employeeId: this.empId,
      ratedBy: this.empId,
      weekStartDate: this.weekStartDate.toISOString(),
      weekEndDate: this.weekEndDate.toISOString(),
      managerRemarks: this.overallRemarks || null,
      answers: this.answers
        .filter(a => a.score != null)
        .map(a => ({ questionId: a.questionId, score: a.score, remarks: a.remarks || null })),
      status: asDraft ? 'DRAFT' : 'SUBMITTED',
    };

    this.ratingService.submitRating(payload).subscribe({
      next: () => {
        this.saving = false;
        this.msg.add({ severity: 'success', summary: 'Saved', detail: asDraft ? 'Draft saved' : 'Self-rating submitted' });
        this.loadCurrentWeekRating();
        this.loadHistory();
        if (!asDraft) this.formDialogVisible = false;
      },
      error: (err) => {
        this.saving = false;
        this.msg.add({ severity: 'error', summary: 'Error', detail: err?.error?.error || 'Failed to submit' });
      },
    });
  }

  viewHistory(item: any) {
    this.selectedHistory = item;
    this.detailDialogVisible = true;
  }

  fmtDate(d: any): string {
    if (!d) return '';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'score-high';
    if (score >= 50) return 'score-mid';
    return 'score-low';
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#4CAF50';
    if (score >= 50) return '#FF9800';
    return '#f44336';
  }
}
