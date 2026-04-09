import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { Appraisal } from '../../services/appraisal/appraisal';
import { ModuleGuide } from '../../shared/module-guide/module-guide';

@Component({
  selector: 'app-self-appraisal',
  imports: [
    CommonModule, FormsModule, ButtonModule, ToastModule,
    DialogModule, InputTextModule, TextareaModule, TooltipModule, DatePickerModule, ModuleGuide
  ],
  templateUrl: './self-appraisal.html',
  styleUrl: './self-appraisal.css',
  providers: [MessageService]
})
export class SelfAppraisalComponent implements OnInit {
  loggedEmpId = Number(localStorage.getItem('empId')) || 0;
  loggedRoleId = Number(localStorage.getItem('roleId')) || 0;

  // My appraisals (employee view)
  myAppraisals: any[] = [];
  loading = true;

  // Self-appraisal form dialog
  formDialogVisible = false;
  selectedAppraisal: any = null;
  questions: any[] = [];
  groupedQuestions: { section: string; questions: any[] }[] = [];
  answers: { questionId: number; text: string; rating: number | null; comments: string }[] = [];
  achievements = '';
  goalsObjective = '';
  challenges = '';
  trainingNeeds = '';
  saving = false;
  ratingScale = [1, 2, 3, 4, 5];

  // Detail view
  detailDialogVisible = false;
  detailAppraisal: any = null;

  // Edit request
  editRequestDialogVisible = false;
  editRequestAppraisalId: number | null = null;
  editRequestReason = '';

  // HR: Edit requests list
  pendingEditRequests: any[] = [];
  isHRManager = false;


  constructor(
    private appraisalService: Appraisal,
    private messageService: MessageService
  ) { }

  ngOnInit() {
    this.isHRManager = this.loggedRoleId === 1;
    this.loadMyAppraisals();
  }

  // HR verify dialog
  verifyDialogVisible = false;
  verifyAppraisal: any = null;
  verifyStartDate: Date | null = null;
  verifyEndDate: Date | null = null;
  verifyDueDate: Date | null = null;

  // HR review dialog
  hrReviewDialogVisible = false;
  hrReviewAppraisal: any = null;
  hrReviewComments = '';
  hrRecommendations = '';

  // Edit request response dialog
  editResponseDialogVisible = false;
  editResponseItem: any = null;
  editResponseAction: 'APPROVE' | 'REJECT' = 'APPROVE';
  editRejectionReason = '';

