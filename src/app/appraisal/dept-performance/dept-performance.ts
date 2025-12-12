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
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';


@Component({
  selector: 'app-dept-performance',
  imports: [CommonModule, FormsModule, CardModule, SelectModule, DialogModule, TableModule, ReactiveFormsModule,
    ButtonModule, AppraisalTemplate, MultiSelectModule, TextareaModule, InputTextModule, SkeletonModule],
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
    // { label: 'Cycle', value: 'cycle' } 
  ];
  loggedEmployeeId: string = localStorage.getItem('empId') || '';

  selectedFilter: any = null;
  showFilterDropdown = false;
  filteredSummaries: any[] = [];
  loading = true;
  isLoading = false;

  periods = [
    { label: 'Month 1', value: 'MONTH_1' },
    { label: 'Month 3', value: 'MONTH_3' },
    { label: 'Month 6', value: 'MONTH_6' },
    { label: 'Year 1', value: 'YEAR_1' },
    // { label: 'Year 2', value: 'YEAR_2' }
  ];

  cycles: any[] = [];

  constructor(private performanceService: PerformanceService, private employeeService: Employees, 
    private departmentService: Departments, private fb: FormBuilder, private messageService: MessageService) {
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
    document.addEventListener('click', this.closeDropdownOnClickOutside);
    this.generateCycles();
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

  generateCycles() {
    const currentYear = new Date().getFullYear();
    this.cycles = [];
  
    for (let i = 0; i < 20; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      const cycle = `APR-${startYear} TO MAR-${endYear}`;
  
      this.cycles.push({ label: cycle, value: cycle });
    }
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
    const searchBox = document.getElementById('searchBox') as HTMLInputElement;
    if (searchBox) searchBox.value = '';
    this.showFilterDropdown = false; // hide after selecting
    this.onFilterChange(); // trigger filter logic
  }

  loadSummaries() {
    this.loading = true
    this.performanceService.getSummaries().subscribe({
      next: (data) => {
        if (this.role === 'HR Manager' || this.role === 'Management') {
          this.summaries = data;
        } else if (this.role === 'Executives' && Number(localStorage.getItem('deptId')) === 1) {
          // HR sees all OTHER departments except HR department
          this.summaries = (data || []).filter(
            (a: any) => a?.departmentId !== 1
          );
        }
        else if (this.role === 'Reporting Manager') {
          this.summaries = (data || []).filter(
            (a: any) => a.employee?.reportingManager === Number(this.loggedEmployeeId)
          );

        }
        this.filteredSummaries = [...this.summaries];
        console.log('Loaded summaries:', this.filteredSummaries);
      },
      error: () => {
        // alert('Error loading appraisals');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error loading appraisals'
        });
        this.loading = false
      }
    });
    setTimeout(() => {
      this.filteredSummaries = [...this.summaries];
      this.loading = false; // 👈 stop loading
    }, 800);

  }

  loadEmployees() {
    this.employeeService.getActiveEmployees().subscribe(res => this.employees = res);
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
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Performance summaries assigned successfully.' });
        console.log('Assigned:', res);
        this.visible = false;
        this.assignForm.reset();
        this.loadSummaries();
      },
      error: (err) => {
        console.error(err)
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to assign performance summaries.' });
      }
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
