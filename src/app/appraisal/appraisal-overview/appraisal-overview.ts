import { Component } from '@angular/core';
import { AppraisalTable} from '../appraisal-table/appraisal-table/appraisal-table';
import { ApprasialForm } from '../appraisal-form/apprasial-form/apprasial-form';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-appraisal-overview',
  imports: [CommonModule, AppraisalTable, ApprasialForm],
  templateUrl: './appraisal-overview.html',
  styleUrl: './appraisal-overview.css'
})
export class AppraisalOverview {
  active:string = 'list';
  selectedAppraisal: any = null;
  
  show(value: string){
    this.active = value;
  }
  onEditAppraisal(appraisal: any) {
    this.selectedAppraisal = appraisal;
    this.active = 'form'; // Switch to form view
  }

  // After form is saved/submitted
  onFormSubmitted() {
    this.active = 'list';
    this.selectedAppraisal = null;
  }
}
