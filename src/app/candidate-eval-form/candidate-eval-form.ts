

import { Component, computed, signal, effect, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

// PrimeNG (swap for your UI lib as needed)
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DatePicker } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import { Recuriting } from '../services/recruiting/recuriting';
import { Departments, Department } from '../services/departments/departments';
import { ProgressBar } from 'primeng/progressbar';
import { Tag } from 'primeng/tag';
import { MessageService } from 'primeng/api';

function score01Validator(ctrl: AbstractControl): ValidationErrors | null {
  const v = ctrl.value;
  if (v == null || v === '') return null;
  return (typeof v === 'number' && v >= 0 && v <= 10) ? null : { range: true };
}

type SelectOpt = { label: string; value: string };

@Component({
  selector: 'app-candidate-eval-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    CardModule, InputTextModule, DatePicker, SelectModule,
    InputNumberModule, TextareaModule, ButtonModule, DividerModule, ChipModule, ProgressBar,Tag
  ],
  templateUrl: './candidate-eval-form.html',
  styleUrl: './candidate-eval-form.css'
})
export class CandidateEvalForm {
  // ---- form ----
  form: any;
  saving: boolean = false;
  panelId: number | null = null;
  departments: SelectOpt[] = [];
  isRestricted = false; // set based on role and department
  username = '';
  yesNo = ['Yes', 'No'].map(x => ({ label: x, value: x }));
  role: string = 'panel'; // or 'hr' based on your auth logic
  // at top of class
  expectedPanelIds: number[] = [];
  totalPanelMembers = 0;
  submittedCount = 0;
  reviewerUserId: number | null = null; // set from auth service if you have it
  deptId:number | null = null; // set from auth service if you have it

  viewAllPanelReadOnly = false; // true if restricted -> show all read-only
  isPanelMember:boolean = false;

  isHr:boolean = false;

  @Input() interviewId!: number;
  private pendingInterview: any | null = null;
  @Input() set interview(v: any | null) {
    if (!v) return;
    if (this.isRestricted === null) {     // not decided yet → buffer
      this.pendingInterview = v;
      return;
    }
    this.populateFromInterview(v);
  }

  // departments = ['Engineering', 'Operations', 'HR', 'Finance', 'Nursing', 'Pharmacy']
  //   .map(x => ({ label: x, value: x }));
  // yesNo = ['Yes','No'].map(x => ({label:x, value:x}));

  criteria = [
    { key: 'jobSkills', label: 'Job skills' },
    { key: 'jobKnowledge', label: 'Job knowledge' },
    { key: 'attitude', label: 'Attitude & behavior' },
    { key: 'communication', label: 'Communication skills' }
  ] as const;
  private loadDepartments() {
    this.deptSvc.getDepartments().subscribe({
      next: (list: Department[]) => {
        // map API -> PrimeNG options; keep value = name to avoid changing your form control type
        this.departments = (list || []).map(d => ({ label: d.name, value: d.name }));
      },
      error: (err) => {
        console.error('Failed to load departments', err);
        this.departments = []; // fallback empty
      }
    });
  }
  constructor(private fb: FormBuilder,private api: Recuriting, private deptSvc: Departments, private messageService : MessageService) {
    this.form = this.fb.group({
      candidate: this.fb.group({
        name: this.fb.control<string>('', { validators: Validators.required, nonNullable: true }),
        date: this.fb.control<Date | null>(null, { validators: Validators.required }),
        position: this.fb.control<string>('', { validators: Validators.required, nonNullable: true }),
        department: this.fb.control<string | null>(null, { validators: Validators.required }),
        qualification: this.fb.control<string>(''),
        experienceYears: this.fb.control<number | null>(null),
      }),
      panel: this.fb.array<FormGroup>([]),
      conclusion: this.fb.control<string>('Shortlisted', { validators: Validators.required, nonNullable: true }),
      remarks: this.fb.control<string>(''),
      hr: this.fb.group({
        presentSalary: this.fb.control<number | null>(null),
        payslip: this.fb.control<'Yes' | 'No'>('No', { nonNullable: true }),
        expectedSalary: this.fb.control<number | null>(null),
        grossOffer: this.fb.control<number | null>(null),
        expectedDoj: this.fb.control<Date | null>(null),
        noticePeriod: this.fb.control<number | null>(null),
      }),
    });
    // start with two panelists (you can change)
    this.addPanelist();
    
    const deptRaw =
      localStorage.getItem('deptId') ||
      (JSON.parse(localStorage.getItem('user') || '{}')?.deptId ?? '');
    const deptId = Number(deptRaw) || 0;

    // Restrict only Executives not in dept 1
    this.isRestricted = (deptId === 1);
    this.panelId = Number(localStorage.getItem('empId')) || null; // or set from route param or service
    this.reviewerUserId = Number(localStorage.getItem('empId')) || null; // set from auth service if you have it
    // this.addPanelist();
  }
  private normalizeRole(raw: any): string {
    const s = (raw || '').toString().trim().toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
    const map: Record<string, string> = {
      'executive': 'EXECUTIVE',
      'executives': 'EXECUTIVE',
      'junior executive': 'JUNIOR_EXECUTIVE',
      'jr executive': 'JUNIOR_EXECUTIVE',
      'jr. executive': 'JUNIOR_EXECUTIVE',
      'intern': 'INTERN',
      'interns': 'INTERN',
    };
    return map[s] ?? s.toUpperCase().replace(/ /g, '_');
  }

