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
import { FileUrlPipe } from '../../pipes/file-url.pipe';


@Component({
  selector: 'app-dept-performance',
  imports: [CommonModule, FormsModule, CardModule, SelectModule, DialogModule, TableModule, ReactiveFormsModule,
    ButtonModule, AppraisalTemplate, MultiSelectModule, TextareaModule, InputTextModule, SkeletonModule, InputIconModule, IconFieldModule,
    AppraisalPauseDialog, ToastModule, FileUrlPipe],
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
  selectedFilter: any = null;
  showFilterDropdown = false;
  filteredSummaries: any[] = [];

  /** Reviewer columns HR chases, in the order they normally happen. `short` is
   *  what fits in the cell; `label` carries the full name in the tooltip. */
  progressRoles = [
    { key: 'SELF', label: 'Self appraisal', short: 'Self' },
    { key: 'INCHARGE', label: 'In-charge', short: 'IC' },
    { key: 'HOD', label: 'HOD (reporting manager)', short: 'HOD' },
    { key: 'MANAGEMENT', label: 'Management', short: 'Mgmt' },
  ];

  /** Narrow the list to rows still waiting on someone. */
  pendingFilter: string | null = null;
  pendingOptions = [
    { label: 'All rows', value: null },
    { label: 'Pending self appraisal', value: 'SELF' },
    { label: 'Pending in-charge', value: 'INCHARGE' },
    { label: 'Pending HOD', value: 'HOD' },
    { label: 'Pending management', value: 'MANAGEMENT' },
  ];

  /** Present only when the server decided this caller may see it (HR/Management). */
  get showProgress(): boolean {
    return this.summaries.some(s => !!s.progress);
  }

  progressTitle(label: string, state: string | undefined): string {
    switch (state) {
      case 'done': return `${label}: complete`;
      case 'partial': return `${label}: started, not all questions answered`;
      case 'unknown': return `${label}: scores recorded, but no template is attached so completeness can't be checked`;
      default: return `${label}: not started`;
    }
  }

  /** Current search text, kept so the pending filter can re-apply it. */
  private searchText = '';
  loading = true;
  isLoading = false;

  // FIRST_YEAR creates all four probation rows under one DOJ-derived cycle;
  // RECURRING creates the single annual row for the current cycle.
  tracks = [
    { label: 'First year (1st / 3rd / 6th month + 1 year)', value: 'FIRST_YEAR' },
    { label: 'Annual review', value: 'RECURRING' },
  ];

  periodLabels: Record<string, string> = {
    MONTH_1: '1st Month',
    MONTH_3: '3rd Month',
    MONTH_6: '6th Month',
    YEAR_1: '1 Year',
  };

  cyclePreview: {
    cycle: string;
    periods: Array<{ period: string; milestoneDate: string; reached: boolean; label: string }>;
    more: number;
    /** Set when FIRST_YEAR is chosen for someone already past their first year. */
    backfill: { completedOn: string; annualCycle: string | null } | null;
  } | null = null;
  cyclePreviewLoading = false;
  cyclePreviewError = '';

  /** Guards against an earlier lookup overwriting a later one — the preview
   *  used to show the first-year plan while Annual review was selected. */
  private previewToken = 0;

  constructor(private performanceService: PerformanceService, private employeeService: Employees,
    private departmentService: Departments, private fb: FormBuilder, private messageService: MessageService,
    private appraisalService: Appraisal) {
    // No cycle/period fields — the backend derives both from each employee's
    // DOJ and their department's configured basis. HR picks who and which track.
    this.assignForm = this.fb.group({
      employeeIds: [[], Validators.required],
      departmentId: [null, Validators.required],
      track: ['FIRST_YEAR', Validators.required],
      templateId: [null, Validators.required],
    });
  }

  ngOnInit() {
    // Role first — loadSummaries() and the action-column buttons both read it.
    this.role = localStorage.getItem('role') || '';
    this.loadSummaries();
    this.loadEmployees();
    this.loadDepartments();
    document.addEventListener('click', this.closeDropdownOnClickOutside);

    // Templates now depend on department alone — a question set is valid for
    // every cycle, so there's nothing to reload when the track changes.
    this.assignForm.get('departmentId')?.valueChanges.subscribe(() => {
      this.assignForm.patchValue({ templateId: null }, { emitEvent: false });
      this.loadTemplates();
    });
    // Preview which cycle the selection will land in, so HR sees it before saving.
    this.assignForm.get('employeeIds')?.valueChanges.subscribe(() => this.previewCycle());
    this.assignForm.get('track')?.valueChanges.subscribe(() => this.previewCycle());
  }

  loadTemplates() {
    const departmentId = this.assignForm.value.departmentId;
    if (!departmentId) {
      this.templates = [];
      return;
    }
    this.templatesLoading = true;
    this.performanceService.listTemplates(departmentId).subscribe({
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
          detail: 'Failed to load templates for this department'
        });
      }
    });
  }

  /**
   * Read-only preview of the derived cycle for the first selected employee.
   * HR no longer chooses a cycle, so this is how they see what will be created.
   */
  previewCycle() {
    const ids: number[] = this.assignForm.value.employeeIds || [];
    const track = this.assignForm.value.track;
    this.cyclePreview = null;
    this.cyclePreviewError = '';
    if (!ids.length || !track) {
      this.cyclePreviewLoading = false;
      return;
    }

    // Employee and track changes both trigger a lookup, so two can be in flight
    // at once. Only the newest may render.
    const token = ++this.previewToken;
    this.cyclePreviewLoading = true;

    this.performanceService.getEmployeeCycles(ids[0]).subscribe({
      next: (res) => {
        // Superseded, or the selection moved on while this was in flight.
        if (token !== this.previewToken) return;
        if (this.assignForm.value.track !== track) return;

        this.cyclePreviewLoading = false;
        const plan = (res.plans || []).find(p => p.track === track);

        if (!plan) {
          this.cyclePreview = null;
          this.cyclePreviewError = track === 'RECURRING'
            ? 'No annual cycle has started for this employee yet — their first year is still running.'
            : 'No first-year cycle could be derived (check the date of joining).';
          return;
        }

        // First-year track chosen for someone whose first year is already over:
        // allowed, since the paper reviews may never have been recorded, but
        // it's a backfill and HR should know before pressing Assign.
        let backfill: { completedOn: string; annualCycle: string | null } | null = null;
        if (track === 'FIRST_YEAR') {
          const yearOne = plan.periods.find(p => p.period === 'YEAR_1');
          if (yearOne?.reached) {
            const annual = (res.plans || []).filter(p => p.track === 'RECURRING');
            backfill = {
              completedOn: plan.endDate,
              annualCycle: annual.length ? annual[annual.length - 1].cycle : null,
            };
          }
        }

        this.cyclePreview = {
          cycle: plan.cycle,
          periods: plan.periods.map(p => ({
            period: p.period,
            milestoneDate: p.milestoneDate,
            reached: p.reached,
            // Server-supplied; a second-year review reads "2nd Year" even
            // though it is stored as YEAR_1.
            label: p.label || this.periodLabels[p.period] || p.period,
          })),
          more: ids.length > 1 ? ids.length - 1 : 0,
          backfill,
        };
      },
      error: (err) => {
        if (token !== this.previewToken) return;
        this.cyclePreviewLoading = false;
        this.cyclePreviewError = err?.error?.error || 'Could not derive the cycle for this employee.';
      },
    });
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.closeDropdownOnClickOutside);
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
    this.searchText = (event.target as HTMLInputElement).value.toLowerCase();
    this.applyFilters();
  }

  onPendingFilterChange() {
    this.applyFilters();
  }

  /** Search text and the pending filter both narrow the same list. */
  private applyFilters() {
    let rows = this.matchesSearch(this.searchText);

    if (this.pendingFilter) {
      // "Pending" means that reviewer has not finished — not started or partway.
      rows = rows.filter(s => (s.progress?.[this.pendingFilter!] ?? 'none') !== 'done');
    }

    this.filteredSummaries = rows;
  }

  private matchesSearch(searchText: string): any[] {
    if (!searchText) return [...this.summaries];

    const filterKey = this.selectedFilter?.value;

    return this.summaries.filter(s => {
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
    this.applyFilters();
    this.showFilterDropdown = false;
  }
  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }
  selectFilter(option: any) {
    this.selectedFilter = option;
    const searchBox = document.getElementById('searchBox') as HTMLInputElement;
    if (searchBox) searchBox.value = '';
    this.searchText = '';
    this.showFilterDropdown = false; // hide after selecting
    this.onFilterChange(); // trigger filter logic
  }

  loadSummaries() {
    this.loading = true;

    this.performanceService.getSummaries().subscribe({
      next: (data: any[]) => {
        // No client-side role filtering. GET /performance/summaries is now
        // scoped server-side (see getAllSummaries), which is the only place it
        // can be enforced — the old filter here fell through to "show
        // everything" for any role it didn't name, and was bypassable anyway.
        const filtered = data || [];

        this.summaries = filtered.map(s => ({
          ...s,
          gender: s.employee?.gender,
          photoUrl: s.employee?.photoUrl
        }));

        // Re-apply whatever search / pending filter was active before the reload.
        this.applyFilters();
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
    // Previously-picked employees belong to the old department — drop them
    // rather than silently assigning across departments.
    this.assignForm.patchValue({ employeeIds: [] });
  }

  onAssign() {
    const { employeeIds, track, templateId } = this.assignForm.value;
    this.isLoading = true;
    // departmentId only scopes the employee/template pickers — the backend
    // takes the department from each employee's own record.
    this.performanceService.assignForm({ employeeIds, track, templateId }).subscribe({
      next: (res: any[]) => {
        this.isLoading = false;
        const rows = res || [];
        const ok = rows.filter(r => r.assigned);
        const failed = rows.filter(r => !r.assigned);
        const rowCount = ok.reduce((n, r) => n + (r.created?.length || 0), 0);

        if (ok.length) {
          this.messageService.add({
            severity: 'success',
            summary: 'Assigned',
            detail: `${rowCount} row(s) created for ${ok.length} employee(s).`,
          });
        }
        // A batch can mix tenures, so name anyone whose first year was already
        // over — those rows are a backfill, not a live review.
        const backfilled = ok.filter(r => r.backfill);
        if (backfilled.length) {
          this.messageService.add({
            severity: 'info',
            summary: `${backfilled.length} backfilled`,
            detail: `${backfilled.map(r => r.employeeName || `#${r.employeeId}`).join(', ')} ` +
              `already finished their first year — those milestones are all in the past.`,
            life: 8000,
          });
        }
        // A batch can partly fail (no DOJ, wrong department, already assigned)
        // — surface that instead of reporting blanket success.
        if (failed.length) {
          this.messageService.add({
            severity: ok.length ? 'warn' : 'error',
            summary: `${failed.length} skipped`,
            detail: [...new Set(failed.map(r => r.message).filter(Boolean))].join(' · ') || 'Already assigned',
            life: 7000,
          });
        }

        this.visible = false;
        this.assignForm.reset({ track: 'FIRST_YEAR', employeeIds: [] });
        this.cyclePreview = null;
        this.cyclePreviewError = '';
        this.loadSummaries();
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.error || 'Failed to assign performance summaries.',
        });
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
  getDepartmentColors(departmentId?: number | null) {
    // Guard: an unresolved department produced hsl(NaN, …), i.e. no colour.
    const baseHue = ((Number(departmentId) || 0) * 40) % 360;
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
