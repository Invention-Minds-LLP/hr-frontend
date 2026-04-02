import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { SliderModule } from 'primeng/slider';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { ModuleGuide } from '../shared/module-guide/module-guide';
import { WeeklyRatingService } from '../services/weekly-rating/weekly-rating';
import { Designations } from '../services/designations/designations';

@Component({
  selector: 'app-weekly-rating-overview',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    TooltipModule, DialogModule, InputTextModule, TextareaModule, SelectModule,
    SliderModule, DatePickerModule, ModuleGuide
  ],
  templateUrl: './weekly-rating-overview.html',
  styleUrl: './weekly-rating-overview.css',
  providers: [MessageService]
})
export class WeeklyRatingOverview implements OnInit {
  loggedEmpId = Number(localStorage.getItem('empId')) || 0;
  loggedRoleId = Number(localStorage.getItem('roleId')) || 0;
  isHRManager = false;
  isManager = false;

  activeTab: 'team' | 'allRatings' | 'questions' = 'team';

  // Week selector
  weekStartDate: Date | null = null;
  weekEndDate: string = '';

  // Team
  team: any[] = [];
  loading = true;

  // Questions
  questions: any[] = [];
  activeQuestions: any[] = [];
  newQuestionText = '';
  selectedDesignationId: number | null = null;
  designations: any[] = [];

  // Rating dialog
  ratingDialogVisible = false;
  ratingEmployee: any = null;
  ratingAnswers: { questionId: number; text: string; score: number; remarks: string }[] = [];
  managerRemarks = '';

  // View dialog
  viewDialogVisible = false;
  viewRating: any = null;

  // All ratings (HR view)
  allRatings: any[] = [];

  constructor(
    private ratingService: WeeklyRatingService,
    private designationService: Designations,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.isHRManager = this.loggedRoleId === 1;
    this.isManager = this.loggedRoleId === 3 || this.loggedRoleId === 5;
    this.setCurrentWeek();
    this.loadQuestions();
    this.loadDesignations();

    if (this.isHRManager) {
      this.activeTab = 'allRatings';
    }
  }

  setCurrentWeek() {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    this.weekStartDate = monday;
    this.weekEndDate = sunday.toISOString().split('T')[0];
  }

  private toISODate(d: Date | null): string | undefined {
    return d ? d.toISOString().split('T')[0] : undefined;
  }

  onWeekChange() {
    if (this.weekStartDate) {
      const end = new Date(this.weekStartDate);
      end.setDate(this.weekStartDate.getDate() + 6);
      this.weekEndDate = end.toISOString().split('T')[0];
      this.loadTeam();
    }
  }

  loadDesignations() {
    this.designationService.getDesignations().subscribe({
      next: (data) => { this.designations = data; },
    });
  }

  loadQuestions() {
    const desigId = this.selectedDesignationId || undefined;
    this.ratingService.getQuestions(desigId).subscribe({
      next: (data) => {
        this.questions = data;
        this.activeQuestions = data.filter((q: any) => q.isActive);
        this.loadTeam();
        if (this.isHRManager) this.loadAllRatings();
      },
      error: () => {
        this.ratingService.seedDefaults().subscribe(() => this.loadQuestions());
      }
    });
  }

  onDesignationFilter() {
    this.loadQuestions();
  }

  loadTeam() {
    if (!this.isManager && !this.isHRManager) return;
    this.loading = true;
    this.ratingService.getTeam(this.loggedEmpId, this.toISODate(this.weekStartDate)).subscribe({
      next: (data) => { this.team = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  loadAllRatings() {
    this.ratingService.getAllRatings({ weekStartDate: this.toISODate(this.weekStartDate) }).subscribe({
      next: (data) => { this.allRatings = data; },
    });
  }

  fmtDate(d: any): string {
    if (!d) return '';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  // ── Rate Employee ──────────────────────────────────────────────────
  openRatingDialog(emp: any) {
    this.ratingEmployee = emp;
    this.managerRemarks = '';

    // Load questions specific to this employee's designation
    this.ratingService.getQuestionsForEmployee(emp.id).subscribe({
      next: (empQuestions) => {
        const activeEmpQuestions = empQuestions.filter((q: any) => q.isActive);

        if (emp.rating?.id) {
          // Load existing rating
          this.ratingService.getRatingDetail(emp.rating.id).subscribe({
            next: (detail) => {
              this.ratingAnswers = activeEmpQuestions.map((q: any) => {
                const existing = detail.answers?.find((a: any) => a.questionId === q.id);
                return { questionId: q.id, text: q.text, score: existing?.score ?? 5, remarks: existing?.remarks ?? '' };
              });
              this.managerRemarks = detail.managerRemarks || '';
              this.ratingDialogVisible = true;
            }
          });
        } else {
          this.ratingAnswers = activeEmpQuestions.map((q: any) => ({
            questionId: q.id, text: q.text, score: 5, remarks: ''
          }));
          this.ratingDialogVisible = true;
        }
      }
    });
  }

  getOverallScore(): number {
    if (!this.ratingAnswers.length) return 0;
    return Math.round((this.ratingAnswers.reduce((sum, a) => sum + a.score, 0) / this.ratingAnswers.length) * 10) / 10;
  }

  submitRating(asDraft = false) {
    this.ratingService.submitRating({
      employeeId: this.ratingEmployee.id,
      ratedBy: this.loggedEmpId,
      weekStartDate: this.toISODate(this.weekStartDate),
      weekEndDate: this.weekEndDate,
      managerRemarks: this.managerRemarks || null,
      status: asDraft ? 'DRAFT' : 'SUBMITTED',
      answers: this.ratingAnswers.map(a => ({
        questionId: a.questionId,
        score: a.score,
        remarks: a.remarks || null,
      })),
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: asDraft ? 'Saved as Draft' : 'Submitted', detail: 'Rating saved' });
        this.ratingDialogVisible = false;
        this.loadTeam();
        if (this.isHRManager) this.loadAllRatings();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  // ── View Rating Detail ─────────────────────────────────────────────
  viewRatingDetail(item: any) {
    // From team tab: item has item.rating.id. From all ratings tab: item.id is the rating id.
    const id = item.rating?.id || item.id;
    if (!id) return;
    this.ratingService.getRatingDetail(id).subscribe({
      next: (data) => { this.viewRating = data; this.viewDialogVisible = true; },
    });
  }

  // ── Questions Management ───────────────────────────────────────────
  addQuestion() {
    if (!this.newQuestionText.trim()) return;
    if (!this.selectedDesignationId) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Select a designation first' });
      return;
    }
    this.ratingService.createQuestion(this.newQuestionText.trim(), this.selectedDesignationId, this.loggedEmpId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Added' });
        this.newQuestionText = '';
        this.loadQuestions();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  toggleQ(q: any) {
    this.ratingService.toggleQuestion(q.id, !q.isActive).subscribe({
      next: () => this.loadQuestions(),
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Max 10 active' })
    });
  }

  deleteQ(q: any) {
    this.ratingService.deleteQuestion(q.id).subscribe({
      next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted' }); this.loadQuestions(); },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  seedDefaults() {
    this.ratingService.seedDefaults().subscribe({
      next: (res) => { this.messageService.add({ severity: 'success', summary: 'Done', detail: res.message }); this.loadQuestions(); },
    });
  }

  getScoreClass(score: number): string {
    if (score >= 8) return 'score-high';
    if (score >= 5) return 'score-mid';
    return 'score-low';
  }
}
