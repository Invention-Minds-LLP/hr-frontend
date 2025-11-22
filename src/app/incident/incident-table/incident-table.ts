import { Component, Input, OnInit } from '@angular/core';
import { Incident } from '../../services/incident/incident';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-incident-table',
  imports: [CommonModule, TableModule, CardModule, TooltipModule, InputIconModule, IconFieldModule, InputTextModule],
  templateUrl: './incident-table.html',
  styleUrl: './incident-table.css',
})
export class IncidentTable {
  @Input() employeeId?: number;   // If listing incidents FOR an employee
  @Input() reporterId?: number;   // If listing incidents BY a manager

  filterOptions = [
    { label: 'Title', value: 'title' },
    { label: 'Employee', value: 'employeeName' },
  ];

  selectedFilter: any = this.filterOptions[0];
  showFilterDropdown: boolean = false;
  filteredIncidents: any[] = [];



  incidents: any[] = [];

  constructor(private incidentService: Incident) { }

  ngOnInit() {

    console.log(this.employeeId, this.reporterId);
    if (this.employeeId) {
      this.incidentService.getIncidentsByEmployee(this.employeeId).subscribe(res => {
        this.incidents = res;
        this.filteredIncidents = [...this.incidents];
      });
    }

    if (this.reporterId) {
      this.incidentService.getIncidentsByReporter(this.reporterId).subscribe(res => {
        this.incidents = res;
        this.filteredIncidents = [...this.incidents];
      });
    }
    document.addEventListener('click', this.closeDropdownOnClickOutside);
  }


  closeDropdownOnClickOutside = (event: any) => {
    const dropdown = document.getElementById('filterDropdown');
    const button = document.getElementById('filterButton');

    if (!dropdown || !button) return;

    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
      this.showFilterDropdown = false;
    }
  };



  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!searchText) {
      this.filteredIncidents = [...this.incidents];
      return;
    }

    const filterKey = this.selectedFilter?.value;

    this.filteredIncidents = this.incidents.filter((row: any) => {
      let value = '';

      switch (filterKey) {
        case 'employeeName':
          value = `${row.employee?.firstName} ${row.employee?.lastName}` || '';
          break;
        case 'reporterName':
          value = `${row.reporter?.firstName} ${row.reporter?.lastName}` || '';
          break;
        default:
          value = row[filterKey] ?? '';
      }

      return value.toString().toLowerCase().includes(searchText);
    });
  }

  onFilterChange() {
    this.filteredIncidents = [...this.incidents];
  }

  toggleFilterDropdown(): void {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  selectFilter(option: any) {
    this.selectedFilter = option;

    const searchBox = document.getElementById('searchBox') as HTMLInputElement;
    if (searchBox) searchBox.value = '';

    this.filteredIncidents = [...this.incidents];

    this.showFilterDropdown = false;
  }


}
