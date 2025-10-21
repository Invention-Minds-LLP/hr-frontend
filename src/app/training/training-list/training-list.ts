import { Component } from '@angular/core';
import { Trainings } from '../../services/trainings/trainings';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TrainingOverview } from "../training-overview/training-overview";
import { DialogModule } from 'primeng/dialog';
import { TrainingForm } from '../training-form/training-form';


@Component({
  selector: 'app-training-list',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    DividerModule,
    TrainingOverview,
    DialogModule,
    TrainingForm
],
  templateUrl: './training-list.html',
  styleUrl: './training-list.css'
})
export class TrainingList {
  trainings: any[] = [];
  loading = true;
  feedbackDialogVisible = false;
  selectedTraining: any = null;
  userRole: 'EMPLOYEE' | 'HR' = 'EMPLOYEE'; // you can get from auth service
  showForm = false;

  feedbackSummary: any = null; // for HR summary

  constructor(private trainingService: Trainings) {}

  ngOnInit() {
    const role = localStorage.getItem('role') || 'EMPLOYEE';
    this.userRole =
    role === 'HR' || role === 'HR Manager'
      ? 'HR'
      : 'EMPLOYEE';
  
    this.fetchTrainings();
  }

  fetchTrainings() {
    this.trainingService.getAllTrainings().subscribe({
      next: (res) => {
        this.trainings = res;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      },
    });
  }
  openFeedbackDialog(training: any) {
    this.selectedTraining = training;
    this.feedbackDialogVisible = true;

    if (this.userRole === 'HR') {
      this.trainingService
        .getFeedbackSummary(training.training.id)
        .subscribe((res) => {
          this.feedbackSummary = res;
        });
    }
  }

  onFeedbackSubmitted() {
    this.feedbackDialogVisible = false;
    this.fetchTrainings();
  }
  // ✅ toggle form visibility
  toggleForm() {
    this.showForm = !this.showForm;
  }

  // ✅ when HR creates new training and saves successfully
  onTrainingCreated() {
    this.showForm = false;
    this.fetchTrainings();
  }
}
