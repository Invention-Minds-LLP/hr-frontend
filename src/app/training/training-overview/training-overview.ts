import { Component, Input } from '@angular/core';
import { TrainingForm } from "../training-form/training-form";
import { TrainingList } from "../training-list/training-list";
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Card, CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { RatingModule } from 'primeng/rating';
import { TextareaModule } from 'primeng/textarea';
import { Trainings } from '../../services/trainings/trainings';


@Component({
  selector: 'app-training-overview',
  imports: [ CommonModule, FormsModule, ReactiveFormsModule,
    CardModule,
    DividerModule,
    RatingModule,
    TextareaModule,
  ],
  templateUrl: './training-overview.html',
  styleUrl: './training-overview.css'
})
export class TrainingOverview {
  @Input() trainingId!: number;
  @Input() employeeId!: number; // current logged-in employee

  feedbackForm!: FormGroup;
  submitting = false;
  submitted = false;

  constructor(private fb: FormBuilder, private trainingService: Trainings) {}

  ngOnInit(): void {
    this.feedbackForm = this.fb.group({
      rating: [null, Validators.required],
      trainerRating: [null],
      contentQuality: [null],
      relevance: [null],
      feedback: [''],
      suggestions: [''],
    });
  }

  submitFeedback() {
    if (this.feedbackForm.invalid) return;

    const payload = {
      trainingId: this.trainingId,
      employeeId: this.employeeId,
      ...this.feedbackForm.value,
    };

    this.submitting = true;
    this.trainingService.submitFeedback(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
      },
      error: (err) => {
        console.error('❌ Failed to submit feedback:', err);
        this.submitting = false;
      },
    });
  }
}
