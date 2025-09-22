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

@Component({
  selector: 'app-assigned-test',
  imports: [CommonModule, TableModule, DialogModule, BadgeModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule],
  templateUrl: './assigned-test.html',
  styleUrl: './assigned-test.css',


})
export class AssignedTest {
  assignedTests: any[] = [];
  overviewVisible = false;
  overview: any = null;

  filteredAssignedtest: any[] = []
  selectedFilter: any = null;
  showFilterDropdown = false

  filterOptions = [
    { label: 'Employee Name', value: 'name' },
    { label: 'Status', value: 'status' }
  ]

  constructor(private assignedService: AssignTest, private messageService: MessageService) { }

  ngOnInit(): void {
    this.assignedService.getAll().subscribe({
      next: data => {
        this.assignedTests = data
        this.filteredAssignedtest = [...this.assignedTests]
      },
      error: err => console.error('Failed to load assigned tests', err)
    });
  }
  openOverview(a: any) {
    this.assignedService.getOverview(a.id).subscribe({
      next: data => { this.overview = data; this.overviewVisible = true; },
      error: err =>
        // alert('Failed to load overview')
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load overview'
        })
    });
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

}



