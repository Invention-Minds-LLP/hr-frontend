import { Component } from '@angular/core';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { AppraisalTable} from '../appraisal-table/appraisal-table/appraisal-table';
import { ApprasialForm } from '../appraisal-form/apprasial-form/apprasial-form';
import { CommonModule } from '@angular/common';
import { DeptPerformance } from "../dept-performance/dept-performance";
import { SelfAppraisalComponent } from "../self-appraisal/self-appraisal";
import { WeeklyRatingOverview } from "../../weekly-rating/weekly-rating-overview";
import { ReviewQuestionsMaster } from "../review-questions-master/review-questions-master";
import { AppraisalReviewForm } from "../appraisal-review-form/appraisal-review-form";
import { PerformanceTemplateManager } from "../performance-template-manager/performance-template-manager";

@Component({
  selector: 'app-appraisal-overview',
  imports: [CommonModule, AppraisalTable, ApprasialForm, DeptPerformance, SelfAppraisalComponent, WeeklyRatingOverview, ModuleGuide, ReviewQuestionsMaster, AppraisalReviewForm, PerformanceTemplateManager],
  templateUrl: './appraisal-overview.html',
  styleUrl: './appraisal-overview.css'
})
export class AppraisalOverview {
  active: string = 'list';
  selectedAppraisal: any = null;
  formType: 'MANAGER' | 'MANAGEMENT' = 'MANAGER';
  /** Level passed to the new dynamic review form. */
  reviewLevel: 'INCHARGE' | 'MANAGER' | 'MANAGEMENT' = 'MANAGER';
  /** When true, the review form opens read-only (post-submit view). */
  reviewReadOnly = false;
  isIncharge = Number(localStorage.getItem('roleId')) === 5;

  readonly isHRExecutive =
    Number(localStorage.getItem('deptId')) === 1 &&
    Number(localStorage.getItem('roleId')) === 2;

  // HR Manager (roleId 1) or HR Executive (dept 1 + role 2) can manage the
  // master review-question pool.
  readonly canManageQuestions =
    Number(localStorage.getItem('roleId')) === 1 || this.isHRExecutive;

  show(value: string) {
    this.active = value;
  }

  onEditAppraisal(appraisal: any) {
    const ft = appraisal.formType;
    this.selectedAppraisal = appraisal;
    // Caller (table) sets readOnly:true on the emitted object for "View My
    // Review" paths so the form opens disabled with no submit buttons.
    this.reviewReadOnly = !!appraisal.readOnly;

    if (ft === 'INCHARGE' || ft === 'MANAGER' || ft === 'MANAGEMENT') {
      // All three reviewer levels use the new dynamic review form
      // (DB-driven questions from AppraisalReviewQuestion).
      this.reviewLevel = ft;
      this.active = 'review';
    } else {
      // Fallback: legacy "See Details" form for any unspecified formType.
      this.formType = 'MANAGER';
      this.active = 'form';
    }
  }

  // After form is saved/submitted
  onFormSubmitted() {
    this.active = 'list';
    this.selectedAppraisal = null;
  }
}
