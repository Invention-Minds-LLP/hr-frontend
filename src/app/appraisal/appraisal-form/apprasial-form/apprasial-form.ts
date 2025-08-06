import { Component, Input, Output, EventEmitter,OnChanges, SimpleChanges } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Appraisal } from '../../../services/appraisal/appraisal';
import { CommonModule } from '@angular/common';

interface SelectOpton {
  name: string;
  value: string;
}

@Component({
  selector: 'app-apprasial-form',
  imports: [FormsModule, InputTextModule, FloatLabel, TextareaModule, ButtonModule, ReactiveFormsModule,CommonModule],
  templateUrl: './apprasial-form.html',
  styleUrl: './apprasial-form.css'
})
export class ApprasialForm {

  @Input() selectedAppraisal: any;  // Data passed from parent
  @Output() formSubmitted = new EventEmitter<void>(); // Notify parent after save


  appraisalForm!: FormGroup;
  role: string = 'Reporting Manager'

  constructor(private fb: FormBuilder, private appraisalService: Appraisal) {}

  ngOnInit() {
    this.initForm()
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedAppraisal'] && this.selectedAppraisal) {
      if (!this.appraisalForm) {
        this.initForm();
      }
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => this.patchEmployeeData(), 0);
    }
  }
  
  
  

  initForm() {
    this.appraisalForm = this.fb.group({
      fullName: [''],
      employeeCode: [''],
      department: [''],
      designation: [''],
      dateOfJoining: [''],
      cycle: [''],
      managerName: [''],
      // Manager Inputs
      communication: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      teamwork: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      problemSolving: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      initiative: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      reliability: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
    
      // Overall score also limited to 10
      overallScore: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      comments: [''],
      recommendations: [''],
      finalDecision: ['', Validators.required],
      finalComments: ['']
    });
  }

  patchEmployeeData() {
    if (!this.appraisalForm || !this.selectedAppraisal) return;

    console.log(this.selectedAppraisal)
  
    this.appraisalForm.patchValue({
      fullName: this.selectedAppraisal.fullName,
      employeeCode: this.selectedAppraisal.employeeCode,
      department: this.selectedAppraisal.departmentName,
      designation: this.selectedAppraisal.designation,
      dateOfJoining: this.selectedAppraisal.dateOfJoining
        ? new Date(this.selectedAppraisal.dateOfJoining).toLocaleDateString()
        : 'N/A',
      cycle: this.selectedAppraisal.cycle,
      managerName: this.selectedAppraisal.managerName
    });

    if (this.selectedAppraisal.managerReview) {
      this.appraisalForm.patchValue({
        communication: this.selectedAppraisal.managerReview.communication?.toString() || '',
        teamwork: this.selectedAppraisal.managerReview.teamwork?.toString() || '',
        problemSolving: this.selectedAppraisal.managerReview.problemSolving?.toString() || '',
        initiative: this.selectedAppraisal.managerReview.initiative?.toString() || '',
        reliability: this.selectedAppraisal.managerReview.reliability?.toString() || '',
        comments: this.selectedAppraisal.managerReview.comments || '',
        recommendations: this.selectedAppraisal.managerReview.recommendations || '',
        overallScore: this.selectedAppraisal.managerReview.overallScore?.toString() || '',
        finalDecision: this.selectedAppraisal.finalDecision || '',
        finalComments: this.selectedAppraisal.finalComments || ''
      });
    }
    

    console.log(this.appraisalForm.value)
  }

  
  
  

  onSubmit() {
    const invalidFields = this.getInvalidFields(this.appraisalForm);
    console.log('Invalid fields:', invalidFields);
    if (this.appraisalForm.valid) {
      const rawValues = this.appraisalForm.getRawValue();

      // Convert numeric fields to floats
      const numericFields = ['communication', 'teamwork', 'problemSolving', 'initiative', 'reliability', 'overallScore'];
      numericFields.forEach(field => {
        if (rawValues[field] !== '' && rawValues[field] !== null) {
          rawValues[field] = parseFloat(rawValues[field]);
        }
      });
  
      const payload = {
        appraisalId: this.selectedAppraisal.id,
        ...rawValues
      };

      console.log(payload)

      // Call service to save manager review
      this.appraisalService.saveManagerReview(payload).subscribe(() => {
        this.formSubmitted.emit();
      });
    }
  }
  onCancel(){
    this.appraisalForm.reset()
    this.formSubmitted.emit();
  }
  getInvalidFields(formGroup: FormGroup, parentKey = ''): string[] {
    const invalidFields: string[] = [];

    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      if (control instanceof FormGroup) {
        invalidFields.push(...this.getInvalidFields(control, fullKey));
      } else if (control instanceof FormArray) {
        control.controls.forEach((fg, index) => {
          invalidFields.push(...this.getInvalidFields(fg as FormGroup, `${fullKey}[${index}]`));
        });
      } else if (control?.invalid) {
        invalidFields.push(fullKey);
      }
    });

    return invalidFields;
  }

}
