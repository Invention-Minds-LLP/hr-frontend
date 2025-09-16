import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { SurveryService, SurveyQuestion } from '../../services/surveyService/survery-service';
import { CommonModule } from '@angular/common';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ButtonModule } from 'primeng/button';
import { PanelModule } from 'primeng/panel';
import { Employee, Employees } from '../../services/employees/employees';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-survey-form',
  imports: [CommonModule, ReactiveFormsModule,
    AccordionModule,
    TableModule,
    InputTextModule,
    RadioButtonModule,
    ButtonModule,
    PanelModule
  ],
  templateUrl: './survey-form.html',
  styleUrl: './survey-form.css'
})
export class SurveyForm {
  form!: FormGroup;
  employeeDetails: any = {};
  today = new Date();
  groupedQuestions: { section: string; questions: any[] }[] = [];
  @Input() surveyData: any | null = null;   // input from list
  @Output() closeForm = new EventEmitter<void>(); // to notify parent
  sectionTitles: Record<string, string> = {
    A: 'Job Satisfaction',
    B: 'Satisfaction with the Work',
    C: 'Coworker Performance / Cooperation',
    D: 'Pay and Benefits Satisfaction',
    E: 'Promotions / Career Advancement',
    F: 'Supervisory Consideration',
    G: 'Supervisory Promotion of Team Work',
    H: 'Communication',
    I: 'Productivity / Efficiency',
    J: 'Training & Development',
    K: 'Concern for Patient Care / Customer Service',
    L: 'Strategy / Mission'
  };


  constructor(private fb: FormBuilder, private surveyApi: SurveryService, private employeeApi: Employees, private messageService: MessageService) { }


  ngOnInit() {
    // get employee details from localStorage
    const empData = {
      employeeId: localStorage.getItem('employeeId'),
      name: localStorage.getItem('name'),
      role: localStorage.getItem('role'),
      deptId: localStorage.getItem('deptId'),
      empId: localStorage.getItem('empId'),
    };

    // init form
    this.form = this.fb.group({
      employeeId: [empData.empId || ''], // send only this to backend
      answers: this.fb.array([]),
    });

    // store for UI display only
    this.employeeDetails = empData;

    if (this.surveyData) {
      this.employeeApi.getEmployeeById(this.surveyData.employee.id).subscribe(emp => {
        this.employeeDetails = {
          name: emp.firstName + ' ' + emp.lastName,
          employeeId: emp.employeeCode,      // or emp.id if you want DB id
          role: emp.designation,
          deptId: emp.departmentId,
        };

        const arr = this.surveyData.responses.map((r: any) =>
          this.fb.group({
            questionId: [r.questionId],
            answer: [r.answer, Validators.required],
          })
        );
        this.form.setControl('answers', this.fb.array(arr));

        // group for UI
        const groups: Record<string, any[]> = {};
        this.surveyData.responses.forEach((r: any) => {
          if (!groups[r.question.section]) groups[r.question.section] = [];
          groups[r.question.section].push(r.question);
        });
        this.groupedQuestions = Object.keys(groups).map(sec => ({
          section: sec,
          questions: groups[sec],
        }));

        this.form.patchValue({ employeeId: emp.id });
      });
    } else {
      // if new survey
      this.surveyApi.getQuestions().subscribe(questions => {
        const arr = questions.map((q: any) =>
          this.fb.group({
            questionId: [q.id],
            answer: ['', Validators.required],
          })
        );
        this.form.setControl('answers', this.fb.array(arr));

        const groups: Record<string, any[]> = {};
        questions.forEach((q: any) => {
          if (!groups[q.section]) groups[q.section] = [];
          groups[q.section].push(q);
        });
        this.groupedQuestions = Object.keys(groups).map(sec => ({
          section: sec,
          questions: groups[sec],
        }));
      });
    }
  }



  get answers() {
    return this.form.get('answers') as FormArray;
  }


  onSubmit() {
    if (this.form.valid) {
      this.surveyApi.submitSurvey(this.form.value).subscribe(() => {
        // alert('Survey submitted successfully!');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Survey submitted successfully!'

        })
        this.form.reset();
        this.currentIndex = 0
      });
    }


  }
  findAnswerIndex(questionId: number): number {
    return this.answers.controls.findIndex(
      (ctrl) => ctrl.value.questionId === questionId
    );
  }
  getFormGroupFor(questionId: number): FormGroup {
    return this.answers.at(this.findAnswerIndex(questionId)) as FormGroup;
  }

  isCurrentPanelValid(): boolean {
    if (!this.groupedQuestions.length) return false;

    const currentGroup = this.groupedQuestions[this.currentIndex];
    return currentGroup.questions.every(q => {
      const control = this.getFormGroupFor(q.id).get('answer');
      return control && control.value; 
    });
  }


  currentIndex = 0;

  nextCard() {
    if (this.currentIndex < this.groupedQuestions.length - 1) {
      this.currentIndex++;
    }
  }

  prevCard() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

}
