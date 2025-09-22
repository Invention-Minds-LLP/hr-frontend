import { Component } from '@angular/core';
import { SurveryService } from '../../services/surveyService/survery-service';
import { SurveyForm } from '../survey-form/survey-form';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-survey-list',
  imports: [SurveyForm, CommonModule, TableModule, ButtonModule, InputIconModule, IconFieldModule, InputTextModule],
  templateUrl: './survey-list.html',
  styleUrl: './survey-list.css'
})
export class SurveyList {
  surveys: any[] = [];
  loading = true;

  filterSurveyData: any = []
  showFilterDropdown = false;
  selectedFilter: any = null


  filterOptions = [
    { label: 'Employee ID', value: 'employeeCode' },
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'department' }
  ]


  // state to open/close form
  selectedSurvey: any | null = null;

  constructor(private surveyApi: SurveryService) { }

  ngOnInit() {
    this.surveyApi.getAllSurveys().subscribe({
      next: (res) => {
        this.surveys = res;
        this.loading = false;
        this.filterSurveyData = [...this.surveys]
      },
      error: (err) => {
        console.error('Error fetching surveys:', err);
        this.loading = false;
      },
    });



    console.log(this.filterSurveyData)
  }

  openSurvey(survey: any) {
    this.selectedSurvey = survey;
  }

  closeSurvey() {
    this.selectedSurvey = null;
  }


  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    this.showFilterDropdown = false
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase()

    if (!this.selectedFilter || !searchText) {
      this.filterSurveyData = [...this.surveys]
      return
    }

    const filterKey = this.selectedFilter.value;

      this.filterSurveyData = this.surveys.filter(s => {
        if (filterKey === 'name') {
          const fullName = `${s.employee?.firstName || ''} ${s.employee?.lastName || ''}`.toLowerCase();
          return fullName.includes(searchText); 
        } else if (filterKey === 'employeeCode') {
          return s.employee?.employeeCode?.toLowerCase().includes(searchText);
        } else if (filterKey === 'department') {
          return s.employee?.department?.name?.toLowerCase().includes(searchText);
        } else if (filterKey) {
          const val = s[filterKey];
          return val?.toString().toLowerCase().includes(searchText);
        }
        return false;
      });

      console.log(this.filterSurveyData)
    }




}
