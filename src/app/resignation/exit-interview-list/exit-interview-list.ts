import { Component, Input } from '@angular/core';
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
import { Departments } from '../../services/departments/departments';
import { BadgeModule } from 'primeng/badge';
import { SkeletonModule } from 'primeng/skeleton';


@Component({
  selector: 'app-exit-interview-list',
  imports: [ExitInterview, CommonModule, TableModule, FormsModule, ButtonModule,
    IconFieldModule, InputTextModule, InputIconModule, BadgeModule, SkeletonModule],
  templateUrl: './exit-interview-list.html',
  styleUrl: './exit-interview-list.css'
})
export class ExitInterviewList {

  @Input() interviews: any[] = [];
  @Input() employeeId!: number;

  exitInterviews: any[] = [];
  loading = false;
  selectedInterview: any = null;

  filteredInterviews: any[] = []
  showFilterDropdown = false;
  selectedFilter: any = null;
  departments: any[] = [];
  departmentMap: Record<number, string> = {};


  filterOptions = [
    { label: 'Employee ID', value: 'employeeCode' },
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'department' }
  ]

  constructor(private exitService: Resignation, private dept: Departments) { }

  ngOnInit() {
    this.loading = true;
    this.exitService.listExitInterview().subscribe(data => {
      this.exitInterviews = data;
      this.loading = false;
      this.filteredInterviews = [...this.exitInterviews]
    });

    console.log(this.filteredInterviews)
    this.dept.getDepartments().subscribe((depts: any[]) => {
      this.departments = depts;

      this.departmentMap = this.departments.reduce((map, dept) => {
        map[dept.id] = dept.name;
        return map;
      }, {} as Record<number, string>);
    });
    document.addEventListener('click', this.handleOutsideClick)

  }

  handleOutsideClick = (event: any) => {
    const dropdown = document.getElementById('filterDropdown');
    const button = document.getElementById('filterButton');

    if (!dropdown || !button) return;

    if (!dropdown.contains(event.target) &&
      !button.contains(event.target)) {
      this.showFilterDropdown = false;
    }
  };

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
    const sb = document.getElementById('searchBox') as HTMLInputElement;
    if (sb) sb.value = '';
    this.filteredInterviews = [...this.exitInterviews];
    this.showFilterDropdown = false
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase()

    if (!this.selectedFilter || !searchText) {
      this.filteredInterviews = [...this.exitInterviews]
      return
    }
    if (!searchText) {
      this.filteredInterviews = [...this.exitInterviews];
      return;
    }

    const filterKey = this.selectedFilter.value;

    this.filteredInterviews = this.exitInterviews.filter(e => {
      if (filterKey === 'name') {
        const fullName = `${e.employee?.firstName || ''} ${e.employee?.lastName || ''}`.toLowerCase();
        return fullName.includes(searchText);
      } else if (filterKey === 'department') {
        const deptName = this.departmentMap[e.employee?.departmentId] || '';
        return deptName.toLowerCase().includes(searchText);
      } else if (filterKey === 'employeeCode') {
        const empCode = e.employee?.employeeCode || '';
        return empCode.toLowerCase().includes(searchText);
      }
      else if (filterKey) {
        const val = e[filterKey];
        return val?.toString().toLowerCase().includes(searchText);
      }
      return false;
    });


    console.log(this.filteredInterviews)

  }

  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }
}
