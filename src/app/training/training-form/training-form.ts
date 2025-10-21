import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Trainings } from '../../services/trainings/trainings';
import { DatePicker } from "primeng/datepicker";
import { Select } from "primeng/select";
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-training-form',
  imports: [DatePicker, Select, CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, CardModule, DividerModule],
  templateUrl: './training-form.html',
  styleUrl: './training-form.css'
})
export class TrainingForm {
  form!: FormGroup;
  submitting = false;

  constructor(private fb: FormBuilder, private trainingService: Trainings) {}

  ngOnInit() {
    this.form = this.fb.group({
      title: ['', Validators.required],
      trainerType: ['INTERNAL', Validators.required],
      trainerName: [''],
      trainerOrg: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      description: [''],
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.submitting = true;
    this.trainingService.createTraining(this.form.value).subscribe({
      next: (res) => {
        this.submitting = false;
        alert('Training created successfully');
        this.form.reset();
      },
      error: (err) => {
        console.error(err);
        this.submitting = false;
      },
    });
  }
}