  loadMyAppraisals() {
    this.loading = true;
    this.appraisalService.getAllAppraisals().subscribe({
      next: (data) => {
        this.myAppraisals = data.filter((a: any) => {
          // if (this.isHRManager) return true; // HR sees all statuses
          // Employee only sees appraisals that have been sent to them
          if (a.employeeId === this.loggedEmpId) {
            return !['AUTO_DRAFT', 'Draft'].includes(a.status);
          }
          return false;
        });
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadQuestions(appraisalId: number, existingAnswers: any[]) {
    this.appraisalService.getSelfQuestions(appraisalId).subscribe({
      next: (data) => {
        this.questions = data;
        // Group by section
        const sectionMap = new Map<string, any[]>();
        for (const q of data) {
          const sec = q.section || 'General';
          if (!sectionMap.has(sec)) sectionMap.set(sec, []);
          sectionMap.get(sec)!.push(q);
        }
        this.groupedQuestions = Array.from(sectionMap.entries()).map(([section, questions]) => ({ section, questions }));

        // Build answers array
        this.answers = data.map((q: any) => {
          const existing = existingAnswers.find((a: any) => a.questionId === q.id);
          return {
            questionId: q.id,
            text: q.text,
            rating: existing?.rating ?? null,
            comments: existing?.comments ?? '',
          };
        });
      }
    });
  }

  getAnswer(questionId: number) {
    return this.answers.find(a => a.questionId === questionId);
  }

  setRating(questionId: number, rating: number) {
    const answer = this.getAnswer(questionId);
    if (answer) answer.rating = rating;
  }

  groupAnswersBySection(answers: any[]): { section: string; answers: any[] }[] {
    const map = new Map<string, any[]>();
    for (const a of answers) {
      const sec = a.question?.section || 'General';
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(a);
    }
    return Array.from(map.entries()).map(([section, answers]) => ({ section, answers }));
  }

  fmtDate(d: any): string {
    if (!d) return '';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  // getStatusClass(a: any): string {
  //   switch (a.status) {
  //     case 'AUTO_DRAFT': return 'status-draft';
  //     case 'SELF_APPRAISAL_PENDING': return 'status-pending';
  //     case 'SELF_APPRAISAL_SUBMITTED': return 'status-submitted';
  //     case 'MANAGER_APPRAISAL_PENDING': return 'status-pending';
  //     case 'MANAGER_APPRAISAL_SUBMITTED': return 'status-submitted';
  //     case 'HR_REVIEW': return 'status-review';
  //     case 'EDIT_REQUESTED': return 'status-edit';
  //     case 'COMPLETED': return 'status-completed';
  //     default: return '';
  //   }
  // }
  getStatusClass(s: string): string {
    switch (s) {
      case 'AUTO_DRAFT':
        return 'status-draft';
      case 'SELF_APPRAISAL_PENDING':
      case 'MANAGER_APPRAISAL_PENDING':
      case 'PENDING_FILL':
        return 'status-pending';
      case 'SELF_APPRAISAL_SUBMITTED':
      case 'MANAGER_APPRAISAL_SUBMITTED':
        return 'status-submitted';
      case 'HR_REVIEW':
        return 'status-review';
      case 'EDIT_REQUESTED':
        return 'status-edit';
      case 'COMPLETED':
        return 'status-completed';
      default:
        return '';
    }
  }
  getStatusLabel(a: any): string {
    switch (a.status) {
      case 'AUTO_DRAFT':
        return 'Draft';

      case 'SELF_APPRAISAL_PENDING':
        return 'Self Appraisal Pending';

      case 'SELF_APPRAISAL_SUBMITTED':
        return 'Self Appraisal Submitted';

      case 'MANAGER_APPRAISAL_PENDING':
        return 'Manager Appraisal Pending';

      case 'MANAGER_APPRAISAL_SUBMITTED':
        return 'Manager Appraisal Submitted';

      case 'HR_REVIEW':
        return 'HR Review';

      case 'EDIT_REQUESTED':
        return 'Edit Requested';

      case 'COMPLETED':
        return 'Completed';

      case 'PENDING_FILL': {
        const selfDone = !!a.selfAppraisalSubmittedAt;
        const mgrDone = !!a.managerAppraisalSubmittedAt;
        if (selfDone && mgrDone) return 'Both Submitted';
        if (a.employee?.id === Number(localStorage.getItem('empId'))) {
          return selfDone ? 'Submitted' : 'Pending Fill';
        }
        return 'Pending Fill';
      }

      default:
        return a.status || '';
    }
  }

  canFillSelf(a: any): boolean {
    if (a.employeeId !== this.loggedEmpId) return false;
    if (!['PENDING_FILL', 'SELF_APPRAISAL_PENDING'].includes(a.status)) return false;
    if (a.selfAppraisalSubmittedAt) return false; // already submitted
    // Check due date
    if (a.dueDate && new Date(a.dueDate) < new Date()) return false;
    return true;
  }

  isDueDatePassed(a: any): boolean {
    return a.dueDate && new Date(a.dueDate) < new Date();
  }

  canRequestEdit(a: any): boolean {
    if (a.employeeId !== this.loggedEmpId) return false;
    if (!a.selfAppraisalSubmittedAt) return false; // nothing to edit
    if (['COMPLETED', 'HR_REVIEW'].includes(a.status)) return false; // HR already reviewing/completed
    return true;
  }

  // ── Open Self-Appraisal Form ────────────────────────────────────────
  openSelfAppraisalForm(appraisal: any) {
    this.selectedAppraisal = appraisal;
    this.achievements = '';
    this.goalsObjective = '';
    this.challenges = '';
    this.trainingNeeds = '';

    // Load existing data if any
    this.appraisalService.getAppraisalDetail(appraisal.id, 'EMPLOYEE').subscribe({
      next: (detail) => {
        if (detail.selfAppraisal) {
          this.achievements = detail.selfAppraisal.achievements || '';
          this.goalsObjective = detail.selfAppraisal.goalsObjective || '';
          this.challenges = detail.selfAppraisal.challenges || '';
          this.trainingNeeds = detail.selfAppraisal.trainingNeeds || '';
        }

        this.loadQuestions(appraisal.id, detail.selfAnswers || []);
        this.formDialogVisible = true;
      }
    });
  }

  saveSelfAppraisal(isDraft: boolean) {
    this.saving = true;
    this.appraisalService.submitSelfAppraisal(this.selectedAppraisal.id, {
      achievements: this.achievements,
      goalsObjective: this.goalsObjective,
      challenges: this.challenges,
      trainingNeeds: this.trainingNeeds,
      answers: this.answers.map(a => ({
        questionId: a.questionId,
        rating: a.rating,
        comments: a.comments || null,
      })),
      isDraft,
    }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success', summary: isDraft ? 'Saved' : 'Submitted',
          detail: isDraft ? 'Self-appraisal saved as draft' : 'Self-appraisal submitted successfully'
        });
        this.formDialogVisible = false;
        this.saving = false;
        this.loadMyAppraisals();
      },
      error: (e) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' });
        this.saving = false;
      }
    });
  }