  ngOnInit() {
    const rawRole = localStorage.getItem('role') ?? '';
    this.role = rawRole;
    const norm = this.normalizeRole(rawRole);

    const deptRaw =
      localStorage.getItem('deptId') ||
      (JSON.parse(localStorage.getItem('user') || '{}')?.deptId ?? '');
    const deptId = Number(deptRaw) || 0;

    // Restrict only Executives not in dept 1
    this.isRestricted = (deptId === 1);

    this.username = localStorage.getItem('name') || '';
    console.log('role:', rawRole, '→', norm, 'deptId:', deptId, 'isRestricted:', this.isRestricted);
    this.loadDepartments();
    this.applyAccessRules();
    if (this.pendingInterview) {
      this.populateFromInterview(this.pendingInterview);
      this.pendingInterview = null;
    }

  }

  // ---- panel helpers ----
  get panelArr(): FormArray {
    return this.form.get('panel') as FormArray;
  }
  addPanelist(prefill = true) {
    const localName = localStorage.getItem('name') || '';
    const localDesignation = localStorage.getItem('designation') || '';
  
    const g = this.fb.group({
      name: this.fb.control<string>(prefill ? localName : '', { validators: Validators.required, nonNullable: true }),
      designation: this.fb.control<string>(prefill ? localDesignation : '', { nonNullable: true }),  
      scores: this.fb.group({
        jobSkills: this.fb.control<number | null>(null, { validators: score01Validator }),
        jobKnowledge: this.fb.control<number | null>(null, { validators: score01Validator }),
        attitude: this.fb.control<number | null>(null, { validators: score01Validator }),
        communication: this.fb.control<number | null>(null, { validators: score01Validator }),
      }),
      signature: this.fb.control<string>(''),
      // ⬇️ important: type as number | null (not just null)
      average: this.fb.control<number | null>({ value: null, disabled: true }),
    });

    g.get('scores')!.valueChanges.subscribe((scores: any) => {
      const vals = this.criteria
        .map(c => Number(scores?.[c.key]))
        .filter(n => Number.isFinite(n));
      const avg: number | null = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;

      // now this matches FormControl<number | null>
      (g.get('average') as FormControl<number | null>).setValue(avg, { emitEvent: false });
    });

    this.panelArr.push(g);
    // apply current rule to the newly added group
    this.setPanelValidators(!this.isRestricted);
  }


  removePanelist(i: number) {
    this.panelArr.removeAt(i);
  }

  // overall average
  get overallAverage(): number | null {
    const avgs = this.panelArr.controls
      .map(c => c.get('average')!.value)
      .filter((x: any) => x != null);
    if (!avgs.length) return null;
    return +(avgs.reduce((a: number, b: number) => a + b, 0) / avgs.length).toFixed(1);
  }

