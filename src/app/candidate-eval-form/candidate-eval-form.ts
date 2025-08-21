

import { Component, computed, signal, effect,Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder,FormGroup,FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

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
    InputNumberModule, TextareaModule, ButtonModule, DividerModule, ChipModule
  ],
  templateUrl: './candidate-eval-form.html',
  styleUrl: './candidate-eval-form.css'
})
export class CandidateEvalForm {
  // ---- form ----
  form:any;
  saving:boolean=false;
  panelId: number | null = null; 
  departments: SelectOpt[] = [];
  isRestricted = false; // set based on role and department
  username = '';
  yesNo = ['Yes','No'].map(x => ({label:x, value:x}));
  role: string = 'panel'; // or 'hr' based on your auth logic
  @Input() interviewId!: number;
  @Input() set interview(v: any | null) {
    if (!v) return;
    const start = v.startTime ? new Date(v.startTime) : null;
    const candidateName = v.application?.candidate?.name ?? '';
    const jobTitle = v.application?.job?.title ?? '';
    const deptName = v.application?.job?.department?.name ?? null;
    console.log(deptName)

    this.form.patchValue({
      candidate: {
        name: candidateName,
        date: start,
        position: jobTitle,
        department: deptName,
      }
    });
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
  constructor(private fb: FormBuilder,private api: Recuriting, private deptSvc: Departments) {
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
      }),
    });
    // start with two panelists (you can change)
    this.addPanelist();
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
    this.panelId = Number(localStorage.getItem('empId')) || null; // or set from route param or service
    const rawRole = localStorage.getItem('role') ?? '';
    this.role = rawRole;
    const norm = this.normalizeRole(rawRole);

    const deptRaw =
      localStorage.getItem('departmentId') ||
      (JSON.parse(localStorage.getItem('user') || '{}')?.departmentId ?? '');
    const deptId = Number(deptRaw) || 0;

    // Restrict only Executives not in dept 1
    this.isRestricted = (norm === 'EXECUTIVE' && deptId !== 1);

    this.username = localStorage.getItem('name') || '';
    console.log('role:', rawRole, '→', norm, 'deptId:', deptId, 'isRestricted:', this.isRestricted);
    this.loadDepartments();
    
  }

  // ---- panel helpers ----
  get panelArr(): FormArray {
    return this.form.get('panel') as FormArray;
  }
  addPanelist() {
    const g = this.fb.group({
      name: this.fb.control<string>('', { validators: Validators.required, nonNullable: true }),
      designation: this.fb.control<string>('', { nonNullable: true }),
      scores: this.fb.group({
        jobSkills:      this.fb.control<number | null>(null, { validators: score01Validator }),
        jobKnowledge:   this.fb.control<number | null>(null, { validators: score01Validator }),
        attitude:       this.fb.control<number | null>(null, { validators: score01Validator }),
        communication:  this.fb.control<number | null>(null, { validators: score01Validator }),
      }),
      signature: this.fb.control<string>(''),
      // ⬇️ important: type as number | null (not just null)
      average: this.fb.control<number | null>({ value: null, disabled: true }),
    });
  
    g.get('scores')!.valueChanges.subscribe((scores: any) => {
      const vals = this.criteria
        .map(c => Number(scores?.[c.key]))
        .filter(n => Number.isFinite(n));
      const avg: number | null = vals.length ? +(vals.reduce((a,b)=>a+b,0) / vals.length).toFixed(1) : null;
  
      // now this matches FormControl<number | null>
      (g.get('average') as FormControl<number | null>).setValue(avg, { emitEvent: false });
    });
  
    this.panelArr.push(g);
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
    return +(avgs.reduce((a: number,b: number)=>a+b,0)/avgs.length).toFixed(1);
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
        alert('Please fill Panel User ID and Name for each panelist before submitting.');
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
        signature: g.get('signature')!.value || undefined,
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
          alert(submit ? 'Panel feedback submitted.' : 'Panel drafts saved.');
        }
      },
      error: (err) => {
        this.saving = false;
        alert(err?.error?.message || 'Failed to save panel feedback');
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
      reviewerUserId: null, // set from auth service if you have it
    };

    this.api.saveHrReview(this.interviewId, dto).subscribe({
      next: () => alert('HR review saved.'),
      error: (err) => alert(err?.error?.message || 'Failed to save HR review'),
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
}
