

import { Component, computed, signal, effect } from '@angular/core';
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

function score01Validator(ctrl: AbstractControl): ValidationErrors | null {
  const v = ctrl.value;
  if (v == null || v === '') return null;
  return (typeof v === 'number' && v >= 0 && v <= 10) ? null : { range: true };
}

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

  departments = ['Engineering', 'Operations', 'HR', 'Finance', 'Nursing', 'Pharmacy']
    .map(x => ({ label: x, value: x }));
  yesNo = ['Yes','No'].map(x => ({label:x, value:x}));

  criteria = [
    { key: 'jobSkills', label: 'Job skills' },
    { key: 'jobKnowledge', label: 'Job knowledge' },
    { key: 'attitude', label: 'Attitude & behavior' },
    { key: 'communication', label: 'Communication skills' }
  ] as const;

  constructor(private fb: FormBuilder) {
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
    this.addPanelist();
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

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // payload ready
    const payload = this.form.getRawValue();
    console.log('Evaluation payload', payload);
    alert('Saved! (check console for payload)');
  }

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
