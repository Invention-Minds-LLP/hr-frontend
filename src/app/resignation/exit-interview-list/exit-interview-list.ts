import { Component } from '@angular/core';
import { Resignation } from '../../services/resignation/resignation';
import { ExitInterview } from '../exit-interview/exit-interview';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';


@Component({
  selector: 'app-exit-interview-list',
  imports: [ExitInterview, CommonModule, TableModule, FormsModule, ButtonModule, IconFieldModule, InputTextModule, InputIconModule],
  templateUrl: './exit-interview-list.html',
  styleUrl: './exit-interview-list.css'
})
export class ExitInterviewList {
  exitInterviews: any[] = [];
  loading = false;
  selectedInterview: any = null;

  filteredInterviews: any[] = []
  showFilterDropdown = false;
  selectedFilter: any = null;


  filterOptions = [
    { label: 'Employee ID', value: 'id' },
    { label: 'Name', value: 'name' },
  ]

  constructor(private exitService: Resignation) { }

  ngOnInit() {
    this.loading = true;
    this.exitService.listExitInterview().subscribe(data => {
      this.exitInterviews = data;
      this.loading = false;
      this.filteredInterviews = [...this.exitInterviews]
    });

    console.log(this.filteredInterviews)

  }

  openInterview(interview: any) {
    this.selectedInterview = interview;
  }

  closeForm() {
    this.selectedInterview = null;
  }


  toggleFilterDropdoen() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    this.showFilterDropdown = false
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase()

    if (!this.selectedFilter || !searchText) {
      this.filteredInterviews = [...this.exitInterviews]
      return
    }

    const filterKey = this.selectedFilter.value;

    this.filteredInterviews = this.exitInterviews.filter(e => {
      if (filterKey === 'name') {
        const fullName = `${e.employee?.firstName || ''} ${e.employee?.lastName || ''}`.toLowerCase();
        return fullName.includes(searchText);
      } else if (filterKey) {
        const val = e[filterKey];
        return val?.toString().toLowerCase().includes(searchText);
      }
      return false;
    });


    console.log(this.filteredInterviews)

  }
}
