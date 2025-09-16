import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { PerformanceService } from '../../services/performances/performance-service';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';

@Component({
  selector: 'app-appraisal-template',
  imports: [CommonModule, ReactiveFormsModule, TabsModule, FormsModule, TableModule, InputTextModule, TextareaModule, SelectModule,
    ButtonModule, FloatLabelModule
  ],
  templateUrl: './appraisal-template.html',
  styleUrl: './appraisal-template.css'
})
export class AppraisalTemplate {
  template: any;
  departmentId = 2; // Radiology
  cycle = "APR-2024 TO MAR-2025";
  employeeId = 11;
  currentPeriod: 'MONTH_1' | 'MONTH_3' | 'MONTH_6' | 'YEAR_1' | 'YEAR_2' = 'MONTH_1';


  // Overall summary structure
  summary: any = {
    MONTH_1: {}, MONTH_3: {}, MONTH_6: {}, YEAR_1: {}, YEAR_2: {}
  };
  scoreOptions = [
    { label: '1 - Poor', value: 1 },
    { label: '2 - Satisfactory', value: 2 },
    { label: '3 - Good', value: 3 },
    { label: '4 - Very Good', value: 4 },
    { label: '5 - Excellent', value: 5 }
  ];

  performanceOptions = [
    { label: 'Outstanding (190+)', value: 'Outstanding' },
    { label: 'Commendable (160-190)', value: 'Commendable' },
    { label: 'Acceptable (120-159)', value: 'Acceptable' },
    { label: 'Not Acceptable (0-119)', value: 'Not Acceptable' }
  ];

  summaryPeriods = ['MONTH_1', 'MONTH_3', 'MONTH_6', 'YEAR_1', 'YEAR_2'];

  setCurrentPeriod(joiningDate: Date) {
    const months = Math.floor((Date.now() - joiningDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (months < 1) return 'MONTH_1';
    if (months < 3) return 'MONTH_3';
    if (months < 6) return 'MONTH_6';
    if (months < 12) return 'YEAR_1';
    return 'YEAR_2';
  }


  // Final review structure
  finalReview: any = {
    appreciations: "",
    talents: "",
    overallComments: "",
    employeeSig: "",
    supervisorSig: "",
    hrSig: ""
  };

  constructor(private formService: PerformanceService) { }

  ngOnInit() {

    this.formService.getEmployeeForm(this.employeeId, this.departmentId, this.cycle).subscribe(data => {
      this.template = {
        ...data.template,
        questions: data.template.questions.map((q: any) => ({
          ...q,
          periods: {
            MONTH_1: { period: 'MONTH_1', score: this.findResponseScore(data.responses, q.id, 'MONTH_1') },
            MONTH_3: { period: 'MONTH_3', score: this.findResponseScore(data.responses, q.id, 'MONTH_3') },
            MONTH_6: { period: 'MONTH_6', score: this.findResponseScore(data.responses, q.id, 'MONTH_6') },
            YEAR_1: { period: 'YEAR_1', score: this.findResponseScore(data.responses, q.id, 'YEAR_1') },
            YEAR_2: { period: 'YEAR_2', score: this.findResponseScore(data.responses, q.id, 'YEAR_2') }
          }
        }))
      };
      // ✅ auto assign currentPeriod based on employee DOJ (from API ideally)
      if (data.employee?.dateOfJoining) {
        this.currentPeriod = this.setCurrentPeriod(new Date(data.employee.dateOfJoining));
      }

      // preload summary
      this.summary = this.mapSummaries(data.summaries);

      // preload final review
      if (data.finalReview) this.finalReview = data.finalReview;
    });


  }
  findResponseScore(responses: any[], questionId: number, period: string) {
    const r = responses.find(x => x.questionId === questionId && x.period === period);
    return r ? r.score : null;
  }

  mapSummaries(summaries: any[]) {
    const obj: any = { MONTH_1: {}, MONTH_3: {}, MONTH_6: {}, YEAR_1: {}, YEAR_2: {} };
    for (let s of summaries) {
      obj[s.period] = {
        marksScored: s.marksScored,
        overallPerf: s.overallPerf,
        employeeSig: s.employeeSig,
        supervisorSig: s.supervisorSig,
        hodSig: s.hodSig
      };
    }
    return obj;
  }



  onSubmit() {
    // 1) Flatten responses
    const flattenedResponses: any[] = [];
    this.template.questions.forEach((q: any) => {
      Object.values(q.periods).forEach((p: any) => {
        if (p.score !== null && p.score !== undefined) {
          flattenedResponses.push({
            questionId: q.id,
            period: p.period,
            score: p.score,
            reviewerId: null,
            comments: null
          });
        }
      });
    });
  
    // 2) Flatten summaries
    const flattenedSummaries: any[] = [];
    this.summaryPeriods.forEach(period => {
      const s = this.summary[period];
      if (s && (s.marksScored || s.overallPerf)) {
        flattenedSummaries.push({
          period,
          marksScored: s.marksScored,
          overallPerf: s.overallPerf,
          employeeSig: s.employeeSig,
          supervisorSig: s.supervisorSig,
          hodSig: s.hodSig
        });
      }
    });
  
    // 3) Build final payload
    const payload = {
      employeeId: this.employeeId,
      departmentId: this.departmentId,
      cycle: this.cycle,
      responses: flattenedResponses,
      summaries: flattenedSummaries,
      finalReview: this.finalReview
    };
  
    console.log("Submitting payload:", payload);
  
    // 4) Call backend
    this.formService.submitFullForm(payload).subscribe({
      next: (res) => {
        console.log("Form submitted successfully", res);
      },
      error: (err) => {
        console.error("Error submitting form", err);
      }
    });
  }
  updateMarksScored() {
    if (!this.template || !this.template.questions) return;
  
    let total = 0;
    this.template.questions.forEach((q: any) => {
      const score = q.periods[this.currentPeriod].score;
      if (score) total += score;
    });
  
    this.summary[this.currentPeriod].marksScored = total;
    let performance = 'Not Acceptable';
    if (total >= 190) performance = 'Outstanding';
    else if (total >= 160) performance = 'Commendable';
    else if (total >= 120) performance = 'Acceptable';
    else performance = 'Not Acceptable';
  
    this.summary[this.currentPeriod].overallPerf = performance;
  }
  
  
}
