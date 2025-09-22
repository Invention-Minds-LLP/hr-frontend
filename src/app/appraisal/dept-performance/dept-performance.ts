import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PerformanceService } from '../../services/performances/performance-service';
import { Employees } from '../../services/employees/employees';
import { Departments } from '../../services/departments/departments';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { Select, SelectModule } from 'primeng/select';
import { Dialog, DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { AppraisalTemplate } from '../appraisal-template/appraisal-template';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';
import { InputText, InputTextModule } from 'primeng/inputtext';


@Component({
  selector: 'app-dept-performance',
  imports: [CommonModule, FormsModule, CardModule, SelectModule, DialogModule, TableModule, ReactiveFormsModule,
     ButtonModule, AppraisalTemplate, MultiSelectModule, TextareaModule, InputTextModule],
  templateUrl: './dept-performance.html',
  styleUrl: './dept-performance.css'
})
export class DeptPerformance {
  summaries: any[] = [];
  employees: any[] = [];
  departments: any[] = [];
  filteredEmployees: any[] = [];
  visible = false;
  assignForm: FormGroup;
  selectedSummary: any = null;
  role: string = '';
  filterOptions = [
    { label: 'Employee Code', value: 'employeeCode' },
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'departmentId' },
    { label: 'Cycle', value: 'cycle' } 
  ];

  selectedFilter: any = null;
  showFilterDropdown = false;
  filteredSummaries: any[] = [];

  periods = [
    { label: 'Month 1', value: 'MONTH_1' },
    { label: 'Month 3', value: 'MONTH_3' },
    { label: 'Month 6', value: 'MONTH_6' },
    { label: 'Year 1', value: 'YEAR_1' },
    { label: 'Year 2', value: 'YEAR_2' }
  ];

  constructor(private performanceService: PerformanceService, private employeeService: Employees, private departmentService: Departments, private fb: FormBuilder) {
    this.assignForm = this.fb.group({
      employeeIds: [[], Validators.required],
      departmentId: [null, Validators.required],
      cycle: ['', Validators.required],
      period: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadSummaries();
    this.loadEmployees();
    this.loadDepartments();
    this.role = localStorage.getItem('role') || '';
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.toLowerCase();

    if (!searchText) {
      this.filteredSummaries = [...this.summaries]; // reset
      return;
    }

    const filterKey = this.selectedFilter?.value;

    this.filteredSummaries = this.summaries.filter(s => {
      if (filterKey === 'employeeCode') {
        return s.employee?.employeeCode?.toLowerCase().includes(searchText);
      }
      if (filterKey === 'name') {
        const fullName = `${s.employee?.firstName || ''} ${s.employee?.lastName || ''}`.toLowerCase();
        return fullName.includes(searchText);
      }
      if (filterKey === 'departmentId') {
        return s.department?.name?.toLowerCase().includes(searchText);
      }
      if (filterKey === 'cycle') {
        return s.cycle?.toLowerCase().includes(searchText);
      }
      // default: search in all
      return (
        s.employee?.employeeCode?.toLowerCase().includes(searchText) ||
        `${s.employee?.firstName || ''} ${s.employee?.lastName || ''}`.toLowerCase().includes(searchText) ||
        s.department?.name?.toLowerCase().includes(searchText) ||
        s.cycle?.toLowerCase().includes(searchText)
      );
    });
  }


  onFilterChange() {
    this.filteredSummaries = [...this.summaries];
    this.showFilterDropdown = false;
    console.log(this.selectedFilter)
  }
  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }
  selectFilter(option: any) {
    this.selectedFilter = option;
    this.showFilterDropdown = false; // hide after selecting
    this.onFilterChange(); // trigger filter logic
  }

  loadSummaries() {
    this.performanceService.getSummaries().subscribe(res => {
      this.summaries = res;
      this.filteredSummaries = [...res];
    });

  }

  loadEmployees() {
    this.employeeService.getEmployees().subscribe(res => this.employees = res);
  }

  loadDepartments() {
    this.departmentService.getDepartments().subscribe(res => this.departments = res);
  }

  openDialog() {
    this.visible = true;
  }
  filterEmployees(deptId: number) {
    this.filteredEmployees = this.employees.filter(e => e.departmentId === deptId);
  }

  onAssign() {
    const payload = this.assignForm.value;
    this.performanceService.assignForm(payload).subscribe({
      next: (res) => {
        console.log('Assigned:', res);
        this.visible = false;
        this.assignForm.reset();
        this.loadSummaries();
      },
      error: (err) => console.error(err)
    });
  }
  openSummary(summary: any) {
    this.selectedSummary = summary;
  }

  closeSummary() {
    this.selectedSummary = null;
    this.loadSummaries(); // refresh table after closing form
  }
  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }

  getDepartmentName(id: number): string {
    return this.departments.find(dep => dep.id === id)?.name || 'N/A';
  }


}