  saveAllPanel(submit: boolean) {
    this.saving = true;

    // Validate required bits for submission
    if (submit) {
      // require name + panelId
      for (const ctrl of this.panelArr.controls) {
        ctrl.get('name')?.addValidators(Validators.required);
        // ctrl.get('panelId')?.addValidators(Validators.required);
        ctrl.get('name')?.updateValueAndValidity({ emitEvent: false });
        // ctrl.get('panelId')?.updateValueAndValidity({ emitEvent: false });
      }
      if (this.panelArr.invalid) {
        this.form.markAllAsTouched();
        // alert('Please fill Panel User ID and Name for each panelist before submitting.');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Please fill Panel User ID and Name for each panelist before submitting.'
        });
        this.saving = false;
        return;
      }
    }

    const calls = this.panelArr.controls.map((g) => {
      const scores = (g.get('scores') as FormGroup).getRawValue() as {
        jobSkills: number | null; jobKnowledge: number | null; attitude: number | null; communication: number | null;
      };

      const dto = {
        panelId: this.panelId,            // REQUIRED by backend
        name: g.get('name')!.value,
        designation: g.get('designation')!.value || undefined,
        jobSkills: scores.jobSkills ?? undefined,
        jobKnowledge: scores.jobKnowledge ?? undefined,
        attitude: scores.attitude ?? undefined,
        communication: scores.communication ?? undefined,
        notes: g.get('signature')!.value || undefined,
        submit, // DRAFT or SUBMITTED (server computes status)
      };

      return this.api.upsertFeedback(this.interviewId, dto);
    });

    // run in parallel
    let completed = 0;
    calls.forEach(obs => obs.subscribe({
      next: () => {
        completed++;
        if (completed === calls.length) {
          this.saving = false;
          // alert(submit ? 'Panel feedback submitted.' : 'Panel drafts saved.');
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: submit ? 'Panel feedback submitted.' : 'Panel drafts saved.'
          });
        }
      },
      error: (err) => {
        this.saving = false;
        // alert(err?.error?.message || 'Failed to save panel feedback');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message || 'Failed to save panel feedback'
        });
      }
    }));
  }

  /** Save HR review block */
  saveHrReview() {
    const v = this.form.getRawValue();
    const payslipVal = v?.hr?.payslip as 'Yes' | 'No' | null | undefined;

    const dto = {
      presentSalary: v?.hr?.presentSalary ?? null,
      payslip: payslipVal === 'Yes' ? true : payslipVal === 'No' ? false : null,
      expectedSalary: v?.hr?.expectedSalary ?? null,
      grossOffer: v?.hr?.grossOffer ?? null,
      conclusion: v?.conclusion ?? null,
      remarks: v?.remarks ?? null,
      reviewerUserId: this.reviewerUserId, // set from auth service if you have it
      expectedDoj: v.hr?.expectedDoj ?? null,
      noticePeriod: v.hr?.noticePeriod ?? null,   
    };

    this.api.saveHrReview(this.interviewId, dto).subscribe({
      next: () => 
        // alert('HR review saved.'),
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'HR review saved.'
        }),
      error: (err) => 
        // alert(err?.error?.message || 'Failed to save HR review'),
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message || 'Failed to save HR review'
        })
    });
  }

  /** Your existing submit now calls HR review (and you may also choose to submit panel here) */
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Save HR part
    this.saveHrReview();

    // OPTIONAL: also submit panel feedback here instead of the separate buttons:
    // this.saveAllPanel(true);
  }

  // ---------- utilities ----------
  reset() {
    this.form.reset();
    this.panelArr.clear();
    this.addPanelist();
  }
  panelGroup(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }
  scoresGroup(ctrl: AbstractControl): FormGroup {
    return (ctrl as FormGroup).get('scores') as FormGroup;
  }
  private setPanelValidators(required: boolean) {
    this.panelArr.controls.forEach(g => {
      const scores = (g.get('scores') as FormGroup);
      const vs = required ? [Validators.required, score01Validator] : [score01Validator];

      // name required if we're enforcing
      g.get('name')!.setValidators(required ? [Validators.required] : []);
      g.get('name')!.updateValueAndValidity({ emitEvent: false });

      ['jobSkills', 'jobKnowledge', 'attitude', 'communication'].forEach(k => {
        const c = scores.get(k)!;
        c.setValidators(vs);
        c.updateValueAndValidity({ emitEvent: false });
      });
    });
  }

  private setHrValidators(required: boolean) {
    const hr = this.form.get('hr') as FormGroup;
    const req = required ? [Validators.required] : [];
    hr.get('payslip')!.setValidators(req);
    hr.get('expectedSalary')!.setValidators(req);
    hr.get('grossOffer')!.setValidators(req);
    this.form.get('conclusion')!.setValidators(required ? [Validators.required] : []);

    ['payslip', 'expectedSalary', 'grossOffer'].forEach(k =>
      hr.get(k)!.updateValueAndValidity({ emitEvent: false })
    );
    this.form.get('conclusion')!.updateValueAndValidity({ emitEvent: false });
  }

  private applyAccessRules() {
    if (this.isRestricted) {
      // read-only, no requirements
      this.setPanelValidators(false);
      // this.setHrValidators(false);
      // this.panelArr.disable({ emitEvent: false });
      // (this.form.get('hr') as FormGroup).disable({ emitEvent: false });
    } else {
      // must fill correctly
      this.panelArr.enable({ emitEvent: false });
      (this.form.get('hr') as FormGroup).enable({ emitEvent: false });
      this.setPanelValidators(true);
      this.setHrValidators(true);
    }
  }
  private populateFromInterview(v: any) {
    console.log(v)
    // Candidate header (always)
    const start = v.startTime ? new Date(v.startTime) : null;
    const candidateName = v.application?.candidate?.name ?? '';
    const jobTitle = v.application?.job?.title ?? '';
    const deptName = v.application?.job?.department?.name ?? null;
    const experienceYears = v.application?.candidate?.experience ?? null;
    const qualification = v.application?.candidate?.qualification ?? '';
    this.form.patchValue({
      candidate: { name: candidateName, date: start, position: jobTitle, department: deptName, qualification: qualification,experienceYears: experienceYears },
    });
    console.log(this.form.value)
  
    // ------ panelUsers: compute expected count ------
    const raw = (v?.panelUserIds ?? '').toString();
    const arr = raw.split(',').map((s:any) => +s.trim()).filter((n:any) => Number.isFinite(n));
    this.expectedPanelIds = Array.from(new Set(arr));
    this.totalPanelMembers = this.expectedPanelIds.length;
    this.isPanelMember = this.expectedPanelIds.includes(this.panelId ?? 0);
  
    // ------ feedbacks from API ------
    const allFeedback: any[] = Array.isArray(v?.InterviewFeedback) ? v.InterviewFeedback : [];
    const submitted = allFeedback.filter(f => (f?.status ?? '').toUpperCase() === 'SUBMITTED');
    this.submittedCount = submitted.length;
  
    // Clear current UI rows
    this.panelArr.clear();
  
    if (this.isRestricted && !this.isPanelMember) {
      // ============== RESTRICTED: show ALL (read-only) ==============
      this.viewAllPanelReadOnly = true;
  
      // show submitted first (then drafts if you want)
      const visible = submitted.length ? submitted : allFeedback;
      visible.forEach(f => this.panelArr.push(this.fbFrom(f)));

      console.log(this.panelArr.controls.length, 'panelists loaded', this.panelArr.controls);
  
      // read-only
      this.panelArr.disable({ emitEvent: false });
  
      if (v.InterviewHRReview) {
        this.form.patchValue({
          conclusion: v.InterviewHRReview.conclusion ?? 'Shortlisted',
          remarks: v.InterviewHRReview.remarks ?? '',
          hr: {
            presentSalary: v.InterviewHRReview.presentSalary ?? null,
            payslip: v.InterviewHRReview.payslip === true ? 'Yes' : v.InterviewHRReview.payslip === false ? 'No' : 'No',
            expectedSalary: v.InterviewHRReview.expectedSalary ?? null,
            grossOffer: v.InterviewHRReview.grossOffer ?? null,
          },
        });
      } else {
        // defaults if no HR review yet
        this.form.patchValue({
          conclusion: 'Shortlisted',
          remarks: '',
          hr: { presentSalary: null, payslip: 'No', expectedSalary: null, grossOffer: null },
        });
      }
    }
    else if(this.isRestricted && this.isPanelMember){
      // ============== RESTRICTED + PANEL: show my feedback + blanks ==============
      // this.viewAllPanelReadOnly = false;
  
      const mine = allFeedback.find(f => Number(f?.panelUserId) === Number(this.panelId));
      console.log('mine:', mine, 'panelId:', this.panelId, 'total:', allFeedback);
      if (mine) {
        // Already filled → show only in read-only mode
        this.panelArr.push(this.fbFrom(mine));
        this.viewAllPanelReadOnly = true;
      } 
      
      else {
        this.addPanelist(); // blank row for me to fill
      console.log(this.panelArr.controls.length, 'panelists loaded', this.panelArr.controls);
      this.viewAllPanelReadOnly = false;
      }
  
      // enable editing my row
      this.panelArr.enable({ emitEvent: false });
      if (v.InterviewHRReview) {
        this.form.patchValue({
          conclusion: v.InterviewHRReview.conclusion ?? 'Shortlisted',
          remarks: v.InterviewHRReview.remarks ?? '',
          hr: {
            presentSalary: v.InterviewHRReview.presentSalary ?? null,
            payslip: v.InterviewHRReview.payslip === true ? 'Yes' : v.InterviewHRReview.payslip === false ? 'No' : 'No',
            expectedSalary: v.InterviewHRReview.expectedSalary ?? null,
            grossOffer: v.InterviewHRReview.grossOffer ?? null,
          },
        });
      } else {
        // defaults if no HR review yet
        this.form.patchValue({
          conclusion: 'Shortlisted',
          remarks: '',
          hr: { presentSalary: null, payslip: 'No', expectedSalary: null, grossOffer: null },
        });
      }
    
      
    } else {
      // ============== NON-RESTRICTED: show ONLY my feedback ==============
      this.viewAllPanelReadOnly = false;
  
      const mine = allFeedback.find(f => Number(f?.panelUserId) === Number(this.panelId));
      console.log('mine:', mine, 'panelId:', this.panelId, 'total:', allFeedback);
      if (mine) this.panelArr.push(this.fbFrom(mine));
      
      else this.addPanelist(); // blank row for me to fill
      console.log(this.panelArr.controls.length, 'panelists loaded', this.panelArr.controls);
  
      // enable editing my row
      this.panelArr.enable({ emitEvent: false });
    }
  
    // Re-apply validators/enablement for HR + panel
    this.applyAccessRules();
  }
  private fbFrom(f: any) {
    const g = this.fb.group({
      name: this.fb.control<string>(f?.name || '', { nonNullable: true }),
      designation: this.fb.control<string>(f?.designation || '', { nonNullable: true }),
      scores: this.fb.group({
        jobSkills:      this.fb.control<number | null>(f?.jobSkills ?? null, { validators: score01Validator }),
        jobKnowledge:   this.fb.control<number | null>(f?.jobKnowledge ?? null, { validators: score01Validator }),
        attitude:       this.fb.control<number | null>(f?.attitude ?? null, { validators: score01Validator }),
        communication:  this.fb.control<number | null>(f?.communication ?? null, { validators: score01Validator }),
      }),
      signature: this.fb.control<string>(f?.notes || ''),
      average: this.fb.control<number | null>({ value: f?.average ?? null, disabled: true }),
      panelUserId: this.fb.control<number | null>(f?.panelUserId ?? null),
      status: this.fb.control<string>(f?.status ?? 'DRAFT'),
      submittedAt: this.fb.control<Date | null>(f?.submittedAt ? new Date(f.submittedAt) : null),
    });
  
    // keep average in sync
    g.get('scores')!.valueChanges.subscribe((scores: any) => {
      const vals = this.criteria.map(c => Number(scores?.[c.key])).filter(Number.isFinite);
      const avg = vals.length ? +(vals.reduce((a,b)=>a+b,0) / vals.length).toFixed(1) : null;
      (g.get('average') as FormControl<number | null>).setValue(avg, { emitEvent: false });
    });
  
    return g;
  }

}
