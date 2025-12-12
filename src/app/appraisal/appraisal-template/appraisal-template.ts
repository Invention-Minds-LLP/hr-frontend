import { CommonModule } from '@angular/common';
import { Component, Input, ElementRef, ViewChild, Output, EventEmitter, ViewChildren, QueryList } from '@angular/core';
import SignaturePad from 'signature_pad';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { PerformanceService } from '../../services/performances/performance-service';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { Incident } from '../../services/incident/incident';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-appraisal-template',
  imports: [CommonModule, ReactiveFormsModule, TabsModule, FormsModule,
     TableModule, InputTextModule, TextareaModule, SelectModule, DialogModule,
    ButtonModule, FloatLabelModule
  ],
  templateUrl: './appraisal-template.html',
  styleUrl: './appraisal-template.css',
  providers: [MessageService]
})
export class AppraisalTemplate {
  template: any;
  employeeCode!: string;
  employeeId!: number;
  departmentId!: number;
  cycle!: string;
  currentPeriod: 'MONTH_1' | 'MONTH_3' | 'MONTH_6' | 'YEAR_1' = 'MONTH_1';
  joiningDate: any;
  employeeName: string = '';
  @Input() summaryData: any;
  @Output() closeForm = new EventEmitter<void>();

  incidentDialogVisible = false;
  incidents: any[] = [];
  loadingIncidents = false;
  isLoading = false;  



