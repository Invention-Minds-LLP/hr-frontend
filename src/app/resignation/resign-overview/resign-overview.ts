import { Component } from '@angular/core';
import { ResignationForm } from "../resignation-form/resignation-form";
import { ResignationList } from "../resignation-list/resignation-list";
import { CommonModule } from '@angular/common';
import { ExitInterviewList } from "../exit-interview-list/exit-interview-list";
import { SurveyList } from "../../survey/survey-list/survey-list";
import { Clearances } from '../clearances/clearances';

@Component({
  selector: 'app-resign-overview',
  imports: [ResignationForm, ResignationList, CommonModule, ExitInterviewList, SurveyList, Clearances],
  templateUrl: './resign-overview.html',
  styleUrl: './resign-overview.css'
})
export class ResignOverview {
  active:string = 'list';

  tebleHaeding: string = 'Resignations'
  
  show(value: string){
    this.active = value;
    switch(value){
      case 'list':
        this.tebleHaeding = 'Resignations'
        break;
        case 'form':
          this.tebleHaeding = 'Resignations From'
    };
  }
}
