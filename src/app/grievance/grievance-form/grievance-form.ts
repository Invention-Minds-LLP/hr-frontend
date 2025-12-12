import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Grievance } from '../../services/grievance/grievance';
import { CommonModule } from '@angular/common';
import { Button, ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-grievance-form',
  imports: [CommonModule, ButtonModule, ReactiveFormsModule, InputTextModule, TextareaModule,SelectModule],
  templateUrl: './grievance-form.html',
  styleUrl: './grievance-form.css'
})
export class GrievanceForm {
  form: FormGroup;
  @Output() saved = new EventEmitter<void>();
  employeeId: string | null = localStorage.getItem('empId');
  isLoading = false;

  
  categories = [
    { label: 'Workplace Issue', value: 'Workplace Issue' },
    { label: 'Salary', value: 'Salary' },
    { label: 'Harassment', value: 'Harassment' },
    { label: 'Other', value: 'Other' }
  ];

  constructor(
    private fb: FormBuilder,
    private grievanceService: Grievance
  ) {
    this.form = this.fb.group({
      employeeId: [''],
      title: ['', Validators.required],
      description: ['', Validators.required],
      category: [null, Validators.required] 
    });
  }

  submit() {
    if (this.form.valid) {
      this.form.value.employeeId = this.employeeId || '';
      this.isLoading = true;
      this.grievanceService.create(this.form.value).subscribe(() => {
        this.isLoading = false;
        this.saved.emit();
        this.form.reset();
      });
    }
  }
}