  // Overall summary structure
  summary: any = {
    MONTH_1: {}, MONTH_3: {}, MONTH_6: {}, YEAR_1: {} //, YEAR_2: {}
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

  summaryPeriods = ['MONTH_1', 'MONTH_3', 'MONTH_6', 'YEAR_1'];
  setCurrentPeriod(joiningDate: Date, cycle: string) {
    // Parse cycle
    const { start: cycleStart, end: cycleEnd } = this.parseCycle(cycle);

    // Employee starts AFTER cycle → use actual joining date
    const effectiveStart = joiningDate > cycleStart ? joiningDate : cycleStart;

    // Today capped to cycle end
    const today = new Date();
    const effectiveToday = today > cycleEnd ? cycleEnd : today;

    const months = this.monthsBetween(effectiveStart, effectiveToday);
    console.log("Months inside cycle =", months);

    if (months < 1) return "MONTH_1";
    if (months < 3) return "MONTH_3";
    if (months < 6) return "MONTH_6";
    if (months < 12) return "YEAR_1";
    return "YEAR_1";
    // return "YEAR_2";
  }


  parseCycle(cycle: string) {
    const [from, , to] = cycle.split(" ");
    const start = new Date(from.replace("-", " "));
    const end = new Date(to.replace("-", " "));
    return { start, end };
  }
  monthsBetween(d1: Date, d2: Date) {
    return (
      d2.getFullYear() * 12 + d2.getMonth() - (d1.getFullYear() * 12 + d1.getMonth())
    );
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

  @ViewChildren('empCanvas') empCanvasRefs!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChildren('supCanvas') supCanvasRefs!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChildren('hodCanvas') hodCanvasRefs!: QueryList<ElementRef<HTMLCanvasElement>>;

  empPads: Record<string, SignaturePad> = {};
  supPads: Record<string, SignaturePad> = {};
  hodPads: Record<string, SignaturePad> = {};

  @ViewChild('finalEmpCanvas') finalEmpCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('finalSupCanvas') finalSupCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('finalHrCanvas') finalHrCanvas!: ElementRef<HTMLCanvasElement>;

  finalEmpPad!: SignaturePad;
  finalSupPad!: SignaturePad;
  finalHrPad!: SignaturePad;



  constructor(private formService: PerformanceService, private incidentService: Incident, private messageService: MessageService) { }

  ngOnInit() {
    if (this.summaryData) {
      this.employeeId = this.summaryData.employeeId;
      this.departmentId = this.summaryData.departmentId;
      this.cycle = this.summaryData.cycle;
      this.employeeCode = this.summaryData.employee.employeeCode;
      console.log(this.summaryData);
      this.employeeName = this.summaryData.employee.firstName + ' ' + this.summaryData.employee.lastName;
    }
    else {
      console.error("No summary data provided to appraisal template");
      this.employeeId = 11;
      this.departmentId = 2;
      this.cycle = 'APR-2024 TO MAR-2025'


    }

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
            // YEAR_2: { period: 'YEAR_2', score: this.findResponseScore(data.responses, q.id, 'YEAR_2') }
          }
        }))
      };
      // ✅ auto assign currentPeriod based on employee DOJ (from API ideally)
      if (data.employee?.dateOfJoining) {
        this.joiningDate = new Date(data.employee.dateOfJoining).toLocaleDateString();
        this.currentPeriod = this.setCurrentPeriod(new Date(data.employee.dateOfJoining), this.cycle) as any;
        console.log("Set currentPeriod to", this.currentPeriod);
        this.initializeSignaturePads()
      }


      // preload summary
      this.summary = this.mapSummaries(data.summaries);

      // preload final review
      if (data.finalReview) this.finalReview = data.finalReview;
    });


  }

  // ngAfterViewInit() {
  //   this.initializeSignaturePads();
  // }


  initializeSignaturePads() {
    setTimeout(() => {
      console.log("Initializing signature pads with locking rules...");

      /* -------------------------
         EMPLOYEE SIGNATURE PAD
      ------------------------- */
      this.empCanvasRefs.forEach(canvas => {
        const period = canvas.nativeElement.getAttribute("data-period");
        const savedSig = this.summary[period!]?.employeeSig;

        const isCurrent = (period === this.currentPeriod);
        const hasSignature = savedSig && savedSig.startsWith("data:image");

        if (!this.empPads[period!]) {
          this.empPads[period!] = new SignaturePad(canvas.nativeElement, {
            minWidth: 1,
            maxWidth: 2,
          });
        }

        const pad = this.empPads[period!];

        if (hasSignature) {
          console.log("EMP: loading saved signature for", period);
          pad.fromDataURL(savedSig);

          pad.off(); // disable drawing
          canvas.nativeElement.style.pointerEvents = "none";
        } else if (isCurrent) {
          console.log("EMP: enabling drawing for", period);
          pad.clear();
          pad.on();
          canvas.nativeElement.style.pointerEvents = "auto";
        } else {
          console.log("EMP: disabled (not current period)", period);
          pad.clear();
          pad.off();
          canvas.nativeElement.style.pointerEvents = "none";
        }
      });



      /* -------------------------
         SUPERVISOR SIGNATURE PAD
      ------------------------- */
      this.supCanvasRefs.forEach(canvas => {
        const period = canvas.nativeElement.getAttribute("data-period");
        const savedSig = this.summary[period!]?.supervisorSig;

        const isCurrent = (period === this.currentPeriod);
        const hasSignature = savedSig && savedSig.startsWith("data:image");

        if (!this.supPads[period!]) {
          this.supPads[period!] = new SignaturePad(canvas.nativeElement, {
            minWidth: 1,
            maxWidth: 2,
          });
        }

        const pad = this.supPads[period!];

        if (hasSignature) {
          console.log("SUP: loading saved signature for", period);
          pad.fromDataURL(savedSig);

          pad.off();
          canvas.nativeElement.style.pointerEvents = "none";
        } else if (isCurrent) {
          console.log("SUP: enabling drawing for", period);
          pad.clear();
          pad.on();
          canvas.nativeElement.style.pointerEvents = "auto";
        } else {
          console.log("SUP: disabled (not current)", period);
          pad.clear();
          pad.off();
          canvas.nativeElement.style.pointerEvents = "none";
        }
      });



      /* -------------------------
         HOD SIGNATURE PAD
      ------------------------- */
      this.hodCanvasRefs.forEach(canvas => {
        const period = canvas.nativeElement.getAttribute("data-period");
        const savedSig = this.summary[period!]?.hodSig;

        const isCurrent = (period === this.currentPeriod);
        const hasSignature = savedSig && savedSig.startsWith("data:image");

        if (!this.hodPads[period!]) {
          this.hodPads[period!] = new SignaturePad(canvas.nativeElement, {
            minWidth: 1,
            maxWidth: 2,
          });
        }

        const pad = this.hodPads[period!];

        if (hasSignature) {
          console.log("HOD: loading saved signature for", period);
          pad.fromDataURL(savedSig);

          pad.off();
          canvas.nativeElement.style.pointerEvents = "none";
        } else if (isCurrent) {
          console.log("HOD: enabling drawing for", period);
          pad.clear();
          pad.on();
          canvas.nativeElement.style.pointerEvents = "auto";
        } else {
          console.log("HOD: disabled (not current)", period);
          pad.clear();
          pad.off();
          canvas.nativeElement.style.pointerEvents = "none";
        }
      });

      if (this.finalEmpCanvas && !this.finalEmpPad) {
        console.log("Initializing final employee signature pad");
        this.finalEmpPad = new SignaturePad(this.finalEmpCanvas.nativeElement);
        if (this.finalReview.employeeSig?.startsWith("data:image")) {
          this.finalEmpPad.fromDataURL(this.finalReview.employeeSig);
          this.finalEmpPad.off();
          this.finalEmpCanvas.nativeElement.style.pointerEvents = "none";
        }
      }

      if (this.finalSupCanvas && !this.finalSupPad) {
        this.finalSupPad = new SignaturePad(this.finalSupCanvas.nativeElement);
        if (this.finalReview.supervisorSig?.startsWith("data:image")) {
          this.finalSupPad.fromDataURL(this.finalReview.supervisorSig);
          this.finalSupPad.off();
          this.finalSupCanvas.nativeElement.style.pointerEvents = "none";
        }
      }

      if (this.finalHrCanvas && !this.finalHrPad) {
        this.finalHrPad = new SignaturePad(this.finalHrCanvas.nativeElement);
        if (this.finalReview.hrSig?.startsWith("data:image")) {
          this.finalHrPad.fromDataURL(this.finalReview.hrSig);
          this.finalHrPad.off();
          this.finalHrCanvas.nativeElement.style.pointerEvents = "none";
        }
      }

    }, 50);
  }



  saveSignature(role: 'emp' | 'sup' | 'hod', period: string) {
    let pad: SignaturePad;

    if (role === 'emp') pad = this.empPads[period];
    else if (role === 'sup') pad = this.supPads[period];
    else pad = this.hodPads[period];

    if (!pad || pad.isEmpty()) return;

    const data = pad.toDataURL();

    if (role === 'emp') this.summary[period].employeeSig = data;
    if (role === 'sup') this.summary[period].supervisorSig = data;
    if (role === 'hod') this.summary[period].hodSig = data;
  }

  clearSignature(role: 'emp' | 'sup' | 'hod', period: string) {
    let pad: SignaturePad;

    if (role === 'emp') pad = this.empPads[period];
    else if (role === 'sup') pad = this.supPads[period];
    else pad = this.hodPads[period];

    if (!pad) return;

    pad.clear();

    if (role === 'emp') this.summary[period].employeeSig = '';
    if (role === 'sup') this.summary[period].supervisorSig = '';
    if (role === 'hod') this.summary[period].hodSig = '';
  }

  findResponseScore(responses: any[], questionId: number, period: string) {
    const r = responses.find(x => x.questionId === questionId && x.period === period);
    return r ? r.score : null;
  }

  mapSummaries(summaries: any[]) {
    const obj: any = { MONTH_1: {}, MONTH_3: {}, MONTH_6: {}, YEAR_1: {} };
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
    this.isLoading = true;
    console.log("Submitting payload:", payload);

    // 4) Call backend
    this.formService.submitFullForm(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Form submitted successfully.' });
        console.log("Form submitted successfully", res);
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error submitting form.' });
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

  saveFinalSignature(role: 'emp' | 'sup' | 'hr') {
    let pad: SignaturePad;

    if (role === 'emp') pad = this.finalEmpPad;
    else if (role === 'sup') pad = this.finalSupPad;
    else pad = this.finalHrPad;

    if (pad.isEmpty()) return;

    const data = pad.toDataURL();

    if (role === 'emp') this.finalReview.employeeSig = data;
    if (role === 'sup') this.finalReview.supervisorSig = data;
    if (role === 'hr') this.finalReview.hrSig = data;
  }

  clearFinalSignature(role: 'emp' | 'sup' | 'hr') {
    let pad: SignaturePad;

    if (role === 'emp') pad = this.finalEmpPad;
    else if (role === 'sup') pad = this.finalSupPad;
    else pad = this.finalHrPad;

    pad.clear();

    if (role === 'emp') this.finalReview.employeeSig = '';
    if (role === 'sup') this.finalReview.supervisorSig = '';
    if (role === 'hr') this.finalReview.hrSig = '';
  }
  openIncidentPopup() {
    if (!this.employeeId) return;

    this.loadingIncidents = true;
    this.incidentDialogVisible = true;

    this.incidentService.getIncidentsByEmployee(this.employeeId).subscribe({
      next: (data) => {
        this.incidents = data;
        this.loadingIncidents = false;
      },
      error: () => {
        this.loadingIncidents = false;
        this.incidents = [];
      }
    });
  }

}
