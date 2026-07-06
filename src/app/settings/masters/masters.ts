import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { Departments, Department } from '../../services/departments/departments';
import { Branches, Branch } from '../../services/branches/branches';
import { Designations, Designation } from '../../services/designations/designations';
import { Roles, Role } from '../../services/roles/roles';
import { Leaves } from '../../services/leaves/leaves';
import { Shifts } from '../../services/shifts/shifts';
import { Holidays } from '../../services/holidays/holidays';
import { WeeklyRatingService } from '../../services/weekly-rating/weekly-rating';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';

type MasterTab = 'departments' | 'branches' | 'designations' | 'roles' | 'leaveTypes' | 'shiftTemplates' | 'holidays' | 'ratingQuestions';

@Component({
  selector: 'app-masters',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    DialogModule, InputTextModule, TooltipModule, ToggleSwitchModule, ConfirmDialogModule, DatePickerModule, SelectModule, MultiSelectModule, InputNumberModule, ModuleGuide, RouterModule
  ],
  templateUrl: './masters.html',
  styleUrl: './masters.css',
  providers: [MessageService, ConfirmationService]
})
export class Masters implements OnInit {
  activeTab: MasterTab = 'departments';

  // Data
  departments: Department[] = [];
  branches: Branch[] = [];
  designations: Designation[] = [];
  roles: Role[] = [];
  leaveTypes: any[] = [];
  shiftTemplates: any[] = [];
  holidayCalendar: any = null;
  holidays: any[] = [];
  holidayYear = new Date().getFullYear();
  ratingQuestions: any[] = [];
  ratingDesignationFilter: number | null = null;
  newQuestionDesignationId: number | null = null;

  loading = false;

  // Dialog
  dialogVisible = false;
  dialogTitle = '';
  isEditing = false;
  editingId: number | null = null;

  // Form fields
  formName = '';
  formLocation = '';
  formDescription = '';
  formIsActive = true;
  // Department planning + appraisal-cycle master fields
  formOtBudget = 0;
  formMinStrength = 0;
  formApprBasis = 'DOJ';
  formApprPeriod = 12;
  formApprCalMonth: number | null = null;
  readonly monthOptions = [
    { v: 1, n: 'January' }, { v: 2, n: 'February' }, { v: 3, n: 'March' }, { v: 4, n: 'April' },
    { v: 5, n: 'May' }, { v: 6, n: 'June' }, { v: 7, n: 'July' }, { v: 8, n: 'August' },
    { v: 9, n: 'September' }, { v: 10, n: 'October' }, { v: 11, n: 'November' }, { v: 12, n: 'December' },
  ];
  readonly apprBasisOptions = [
    { label: 'DOJ anniversary (from joining date)', value: 'DOJ' },
    { label: 'Calendar month (fixed month)', value: 'CALENDAR' },
  ];
  readonly apprPeriodOptions = [
    { label: 'Annual (12 months)', value: 12 },
    { label: 'Half-yearly (6 months)', value: 6 },
  ];

  /** Short month name for a 1-12 value. */
  monthName(v: number | null | undefined): string {
    return v ? (this.monthOptions[v - 1]?.n.slice(0, 3) ?? '—') : '—';
  }
  /** The second appraisal month for a half-yearly calendar cycle (anchor + 6). */
  secondMonth(v: number | null | undefined): number | null {
    return v ? ((v - 1 + 6) % 12) + 1 : null;
  }
  /** One-line appraisal-cycle summary for the departments table. */
  apprSummary(d: any): string {
    if ((d.appraisalCycleBasis || 'DOJ') === 'DOJ') {
      return `DOJ · ${d.appraisalPeriodMonths || 12}mo`;
    }
    const m1 = this.monthName(d.appraisalCalendarMonth);
    if (d.appraisalPeriodMonths === 6) {
      return `Calendar · ${m1} & ${this.monthName(this.secondMonth(d.appraisalCalendarMonth))}`;
    }
    return `Calendar · ${m1}`;
  }
  formShiftType = 'MORNING';
  formStartTime = '';
  formEndTime = '';
  formDepartmentIds: number[] = []; // departments this shift is assignable to
  formDate: Date | null = null;
  formCalendarYear: number = new Date().getFullYear();
  formCalendarName = '';
  formIsOptional = false;

  shiftTypeOptions = [
    { label: 'Morning', value: 'MORNING' },
    { label: 'Evening', value: 'EVENING' },
    { label: 'Night', value: 'NIGHT' },
    { label: 'Flexible', value: 'FLEXIBLE' },
    { label: 'Nursing', value: 'NURSING' },
  ];

