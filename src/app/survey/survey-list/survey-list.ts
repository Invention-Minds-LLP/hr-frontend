import { Component } from '@angular/core';
import { SurveryService } from '../../services/surveyService/survery-service';
import { SurveyForm } from '../survey-form/survey-form';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-survey-list',
  imports: [SurveyForm, CommonModule, TableModule, ButtonModule],
  templateUrl: './survey-list.html',
  styleUrl: './survey-list.css'
})
export class SurveyList {
  surveys: any[] = [];
  loading = true;

  // state to open/close form
  selectedSurvey: any | null = null;

  constructor(private surveyApi: SurveryService) {}

  ngOnInit() {
    this.surveyApi.getAllSurveys().subscribe({
      next: (res) => {
        this.surveys = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching surveys:', err);
        this.loading = false;
      },
    });
  }

  openSurvey(survey: any) {
    this.selectedSurvey = survey;
  }

  closeSurvey() {
    this.selectedSurvey = null;
  }
}
