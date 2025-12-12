import { Component } from '@angular/core';
import { AssignTest } from '../../services/assign-test/assign-test';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';
import { FormsModule } from '@angular/forms';
import { TestAttempt } from '../../services/test-attempt/test-attempt';
import { FloatLabel } from 'primeng/floatlabel';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-assigned-test',
  imports: [CommonModule, TableModule, DialogModule, BadgeModule, ButtonModule,
    InputTextModule, IconFieldModule, InputIconModule, FormsModule, FloatLabel, InputTextModule, SkeletonModule],
  templateUrl: './assigned-test.html',
  styleUrl: './assigned-test.css',


})
export class AssignedTest {
  assignedTests: any[] = [];
  overviewVisible = false;
  overview: any = null;
  isLoading = false;

  filteredAssignedtest: any[] = []
  selectedFilter: any = null;
  showFilterDropdown = false
  loading = true

  filterOptions = [
    { label: 'Employee Name', value: 'name' },
    { label: 'Status', value: 'status' }
  ]

  constructor(private assignedService: AssignTest, private messageService: MessageService, private attemptService: TestAttempt) { }

  ngOnInit(): void {
    this.loading = true
    this.assignedService.getAll().subscribe({
      next: data => {
        this.assignedTests = data
        this.filteredAssignedtest = [...this.assignedTests]
        setTimeout(() => {
          this.loading = false
        }, 2000)
      },
      error: err => {
        console.error('Failed to load assigned tests', err)
        this.loading = false
      }
    });
    document.addEventListener('click', this.handleOutsideClick);
  }

  handleOutsideClick = (event: any) => {
    const dropdown = document.querySelector('.menu-list');
    const button = document.querySelector('.filter');

    if (!dropdown || !button) return;

    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
      this.showFilterDropdown = false;
    }
  };
  openOverview(a: any) {
    this.assignedService.getOverview(a.id).subscribe({
      next: data => {
        data.rows.forEach((r: any) => {
          r.isEditing = false;
        });
        this.overview = data;
        this.overviewVisible = true;
      },
      error: err =>
        // alert('Failed to load overview')
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load overview'
        })
    });
  }
  hasDescriptive(o: any): boolean {
    return o?.rows?.some((r: any) => r.type === 'DESCRIPTIVE');
  }

  fmtDuration(s?: number | null) {
    if (!s && s !== 0) return '-';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
  }

  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    const input = document.getElementById('assignedSearch') as HTMLInputElement;
    if (input) input.value = '';
    this.filteredAssignedtest = [...this.assignedTests];
    this.showFilterDropdown = false
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!this.selectedFilter || !searchText) {
      this.filteredAssignedtest = [...this.assignedTests];
      return;
    }

    const filterKey = this.selectedFilter.value;

    this.filteredAssignedtest = this.assignedTests.filter(q => {
      if (filterKey === 'name') {
        const fullName = `${q.employee?.firstName || ''} ${q.employee?.lastName || ''}`.toLowerCase();
        return fullName.includes(searchText);
      } else if (filterKey === 'status') {
        return q.status?.toLowerCase().includes(searchText);
      }
      return false;
    });

    console.log(this.filteredAssignedtest);
  }
  saveEvaluation(o: any) {
    const evaluations = o.rows
      .filter((r: any) => r.type === 'DESCRIPTIVE' && r.manualScore != null)
      .map((r: any) => ({
        questionId: r.questionId,
        manualScore: r.manualScore,
        remarks: r.remarks || ''
      }));

    if (!evaluations.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No scores',
        detail: 'Please enter scores for descriptive questions.'
      });
      return;
    }

    this.isLoading = true;

    console.log('Evaluations to save:', evaluations);

    this.attemptService.evaluateAttempt(o.attemptId, evaluations).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: 'Evaluation Saved',
          detail: `Final Score: ${res.finalScore}`
        });
        this.overviewVisible = false;
        this.isLoading = false;
      },
      error: err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save evaluation'
        });
        this.isLoading = false;
      }
    });
  }


}



