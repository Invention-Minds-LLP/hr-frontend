import { Component } from '@angular/core';
import { QuestionBank } from '../question-bank/question-bank/question-bank';
import { CommonModule } from '@angular/common';
import { TestCreation } from "../test-creation/test-creation";
import { TestAssignment } from "../test-assignment/test-assignment";
import { AllTest } from "../all-test/all-test";
import { AssignedTest } from "../assigned-test/assigned-test";
import { TrainingForm } from '../../training/training-form/training-form';
import { TrainingList } from '../../training/training-list/training-list';
import { TrainingOverview } from "../../training/training-overview/training-overview";

@Component({
  selector: 'app-evaluation-overview',
  imports: [CommonModule, QuestionBank, AllTest, AssignedTest, TrainingForm, TrainingList, TrainingOverview],
  templateUrl: './evaluation-overview.html',
  styleUrl: './evaluation-overview.css'
})
export class EvaluationOverview {
  active: string = 'form';
  selectedEmployee: any = null;
  tableHeading: string = 'Question Bank List'

  show(value: string) {
    this.active = value;
    switch (value) {
      case 'form':
        this.tableHeading = 'Question Bank List';
        break;
      case 'test':
        this.tableHeading = 'Test Creation';
        break
      case 'assigned':
        this.tableHeading = 'Assigned Tests'
        break
        default:
        this.tableHeading = 'Question Bank List'
    }

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
