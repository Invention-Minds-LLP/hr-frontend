import { Component } from '@angular/core';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { AppraisalTable} from '../appraisal-table/appraisal-table/appraisal-table';
import { ApprasialForm } from '../appraisal-form/apprasial-form/apprasial-form';
import { CommonModule } from '@angular/common';
import { DeptPerformance } from "../dept-performance/dept-performance";
import { SelfAppraisalComponent } from "../self-appraisal/self-appraisal";
import { WeeklyRatingOverview } from "../../weekly-rating/weekly-rating-overview";

@Component({
  selector: 'app-appraisal-overview',
  imports: [CommonModule, AppraisalTable, ApprasialForm, DeptPerformance, SelfAppraisalComponent, WeeklyRatingOverview, ModuleGuide],
  templateUrl: './appraisal-overview.html',
  styleUrl: './appraisal-overview.css'
})
export class AppraisalOverview {
  active: string = 'list';
  selectedAppraisal: any = null;
  formType: 'MANAGER' | 'MANAGEMENT' = 'MANAGER';

  show(value: string) {
    this.active = value;
  }

  onEditAppraisal(appraisal: any) {
    this.formType = appraisal.formType === 'MANAGEMENT' ? 'MANAGEMENT' : 'MANAGER';
    this.selectedAppraisal = appraisal;
    this.active = 'form';
  }

  // After form is saved/submitted
  onFormSubmitted() {
    this.active = 'list';
    this.selectedAppraisal = null;
  }
}
