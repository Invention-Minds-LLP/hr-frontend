import { Component } from '@angular/core';
import { QuestionBank } from '../question-bank/question-bank/question-bank';
import { CommonModule } from '@angular/common';
import { TestCreation } from "../test-creation/test-creation";
import { TestAssignment } from "../test-assignment/test-assignment";
import { AllTest } from "../all-test/all-test";
import { AssignedTest } from "../assigned-test/assigned-test";

@Component({
  selector: 'app-evaluation-overview',
  imports: [CommonModule, QuestionBank, AllTest, AssignedTest],
  templateUrl: './evaluation-overview.html',
  styleUrl: './evaluation-overview.css'
})
export class EvaluationOverview {
  active:string = 'form';
  selectedEmployee: any = null;

  show(value: string){
    this.active = value;
  }
  onEditEmployee(employee: any) {
    this.selectedEmployee = employee;
    this.active = 'form';
  }
  onFormClose(refreshList: boolean = false) {
    this.selectedEmployee = null;
    this.active = 'list';
  }
}