  constructor(
    private departmentService: Departments,
    private branchService: Branches,
    private designationService: Designations,
    private roleService: Roles,
    private leaveService: Leaves,
    private shiftService: Shifts,
    private holidayService: Holidays,
    private ratingService: WeeklyRatingService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.setTabFromUrl();
    this.loadData();
  }

  private setTabFromUrl() {
    const url = this.router.url;
    const tabMap: Record<string, MasterTab> = {
      'departments': 'departments',
      'branches': 'branches',
      'designations': 'designations',
      'roles': 'roles',
      'leave-types': 'leaveTypes',
      'shift-templates': 'shiftTemplates',
      'holidays': 'holidays',
    };
    const segment = url.split('/').pop() || '';
    if (tabMap[segment]) {
      this.activeTab = tabMap[segment];
    }
  }

  switchTab(tab: MasterTab) {
    this.activeTab = tab;
    const routeMap: Record<MasterTab, string> = {
      departments: '/masters/departments',
      branches: '/masters/branches',
      designations: '/masters/designations',
      roles: '/masters/roles',
      leaveTypes: '/masters/leave-types',
      shiftTemplates: '/masters/shift-templates',
      holidays: '/masters/holidays',
      ratingQuestions: '/masters/rating-questions',
    };
    this.router.navigate([routeMap[tab]]);
    this.loadData();
  }

  loadData() {
    this.loading = true;
    switch (this.activeTab) {
      case 'departments':
        this.departmentService.getDepartments().subscribe({
          next: (data) => { this.departments = data; this.loading = false; },
          error: () => { this.showError('Failed to load departments'); this.loading = false; }
        });
        break;
      case 'branches':
        this.branchService.getBranches().subscribe({
          next: (data) => { this.branches = data; this.loading = false; },
          error: () => { this.showError('Failed to load branches'); this.loading = false; }
        });
        break;
      case 'designations':
        this.designationService.getDesignations().subscribe({
          next: (data) => { this.designations = data; this.loading = false; },
          error: () => { this.showError('Failed to load designations'); this.loading = false; }
        });
        break;
      case 'roles':
        this.roleService.getRoles().subscribe({
          next: (data) => { this.roles = data; this.loading = false; },
          error: () => { this.showError('Failed to load roles'); this.loading = false; }
        });
        break;
      case 'leaveTypes':
        this.leaveService.getLeaveTypes().subscribe({
          next: (data) => { this.leaveTypes = data; this.loading = false; },
          error: () => { this.showError('Failed to load leave types'); this.loading = false; }
        });
        break;
      case 'shiftTemplates':
        // Departments are needed for the per-shift "Departments" multi-select.
        if (!this.departments.length) {
          this.departmentService.getDepartments().subscribe({ next: (d) => { this.departments = d; } });
        }
        this.shiftService.getShiftTemplates().subscribe({
          next: (data) => { this.shiftTemplates = data; this.loading = false; },
          error: () => { this.showError('Failed to load shift templates'); this.loading = false; }
        });
        break;
      case 'holidays':
        this.holidayService.getHolidaysByYear(this.holidayYear).subscribe({
          next: (data) => {
            this.holidayCalendar = data;
            this.holidays = data?.holidays || [];
            this.loading = false;
          },
          error: () => { this.holidays = []; this.holidayCalendar = null; this.loading = false; }
        });
        break;
      case 'ratingQuestions':
        const desigFilter = this.ratingDesignationFilter || undefined;
        this.ratingService.getQuestions(desigFilter).subscribe({
          next: (data) => { this.ratingQuestions = data; this.loading = false; },
          error: () => { this.showError('Failed to load questions'); this.loading = false; }
        });
        break;
    }
  }

  onRatingDesignationFilter() { this.loadData(); }

  seedDefaultQuestions() {
    this.ratingService.seedDefaults().subscribe({
      next: (res) => { this.messageService.add({ severity: 'success', summary: 'Done', detail: res.message }); this.loadData(); },
      error: (e) => this.showError(e.error?.error || 'Failed')
    });
  }

  toggleRatingQuestion(q: any) {
    this.ratingService.toggleQuestion(q.id, !q.isActive).subscribe({
      next: () => this.loadData(),
      error: (e) => this.showError(e.error?.error || 'Max 5 custom per designation')
    });
  }

