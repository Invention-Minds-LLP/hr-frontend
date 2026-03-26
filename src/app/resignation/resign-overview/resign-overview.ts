import { Component } from '@angular/core';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { ResignationForm } from "../resignation-form/resignation-form";
import { ResignationList } from "../resignation-list/resignation-list";
import { CommonModule } from '@angular/common';
import { ExitInterviewList } from "../exit-interview-list/exit-interview-list";
import { SurveyList } from "../../survey/survey-list/survey-list";
import { Clearances } from '../clearances/clearances';

@Component({
  selector: 'app-resign-overview',
  imports: [ResignationForm, ResignationList, CommonModule, ExitInterviewList, SurveyList, Clearances, ModuleGuide],
  templateUrl: './resign-overview.html',
  styleUrl: './resign-overview.css'
})
export class ResignOverview {
  active:string = 'list';
  roleId: number = Number(localStorage.getItem('roleId')) || 0;
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