  // ── View Detail ─────────────────────────────────────────────────────
  viewDetail(appraisal: any) {
    const role = this.isHRManager ? 'HR' : (appraisal.employeeId === this.loggedEmpId ? 'EMPLOYEE' : 'MANAGER');
    this.appraisalService.getAppraisalDetail(appraisal.id, role).subscribe({
      next: (data) => { this.detailAppraisal = data; this.detailDialogVisible = true; }
    });
  }

  // ── Edit Request ────────────────────────────────────────────────────
  openEditRequestDialog(appraisalId: number) {
    this.editRequestAppraisalId = appraisalId;
    this.editRequestReason = '';
    this.editRequestDialogVisible = true;
  }

  editRequestLoading = false;

  submitEditRequest() {
    if (!this.editRequestReason.trim()) return;
    this.editRequestLoading = true;
    this.appraisalService.requestEdit(this.editRequestAppraisalId!, {
      requestedBy: this.loggedEmpId,
      reason: this.editRequestReason,
      requestType: 'SELF',
    }).subscribe({
      next: () => {
        this.editRequestLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Submitted', detail: 'Edit request sent to HR' });
        this.editRequestDialogVisible = false;
        this.loadMyAppraisals();
      },
      error: (e) => { this.editRequestLoading = false; this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' }); }
    });
  }

  // ── HR: Verify & Send ───────────────────────────────────────────────
  canHRVerify(a: any): boolean {
    return this.isHRManager && ['AUTO_DRAFT', 'Draft'].includes(a.status);
  }

  canHRReview(a: any): boolean {
    return this.isHRManager && a.status === 'MANAGER_APPRAISAL_SUBMITTED';
  }

  canHRRespondEdit(a: any): boolean {
    return this.isHRManager && a.status === 'EDIT_REQUESTED';
  }

  openVerifyDialog(a: any) {
    this.verifyAppraisal = a;
    this.verifyStartDate = a.appraisalStartDate ? new Date(a.appraisalStartDate) : null;
    this.verifyEndDate = a.appraisalEndDate ? new Date(a.appraisalEndDate) : null;
    this.verifyDueDate = a.dueDate ? new Date(a.dueDate) : null;
    this.verifyDialogVisible = true;
  }

  confirmVerify() {
    this.appraisalService.hrVerifyAppraisal(this.verifyAppraisal.id, {
      appraisalStartDate: this.verifyStartDate?.toISOString(),
      appraisalEndDate: this.verifyEndDate?.toISOString(),
      dueDate: this.verifyDueDate?.toISOString(),
      hrVerifiedBy: this.loggedEmpId,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Verified', detail: 'Appraisal sent to employee & manager' });
        this.verifyDialogVisible = false;
        this.loadMyAppraisals();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  // ── HR: Review & Approve ────────────────────────────────────────────
  openHRReviewDialog(a: any) {
    this.hrReviewAppraisal = a;
    this.hrReviewComments = '';
    this.hrRecommendations = '';
    this.hrReviewDialogVisible = true;
  }

  submitHRReview(action: string) {
    this.appraisalService.hrReviewAppraisal(this.hrReviewAppraisal.id, {
      hrReviewComments: this.hrReviewComments,
      hrRecommendations: this.hrRecommendations,
      hrApprovedBy: this.loggedEmpId,
      action,
    }).subscribe({
      next: () => {
        this.messageService.add({
          severity: action === 'APPROVE' ? 'success' : 'info',
          summary: action === 'APPROVE' ? 'Approved' : 'Saved',
          detail: action === 'APPROVE' ? 'Appraisal approved & completed' : 'HR review saved'
        });
        this.hrReviewDialogVisible = false;
        this.loadMyAppraisals();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  // ── HR: Respond to Edit Request ─────────────────────────────────────
  openEditResponseDialog(a: any) {
    // Find the pending edit request for this appraisal
    this.appraisalService.getAppraisalDetail(a.id, 'HR').subscribe({
      next: (detail) => {
        const pending = (detail.editRequests || []).find((r: any) => r.status === 'PENDING');
        if (!pending) {
          this.messageService.add({ severity: 'warn', summary: 'No Request', detail: 'No pending edit request found' });
          return;
        }
        this.editResponseItem = pending;
        this.editResponseAction = 'APPROVE';
        this.editRejectionReason = '';
        this.editResponseDialogVisible = true;
      }
    });
  }

  confirmEditResponse() {
    this.appraisalService.respondEditRequest(this.editResponseItem.id, {
      action: this.editResponseAction,
      approvedBy: this.loggedEmpId,
      rejectionReason: this.editResponseAction === 'REJECT' ? this.editRejectionReason : undefined,
    }).subscribe({
      next: () => {
        this.messageService.add({
          severity: this.editResponseAction === 'APPROVE' ? 'success' : 'warn',
          summary: this.editResponseAction === 'APPROVE' ? 'Approved' : 'Rejected',
          detail: `Edit request ${this.editResponseAction.toLowerCase()}d`
        });
        this.editResponseDialogVisible = false;
        this.loadMyAppraisals();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }
}