  deleteRatingQuestion(q: any) {
    this.confirmationService.confirm({
      message: `Delete question "${q.text}"?`,
      accept: () => {
        this.ratingService.deleteQuestion(q.id).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted' }); this.loadData(); },
          error: (e) => this.showError(e.error?.error || 'Failed')
        });
      }
    });
  }

  // ── Dialog Open ────────────────────────────────────────────────────────
  openCreateDialog() {
    this.isEditing = false;
    this.editingId = null;
    this.formName = '';
    this.formLocation = '';
    this.formDescription = '';
    this.formIsActive = true;
    this.formOtBudget = 0;
    this.formMinStrength = 0;
    this.formApprBasis = 'DOJ';
    this.formApprPeriod = 12;
    this.formApprCalMonth = null;
    this.formShiftType = 'MORNING';
    this.formStartTime = '';
    this.formEndTime = '';
    this.formDepartmentIds = [];
    this.formDate = null;
    this.formDescription = '';
    this.formIsOptional = false;
    this.dialogTitle = `Add ${this.getTabLabel()}`;
    this.dialogVisible = true;
  }

  openEditDialog(item: any) {
    this.isEditing = true;
    this.editingId = item.id;
    this.formName = item.name || item.title || '';
    this.formLocation = item.location || '';
    this.formDescription = item.description || '';
    this.formIsActive = item.isActive !== undefined ? item.isActive : true;
    this.formOtBudget = item.otBudgetHoursPerMonth ?? 0;
    this.formMinStrength = item.minDailyStrength ?? 0;
    this.formApprBasis = item.appraisalCycleBasis || 'DOJ';
    this.formApprPeriod = item.appraisalPeriodMonths || 12;
    this.formApprCalMonth = item.appraisalCalendarMonth ?? null;
    this.formShiftType = item.shiftType || 'MORNING';
    this.formStartTime = item.startTime ? this.toTimeString(item.startTime) : '';
    this.formEndTime = item.endTime ? this.toTimeString(item.endTime) : '';
    this.formDepartmentIds = item.departmentIds || (item.departments?.map((d: any) => d.id) ?? []);
    this.formDate = item.date ? new Date(item.date) : null;
    this.formIsOptional = item.isOptional ?? false;
    this.dialogTitle = `Edit ${this.getTabLabel()}`;
    this.dialogVisible = true;
  }

  private toTimeString(dt: string): string {
    const d = new Date(dt);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private toISOTime(time: string): string {
    const [h, m] = time.split(':');
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toISOString();
  }

  getTabLabel(): string {
    switch (this.activeTab) {
      case 'departments': return 'Department';
      case 'branches': return 'Branch';
      case 'designations': return 'Designation';
      case 'roles': return 'Role';
      case 'leaveTypes': return 'Leave Type';
      case 'shiftTemplates': return 'Shift Template';
      case 'holidays': return 'Holiday';
      case 'ratingQuestions': return 'Rating Question';
    }
  }

  onHolidayYearChange() {
    this.loadData();
  }

  createCalendar() {
    if (!this.formCalendarName.trim()) {
      this.showWarn('Calendar name is required');
      return;
    }
    this.holidayService.createCalendar({ year: this.formCalendarYear, name: this.formCalendarName }).subscribe({
      next: () => {
        this.onSaveSuccess('Holiday calendar created');
        this.formCalendarName = '';
      },
      error: (e) => this.onSaveError(e)
    });
  }

  // ── Save (Create / Update) ─────────────────────────────────────────────
  save() {
    if (!this.formName.trim()) {
      this.showWarn('Name is required');
      return;
    }

    switch (this.activeTab) {
      case 'departments': {
        const deptData = {
          name: this.formName,
          otBudgetHoursPerMonth: Number(this.formOtBudget) || 0,
          minDailyStrength: Number(this.formMinStrength) || 0,
          appraisalCycleBasis: this.formApprBasis === 'CALENDAR' ? 'CALENDAR' : 'DOJ',
          appraisalPeriodMonths: Number(this.formApprPeriod) || 12,
          appraisalCalendarMonth: this.formApprBasis === 'CALENDAR' ? (this.formApprCalMonth ?? null) : null,
        };
        if (this.isEditing) {
          this.departmentService.updateDepartment(this.editingId!, deptData).subscribe({
            next: () => { this.onSaveSuccess('Department updated'); },
            error: (e) => this.onSaveError(e)
          });
        } else {
          this.departmentService.createDepartment(deptData).subscribe({
            next: () => { this.onSaveSuccess('Department created'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;
      }

      case 'branches':
        const branchData: Branch = { name: this.formName, location: this.formLocation || undefined };
        if (this.isEditing) {
          this.branchService.updateBranch(this.editingId!, branchData).subscribe({
            next: () => { this.onSaveSuccess('Branch updated'); },
            error: (e) => this.onSaveError(e)
          });
        } else {
          this.branchService.createBranch(branchData).subscribe({
            next: () => { this.onSaveSuccess('Branch created'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;

      case 'designations':
        const desigData: Designation = { name: this.formName, isActive: this.formIsActive };
        if (this.isEditing) {
          this.designationService.updateDesignation(this.editingId!, desigData).subscribe({
            next: () => { this.onSaveSuccess('Designation updated'); },
            error: (e) => this.onSaveError(e)
          });
        } else {
          this.designationService.createDesignation(desigData).subscribe({
            next: () => { this.onSaveSuccess('Designation created'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;

      case 'roles':
        const roleData: Role = { name: this.formName, description: this.formDescription || undefined };
        if (this.isEditing) {
          this.roleService.updateRole(this.editingId!, roleData).subscribe({
            next: () => { this.onSaveSuccess('Role updated'); },
            error: (e) => this.onSaveError(e)
          });
        } else {
          this.roleService.createRole(roleData).subscribe({
            next: () => { this.onSaveSuccess('Role created'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;

      case 'leaveTypes':
        if (!this.isEditing) {
          this.leaveService.createLeaveType(this.formName).subscribe({
            next: () => { this.onSaveSuccess('Leave Type created'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;

      case 'shiftTemplates':
        if (!this.formStartTime || !this.formEndTime) {
          this.showWarn('Start time and end time are required');
          return;
        }
        const shiftData = {
          name: this.formName,
          shiftType: this.formShiftType,
          startTime: this.toISOTime(this.formStartTime),
          endTime: this.toISOTime(this.formEndTime),
          departmentIds: this.formDepartmentIds || [],
        };
        if (this.isEditing) {
          this.shiftService.updateShiftTemplate(this.editingId!, shiftData).subscribe({
            next: () => { this.onSaveSuccess('Shift Template updated'); },
            error: (e) => this.onSaveError(e)
          });
        } else {
          this.shiftService.createShiftTemplate(shiftData).subscribe({
            next: () => { this.onSaveSuccess('Shift Template created'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;

      case 'holidays':
        if (!this.formDate) {
          this.showWarn('Date is required');
          return;
        }
        const holidayPayload = {
          title: this.formName,
          date: this.formDate.toISOString(),
          description: this.formDescription || undefined,
          isOptional: this.formIsOptional,
        };
        if (this.isEditing) {
          this.holidayService.updateHoliday(this.editingId!, holidayPayload).subscribe({
            next: () => { this.onSaveSuccess('Holiday updated'); },
            error: (e) => this.onSaveError(e)
          });
        } else {
          if (!this.holidayCalendar?.id) {
            this.showWarn('Create a holiday calendar first');
            return;
          }
          this.holidayService.addHoliday(this.holidayCalendar.id, holidayPayload).subscribe({
            next: () => { this.onSaveSuccess('Holiday added'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;

      case 'ratingQuestions':
        if (!this.newQuestionDesignationId) {
          this.showWarn('Select a designation');
          return;
        }
        this.ratingService.createQuestion(this.formName, this.newQuestionDesignationId).subscribe({
          next: () => { this.onSaveSuccess('Question added'); },
          error: (e) => this.onSaveError(e)
        });
        break;
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  confirmDelete(item: any) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${item.name || item.title}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteItem(item),
    });
  }

  deleteItem(item: any) {
    switch (this.activeTab) {
      case 'departments':
        this.departmentService.deleteDepartment(item.id).subscribe({
          next: () => this.onDeleteSuccess(),
          error: (e) => this.onDeleteError(e)
        });
        break;
      case 'branches':
        this.branchService.deleteBranch(item.id).subscribe({
          next: () => this.onDeleteSuccess(),
          error: (e) => this.onDeleteError(e)
        });
        break;
      case 'designations':
        this.designationService.deleteDesignation(item.id).subscribe({
          next: () => this.onDeleteSuccess(),
          error: (e) => this.onDeleteError(e)
        });
        break;
      case 'roles':
        this.roleService.deleteRole(item.id).subscribe({
          next: () => this.onDeleteSuccess(),
          error: (e) => this.onDeleteError(e)
        });
        break;
      case 'shiftTemplates':
        this.shiftService.deleteShiftTemplate(item.id).subscribe({
          next: () => this.onDeleteSuccess(),
          error: (e) => this.onDeleteError(e)
        });
        break;
      case 'holidays':
        this.holidayService.deleteHoliday(item.id).subscribe({
          next: () => this.onDeleteSuccess(),
          error: (e) => this.onDeleteError(e)
        });
        break;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  private onSaveSuccess(msg: string) {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: msg });
    this.dialogVisible = false;
    this.loadData();
  }

  private onSaveError(e: any) {
    const msg = e.error?.error || e.error?.message || 'Operation failed';
    this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
  }

  private onDeleteSuccess() {
    this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Record deleted successfully' });
    this.loadData();
  }

  private onDeleteError(e: any) {
    const msg = e.error?.error || 'Delete failed. It may be in use.';
    this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
  }

  private showError(msg: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
  }

  private showWarn(msg: string) {
    this.messageService.add({ severity: 'warn', summary: 'Warning', detail: msg });
  }
}
