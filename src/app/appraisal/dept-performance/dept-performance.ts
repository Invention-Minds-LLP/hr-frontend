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
import { AppraisalPauseDialog } from '../appraisal-pause-dialog/appraisal-pause-dialog';
import { Appraisal } from '../../services/appraisal/appraisal';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';
import { InputText, InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ToastModule } from 'primeng/toast';


@Component({
  selector: 'app-dept-performance',
  imports: [CommonModule, FormsModule, CardModule, SelectModule, DialogModule, TableModule, ReactiveFormsModule,
    ButtonModule, AppraisalTemplate, MultiSelectModule, TextareaModule, InputTextModule, SkeletonModule, InputIconModule, IconFieldModule,
    AppraisalPauseDialog, ToastModule],
  templateUrl: './dept-performance.html',
  styleUrl: './dept-performance.css'
})
export class DeptPerformance {
  summaries: any[] = [];
  employees: any[] = [];
  departments: any[] = [];
  filteredEmployees: any[] = [];
  templates: any[] = [];
  templatesLoading = false;
  visible = false;

  // Per-row "Assign Template" dialog state
  assignTemplateVisible = false;
  assignTemplateRow: any = null;
  rowTemplates: any[] = [];
  rowTemplatesLoading = false;
  selectedRowTemplateId: number | null = null;
  assignTemplateSaving = false;

  // Pause dialog state
  pauseDialogVisible = false;
  pauseEmployeeId: number | null = null;
  pauseEmployeeLabel = '';
  // employeeId -> {active: true, since: Date} or null. Drives the row badge.
  pauseStatus: Record<number, { active: boolean; since: string } | null> = {};
  // Mirror of the backend HR-override rule (roleId 1 OR dept 1 + roleId 2)
  isHRUser = Number(localStorage.getItem('roleId')) === 1 ||
    (Number(localStorage.getItem('deptId')) === 1 && Number(localStorage.getItem('roleId')) === 2);

  // Dept-performance has only one form path (the performance template). Block
  // it for EVERYONE when paused — HR must un-pause first to backfill. The
  // managerial-appraisal flow keeps HR's override because HR uses separate
  // buttons there (Verify / Review) that bypass Fill Review entirely.
  isLockedByPause(employeeId: number): boolean {
    return !!this.pauseStatus[employeeId]?.active;
  }
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
    private departmentService: Departments, private fb: FormBuilder, private messageService: MessageService,
    private appraisalService: Appraisal) {
    this.assignForm = this.fb.group({
      employeeIds: [[], Validators.required],
      departmentId: [null, Validators.required],
      cycle: ['', Validators.required],
      templateId: [null, Validators.required],
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

    // Reload templates whenever department or cycle changes; clear stale picks.
    this.assignForm.get('departmentId')?.valueChanges.subscribe(() => {
      this.assignForm.patchValue({ templateId: null }, { emitEvent: false });
      this.loadTemplates();
    });
    this.assignForm.get('cycle')?.valueChanges.subscribe(() => {
      this.assignForm.patchValue({ templateId: null }, { emitEvent: false });
      this.loadTemplates();
    });
  }

  loadTemplates() {
    const departmentId = this.assignForm.value.departmentId;
    const cycle = this.assignForm.value.cycle;
    if (!departmentId || !cycle) {
      this.templates = [];
      return;
    }
    this.templatesLoading = true;
    this.performanceService.listTemplates(departmentId, cycle).subscribe({
      next: (rows) => {
        this.templates = rows || [];
        this.templatesLoading = false;
      },
      error: () => {
        this.templates = [];
        this.templatesLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load templates for this department + cycle'
        });
      }
    });
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
    this.loading = true;

    this.performanceService.getSummaries().subscribe({
      next: (data: any[]) => {

        let filtered = data || [];

        if (this.role === 'HR Manager' || this.role === 'Management') {
          filtered = data;
        }
        else if (this.role === 'Executives' && Number(localStorage.getItem('deptId')) === 1) {
          filtered = data.filter((a: any) => a?.departmentId !== 1);
        }
        else if (this.role === 'Reporting Manager') {
          filtered = data.filter(
            (a: any) => a.employee?.reportingManager === Number(this.loggedEmployeeId)
          );
        }

        this.summaries = filtered.map(s => ({
          ...s,
          gender: s.employee?.gender,
          photoUrl: s.employee?.photoUrl
        }));

        this.filteredSummaries = [...this.summaries];
        this.loading = false;

        // TEMP: pause feature on hold — uncomment to re-enable.
        // Without this load, pauseStatus stays empty, so badges don't render
        // and openSummary's isLockedByPause() guard always returns false.
        // const uniqueEmpIds = Array.from(new Set(this.summaries.map(s => s.employeeId).filter(Boolean)));
        // for (const empId of uniqueEmpIds) this.refreshPauseStatus(empId);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error loading performance summaries'
        });
        this.loading = false;
      }
    });
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

  openPauseDialog(row: any) {
    this.pauseEmployeeId = row.employeeId ?? row.employee?.id;
    this.pauseEmployeeLabel = `${row.employee?.firstName ?? ''} ${row.employee?.lastName ?? ''}`.trim()
      || `Employee #${this.pauseEmployeeId}`;
    this.pauseDialogVisible = true;
  }

  onPauseChanged() {
    // Refresh pause badges for the employee that was just edited
    if (this.pauseEmployeeId != null) this.refreshPauseStatus(this.pauseEmployeeId);
  }

  refreshPauseStatus(employeeId: number) {
    this.appraisalService.getActivePause(employeeId).subscribe({
      next: ({ active }) => {
        this.pauseStatus[employeeId] = active
          ? { active: true, since: active.startDate }
          : null;
      },
      error: () => { /* badge just stays absent */ },
    });
  }

  openAssignTemplate(row: any) {
    this.assignTemplateRow = row;
    this.selectedRowTemplateId = null;
    this.rowTemplates = [];
    this.assignTemplateVisible = true;
    this.rowTemplatesLoading = true;
    this.performanceService.listTemplates(row.departmentId, row.cycle).subscribe({
      next: (rows) => {
        this.rowTemplates = rows || [];
        this.rowTemplatesLoading = false;
      },
      error: () => {
        this.rowTemplates = [];
        this.rowTemplatesLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load templates' });
      },
    });
  }

  confirmAssignTemplate() {
    if (!this.assignTemplateRow || !this.selectedRowTemplateId) return;
    this.assignTemplateSaving = true;
    this.performanceService.assignSummaryTemplate(this.assignTemplateRow.id, this.selectedRowTemplateId).subscribe({
      next: () => {
        this.assignTemplateSaving = false;
        this.assignTemplateVisible = false;
        this.messageService.add({ severity: 'success', summary: 'Assigned', detail: 'Template attached to this row' });
        this.loadSummaries();
      },
      error: (err) => {
        this.assignTemplateSaving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Cannot assign',
          detail: err?.error?.error || 'Failed to assign template',
        });
      },
    });
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
    if (this.isLockedByPause(summary.employeeId)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Paused',
        detail: 'Employee appraisal is paused. End the pause before opening the form.',
      });
      return;
    }
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
  selectedform: any | null = null;
  openSurvey(survey: any) {
    this.selectedform = survey;
  }

  closeSurvey() {
    this.selectedform = null;
  }

  getDefaultImage(gender?: string | null): string {
    const g = gender?.toUpperCase?.() || 'MALE';
    return g === 'FEMALE'
      ? '/img-women.png'
      : '/img.png';
  }


}
