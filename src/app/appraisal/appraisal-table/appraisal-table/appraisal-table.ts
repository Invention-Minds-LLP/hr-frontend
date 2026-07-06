import { Component, Output, EventEmitter } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Appraisal } from '../../../services/appraisal/appraisal';
import { Employees } from '../../../services/employees/employees';
import { Departments } from '../../../services/departments/departments';
import { Branches } from '../../../services/branches/branches';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { AppraisalPauseDialog } from '../../appraisal-pause-dialog/appraisal-pause-dialog';
import { FileUrlPipe } from '../../../pipes/file-url.pipe';

interface Table {
  empName: string;
  department: string;
  appraisalCycle: string;
  selfScore: string;
  mgrScore: string;
  hrScore: string;
  finalScore: string;
  outCome: string;
  status: string;
  email: string;
  empId: string;
}

@Component({
  selector: 'app-appraisal-table',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, ReactiveFormsModule, FormsModule, TableModule, CommonModule, MultiSelectModule, SelectModule, SkeletonModule, DialogModule, DatePickerModule, TextareaModule, TooltipModule, ButtonModule, ToastModule, AppraisalPauseDialog, FileUrlPipe],
  providers: [MessageService],
  templateUrl: './appraisal-table.html',
  styleUrl: './appraisal-table.css'
})
export class AppraisalTable {

  @Output() editAppraisal = new EventEmitter<any>();

  showPopup = false;
  appraisalForm!: FormGroup;
  employees: any[] = [];
  departments: any[] = [];
  branches: any[] = [];
  allEmployees: any[] = [];
  appraisals: any[] = [];
  filterOptions = [
    { label: 'Employee Code', value: 'employeeCode' },
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'departmentId' },
  ];

  // Status filter — workflow stages produced by getStatusLabel().
  searchText: string = '';
  selectedStatus: string = 'All';
  statusOptions: string[] = ['All', 'Draft', 'Pending Fill', 'Submitted', 'Both Submitted', 'HR Review', 'Edit Requested', 'Completed'];

  selectedFilter: any = null;
  filteredEmployees: any[] = [];
  showFilterDropdown = false;
  role: string = '';
  loggedEmployeeId: number = 0;
  loggedRoleId: number = 0;
  loggedDeptId: number = 0;
  isHRManager = false;
  isManagement = false;
  isHRExecutive = false; // dept 1, role 2 — manages other dept appraisals
  loading = true;

  // Full detail dialog (HR sees both self + manager)
  fullDetailDialogVisible = false;
  fullDetailAppraisal: any = null;
  employeeInsights: any = null;
  insightExpanded: string = '';

  // HR Verify dialog
  verifyDialogVisible = false;
  verifyAppraisal: any = null;
  verifyStartDate: Date | null = null;
  verifyEndDate: Date | null = null;
  verifyDueDate: Date | null = null;

  // HR Review dialog
  hrReviewDialogVisible = false;
  hrReviewAppraisal: any = null;
  hrReviewComments = '';
  hrRecommendations = '';

  // Loading states
  verifyLoading = false;
  hrReviewLoading = false;
  editResponseLoading = false;
  managerEditLoading = false;

  // Edit request response dialog
  editResponseDialogVisible = false;
  editResponseItem: any = null;
  editResponseAction: 'APPROVE' | 'REJECT' = 'APPROVE';
  editRejectionReason = ''

  // Pause dialog state
  pauseDialogVisible = false;
  pauseEmployeeId: number | null = null;
  pauseEmployeeLabel = '';
  pauseStatus: Record<number, { active: boolean; since: string } | null> = {};

  /** Mirrors backend rule: roleId 1 OR (deptId 1 + roleId 2). HR overrides pause. */
  isLockedByPause(employeeId: number): boolean {
    if (!this.pauseStatus[employeeId]?.active) return false;
    return !(this.isHRManager || this.isHRExecutive);
  }

  private toastPaused() {
    this.messageService.add({
      severity: 'warn',
      summary: 'Paused',
      detail: 'Employee appraisal is paused — only HR can open the form.',
    });
  }


  constructor(private fb: FormBuilder,
    private appraisalService: Appraisal,
    private employeeService: Employees,
    private departmentService: Departments,
    private branchService: Branches,
    private messageService: MessageService) { }

  ngOnInit() {
    this.appraisalForm = this.fb.group({
      cycle: ['', Validators.required],
      departmentId: ['', Validators.required],
      branchId: ['', Validators.required],
      employeeIds: [[], Validators.required]
    });
    document.addEventListener('click', this.closeDropdownOnClickOutside);
    this.filteredEmployees = [...this.appraisals]

    this.appraisalForm.get('departmentId')?.valueChanges.subscribe(() => this.filterEmployees());
    this.appraisalForm.get('branchId')?.valueChanges.subscribe(() => this.filterEmployees());

    this.role = localStorage.getItem('role') || '';
    this.loggedEmployeeId = Number(localStorage.getItem('empId'));
    this.loggedRoleId = Number(localStorage.getItem('roleId')) || 0;
    this.loggedDeptId = Number(localStorage.getItem('deptId')) || 0;
    this.isHRManager = this.loggedRoleId === 1;
    this.isManagement = this.loggedRoleId === 4;
    this.isHRExecutive = this.loggedDeptId === 1 && this.loggedRoleId === 2;

    this.loadDropdownData();
    this.getAppraisals();

  }

  closeDropdownOnClickOutside = (event: any) => {
    const dropdown = document.getElementById('filterDropdown');
    const button = document.getElementById('filterButton');

    if (!dropdown || !button) return;

    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
      this.showFilterDropdown = false;
    }
  };


  getAppraisals() {
    this.loading = true;

    this.appraisalService.getAllAppraisals().subscribe({
      next: (data: any[]) => {

        let filtered = data || [];

        if (this.isHRManager || this.isManagement) {
          // HR Manager and Management see all
          filtered = data;
        } else if (this.isHRExecutive) {
          // HR dept role-2 executives: see all non-HR-dept appraisals (not dept 1)
          filtered = data.filter(a =>
            a.employee?.departmentId !== 1
          );
        } else if (this.role === 'Reporting Manager' || this.loggedRoleId === 3) {
          // Reporting Manager: direct reports + own appraisal + appraisals
          // where they're the snapshotted manager (HR-reassigned) or the
          // snapshotted/current in-charge.
          filtered = data.filter(a => {
            const inchargeId = a.inchargeId ?? a.employee?.inchargeId;
            return (
              a.employee?.reportingManager === this.loggedEmployeeId
              || a.employeeId === this.loggedEmployeeId
              || a.managerId === this.loggedEmployeeId
              || inchargeId === this.loggedEmployeeId
            ) && !['AUTO_DRAFT', 'Draft'].includes(a.status);
          });
        } else {
          // All other employees: own appraisal + appraisals where they're
          // the snapshotted manager (reassigned) or the in-charge.
          filtered = data.filter(a => {
            const inchargeId = a.inchargeId ?? a.employee?.inchargeId;
            return (
              a.employeeId === this.loggedEmployeeId
              || a.managerId === this.loggedEmployeeId
              || inchargeId === this.loggedEmployeeId
            ) && !['AUTO_DRAFT', 'Draft'].includes(a.status);
          });
        }

        // ✅ FLATTEN HERE
        this.appraisals = filtered.map(a => ({
          ...a,
          gender: a.employee?.gender,
          photoUrl: a.employee?.photoUrl
        }));

        this.applyFilters();
        this.loading = false;

        // TEMP: pause feature on hold — uncomment to re-enable.
        // Without this load, pauseStatus stays empty, so badges don't render
        // and the Fill/Edit click guards always pass.
        // const uniqueEmpIds = Array.from(new Set(this.appraisals.map(a => a.employeeId).filter(Boolean)));
        // for (const empId of uniqueEmpIds) this.refreshPauseStatus(empId);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error loading appraisals'
        });
        this.loading = false;
      }
    });
  }

  openPauseDialog(row: any) {
    this.pauseEmployeeId = row.employeeId ?? row.employee?.id;
    this.pauseEmployeeLabel = `${row.employee?.firstName ?? ''} ${row.employee?.lastName ?? ''}`.trim()
      || `Employee #${this.pauseEmployeeId}`;
    this.pauseDialogVisible = true;
  }

  onPauseChanged() {
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


  openForm() {
    this.showPopup = true;
    this.loadEmployees();
  }
  loadEmployees() {
    this.employeeService.getActiveEmployees().subscribe(res => {
      this.allEmployees = res.map(e => ({
        label: `${e.firstName} ${e.lastName}`,
        value: e.id,
        deptId: e.departmentId,
        branchId: e.branchId,
        roleId: e.roleId,
      }));
      this.employees = [...this.allEmployees];
    });
  }
  loadDropdownData() {
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
    this.branchService.getBranches().subscribe(data => this.branches = data);
  }
  onSubmit() {
    if (this.appraisalForm.valid) {
      this.appraisalService.bulkCreateAppraisals(this.appraisalForm.value).subscribe({
        next: (res: any) => {
          // alert(`${res.count} appraisal forms created`);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `${res.count} appraisal forms created`
          });
          this.showPopup = false;
        },
        error: () =>
          // alert('Error creating appraisals')
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error creating appraisals'
          })
      });
    }
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


  closePopup() {
    this.showPopup = false;
    this.appraisalForm.reset();
  }
  filterEmployees() {
    const selectedDept = this.appraisalForm.get('departmentId')?.value;
    const selectedBranch = this.appraisalForm.get('branchId')?.value;

    this.employees = this.allEmployees.filter(emp =>
      (!selectedDept || emp.deptId === selectedDept) &&
      (!selectedBranch || emp.branchId === selectedBranch)
    );

    this.applyFilters();
  }
  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchText = input.value;
    this.applyFilters();
  }

  selectStatus(status: string) {
    this.selectedStatus = status;
    this.showFilterDropdown = false;
    this.applyFilters();
  }

  /** Apply the status filter and field search together. */
  applyFilters() {
    let data = [...this.appraisals];

    // Status filter (workflow stage)
    if (this.selectedStatus && this.selectedStatus !== 'All') {
      data = data.filter((emp: any) => this.getStatusLabel(emp) === this.selectedStatus);
    }

    // Field search (defaults to name when no field is chosen)
    const searchText = this.searchText.trim().toLowerCase();
    if (searchText) {
      const filterKey = this.selectedFilter?.value || 'name';
      data = data.filter((emp: any) => {
        const e = emp.employee;
        if (!e) return false;

        if (filterKey === 'name') {
          return `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchText);
        }
        if (filterKey === 'employeeCode') {
          return e.employeeCode?.toLowerCase().includes(searchText);
        }
        if (filterKey === 'departmentId') {
          const deptName = this.getDepartmentName(e.departmentId)?.toLowerCase() || '';
          return deptName.includes(searchText);
        }
        return e[filterKey]?.toString().toLowerCase().includes(searchText);
      });
    }

    this.filteredEmployees = data;
  }


  onFilterChange() {
    this.showFilterDropdown = false;
    this.applyFilters();
  }
  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }
  selectFilter(option: any) {
    this.selectedFilter = option;
    this.showFilterDropdown = false; // hide after selecting
    const searchBox = document.getElementById('searchBox') as HTMLInputElement;
    if (searchBox) searchBox.value = '';
    this.searchText = '';
    this.onFilterChange(); // trigger filter logic
  }

  onManagementEditClick(appraisal: any) {
    if (this.isLockedByPause(appraisal.employeeId)) { this.toastPaused(); return; }
    this.appraisalService.getAppraisalDetail(appraisal.id, 'MANAGEMENT').subscribe({
      next: (detail: any) => {
        const mergedAppraisal = {
          ...appraisal,
          employeeId: appraisal.employee.id,
          employeeCode: appraisal.employee.employeeCode,
          fullName: `${appraisal.employee.firstName} ${appraisal.employee.lastName}`,
          designation: appraisal.employee.designation?.name,
          departmentName: this.getDepartmentName(appraisal.employee.departmentId),
          dateOfJoining: appraisal.employee.dateOfJoining,
          email: appraisal.employee.email,
          managementReview: detail.managementReview || null,
          formType: 'MANAGEMENT',
        };
        delete mergedAppraisal.employee;
        this.editAppraisal.emit(mergedAppraisal);
      }
    });
  }

  onEditClick(appraisal: any) {
    if (this.isLockedByPause(appraisal.employeeId)) { this.toastPaused(); return; }
    const departmentName = this.getDepartmentName(appraisal.employee.departmentId);

    // Merge employee properties and appraisal properties into one flat object
    const mergedAppraisal = {
      ...appraisal,
      employeeId: appraisal.employee.id,
      employeeCode: appraisal.employee.employeeCode,
      fullName: `${appraisal.employee.firstName} ${appraisal.employee.lastName}`,
      designation: appraisal.employee.designation.name,
      departmentName: departmentName,
      dateOfJoining: appraisal.employee.dateOfJoining,
      email: appraisal.employee.email,
      formType: 'MANAGER',
    };

    delete mergedAppraisal.employee; // Remove nested employee object

    this.editAppraisal.emit(mergedAppraisal);
  }

  getDefaultImage(gender?: string | null): string {
    const g = gender?.toUpperCase?.() || 'MALE';
    return g === 'FEMALE'
      ? '/img-women.png'
      : '/img.png';
  }

  // ── View Full Detail (HR) ─────────────────────────────────────────
  viewFullDetail(a: any) {
    const viewerRole = this.isManagement ? 'MANAGEMENT' : 'HR';
    this.appraisalService.getAppraisalDetail(a.id, viewerRole).subscribe({
      next: (data: any) => {
        this.fullDetailAppraisal = data;
        this.fullDetailDialogVisible = true;
        // Load insights
        this.appraisalService.getEmployeeInsights(a.id).subscribe({
          next: (insights: any) => { this.employeeInsights = insights; },
          error: () => { this.employeeInsights = null; }
        });
      }
    });
  }

  fmtDate(d: any): string {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-GB'); } catch { return ''; }
  }

  /** Filter the unified review answers by level (used by the Full Details
   *  dialog to render the In-charge section dynamically). */
  answersForLevel(a: any, level: 'INCHARGE' | 'MANAGER' | 'MANAGEMENT'): any[] {
    return (a?.reviewAnswers || [])
      .filter((r: any) => r?.level === level && r?.question)
      .sort((x: any, y: any) =>
        (x.question?.displayOrder ?? 0) - (y.question?.displayOrder ?? 0)
        || (x.question?.id ?? 0) - (y.question?.id ?? 0));
  }

  /** Tailwind-style colour class for a 0-10 rating bar. */
  ratingBarClass(r: number | null | undefined): string {
    if (r == null) return '';
    if (r >= 8) return 'fd-bar-high';
    if (r >= 5) return 'fd-bar-mid';
    return 'fd-bar-low';
  }

  getStatusLabel(a: any): string {
    if (a.status === 'COMPLETED') return 'Completed';
    if (a.status === 'HR_REVIEW') return 'HR Review';
    if (a.status === 'EDIT_REQUESTED') return 'Edit Requested';
    if (a.status === 'AUTO_DRAFT' || a.status === 'Draft') return 'Draft';
    if (a.status === 'PENDING_FILL') {
      const selfDone = !!a.selfAppraisalSubmittedAt;
      const mgrDone = !!a.managerAppraisalSubmittedAt;
      if (selfDone && mgrDone) return 'Both Submitted';
      if (a.managerId === this.loggedEmployeeId || (!this.isHRManager && a.employee?.reportingManager === this.loggedEmployeeId)) {
        return mgrDone ? 'Submitted' : 'Pending Fill';
      }
      return 'Pending Fill';
    }
    return a.status?.split('_').join(' ') || '-';
  }

  getStatusColor(a: any): string {
    if (a.status === 'COMPLETED') return '#4CAF50';
    if (a.status === 'HR_REVIEW') return '#2196F3';
    if (a.status === 'EDIT_REQUESTED') return '#FF9800';
    if (a.status === 'AUTO_DRAFT' || a.status === 'Draft') return '#888';
    if (a.status === 'PENDING_FILL') {
      const selfDone = !!a.selfAppraisalSubmittedAt;
      const mgrDone = !!a.managerAppraisalSubmittedAt;
      if (selfDone && mgrDone) return '#4CAF50';
      if ((a.managerId === this.loggedEmployeeId || (!this.isHRManager && a.employee?.reportingManager === this.loggedEmployeeId)) && mgrDone) return '#4CAF50';
      return '#FF9800';
    }
    return '#ccc';
  }

  // Manager edit request
  managerEditRequestDialogVisible = false;
  managerEditRequestAppraisalId: number | null = null;
  managerEditRequestReason = '';

  /** Free unlimited edits are allowed only while the due date is set and in the future. */
  hasFreeEditWindow(a: any): boolean {
    return !!a.dueDate && new Date(a.dueDate) > new Date();
  }

  /** Manager can fill (first time) or directly edit (submitted, within the
   *  free-edit window). Outside the window a submitted review goes through the
   *  edit-request flow instead — see canManagerRequestEdit. */
  canManagerFill(a: any): boolean {
    const isFiller =
      (this.loggedRoleId === 3 || a.managerId === this.loggedEmployeeId) &&
      a.employeeId !== this.loggedEmployeeId &&
      !['AUTO_DRAFT', 'Draft'].includes(a.status);
    if (!isFiller) return false;
    if (!a.managerAppraisalSubmittedAt) return true; // first fill
    if (['COMPLETED', 'HR_APPROVED', 'HR_REVIEW'].includes(a.status)) return false;
    return this.hasFreeEditWindow(a); // free re-edit window
  }

  canManagerRequestEdit(a: any): boolean {
    const isAssignedManager =
      (this.loggedRoleId === 3 && a.employee?.reportingManager === this.loggedEmployeeId)
      || a.managerId === this.loggedEmployeeId;
    return isAssignedManager &&
      a.employeeId !== this.loggedEmployeeId &&
      !!a.managerAppraisalSubmittedAt &&
      !['COMPLETED', 'HR_APPROVED'].includes(a.status) &&
      !this.hasFreeEditWindow(a); // free window → edit directly, no request
  }

  openManagerEditRequest(a: any) {
    if (this.isLockedByPause(a.employeeId)) { this.toastPaused(); return; }
    this.managerEditRequestAppraisalId = a.id;
    this.managerEditRequestReason = '';
    this.managerEditRequestDialogVisible = true;
  }

  submitManagerEditRequest() {
    if (!this.managerEditRequestReason.trim()) return;
    this.managerEditLoading = true;
    this.appraisalService.requestEdit(this.managerEditRequestAppraisalId!, {
      requestedBy: this.loggedEmployeeId,
      reason: this.managerEditRequestReason,
      requestType: 'MANAGER',
    }).subscribe({
      next: () => {
        this.managerEditLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Submitted', detail: 'Edit request sent to HR' });
        this.managerEditRequestDialogVisible = false;
        this.getAppraisals();
      },
      error: (e: any) => { this.managerEditLoading = false; this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' }); }
    });
  }

  // ── Read-only "View Review" launchers ──────────────────────────────
  /** In-charge can view their own submitted review at any time. */
  canInchargeView(a: any): boolean {
    const inchargeId = a?.inchargeId ?? a?.employee?.inchargeId;
    return !!inchargeId
      && Number(inchargeId) === this.loggedEmployeeId
      && !!a.inchargeAppraisalSubmittedAt;
  }

  /** Manager can view their own submitted review at any time. */
  canManagerView(a: any): boolean {
    const isAssignedManager =
      (this.loggedRoleId === 3 && a.employee?.reportingManager === this.loggedEmployeeId)
      || a.managerId === this.loggedEmployeeId;
    return isAssignedManager
      && a.employeeId !== this.loggedEmployeeId
      && !!a.managerAppraisalSubmittedAt;
  }

  /** Management can view their own submitted review at any time. */
  canManagementView(a: any): boolean {
    return this.isManagement && !!a.managementAppraisalSubmittedAt;
  }

  /** Generic emit helper: same merge as the Fill click but with readOnly:true. */
  private emitReviewView(a: any, formType: 'INCHARGE' | 'MANAGER' | 'MANAGEMENT') {
    const merged = {
      ...a,
      employeeId: a.employee?.id,
      employeeCode: a.employee?.employeeCode,
      fullName: `${a.employee?.firstName ?? ''} ${a.employee?.lastName ?? ''}`.trim(),
      designation: a.employee?.designation?.name,
      departmentName: this.getDepartmentName(a.employee?.departmentId),
      dateOfJoining: a.employee?.dateOfJoining,
      email: a.employee?.email,
      formType,
      readOnly: true,
    };
    this.editAppraisal.emit(merged);
  }
  onInchargeViewClick(a: any)   { this.emitReviewView(a, 'INCHARGE'); }
  onManagerViewClick(a: any)    { this.emitReviewView(a, 'MANAGER'); }
  onManagementViewClick(a: any) { this.emitReviewView(a, 'MANAGEMENT'); }

  // ── In-charge edit request ──────────────────────────────────────────
  inchargeEditRequestDialogVisible = false;
  inchargeEditRequestAppraisalId: number | null = null;
  inchargeEditRequestReason = '';
  inchargeEditLoading = false;

  canInchargeRequestEdit(a: any): boolean {
    const inchargeId = a?.inchargeId ?? a?.employee?.inchargeId;
    return !!inchargeId
      && Number(inchargeId) === this.loggedEmployeeId
      && !!a.inchargeAppraisalSubmittedAt
      && !['COMPLETED', 'HR_APPROVED'].includes(a.status)
      && !this.hasFreeEditWindow(a); // free window → edit directly, no request
  }

  openInchargeEditRequest(a: any) {
    if (this.isLockedByPause(a.employeeId)) { this.toastPaused(); return; }
    this.inchargeEditRequestAppraisalId = a.id;
    this.inchargeEditRequestReason = '';
    this.inchargeEditRequestDialogVisible = true;
  }

  submitInchargeEditRequest() {
    if (!this.inchargeEditRequestReason.trim()) return;
    this.inchargeEditLoading = true;
    this.appraisalService.requestEdit(this.inchargeEditRequestAppraisalId!, {
      requestedBy: this.loggedEmployeeId,
      reason: this.inchargeEditRequestReason,
      requestType: 'INCHARGE',
    } as any).subscribe({
      next: () => {
        this.inchargeEditLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Submitted', detail: 'Edit request sent to HR' });
        this.inchargeEditRequestDialogVisible = false;
        this.getAppraisals();
      },
      error: (e: any) => {
        this.inchargeEditLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' });
      },
    });
  }

  // ── Management Actions ──────────────────────────────────────────────
  canManagementFill(a: any): boolean {
    if (!this.isManagement) return false;
    if (!['PENDING_FILL', 'SELF_APPRAISAL_PENDING', 'MANAGER_APPRAISAL_PENDING', 'MANAGER_APPRAISAL_SUBMITTED'].includes(a.status)) return false;
    if (!a.managementAppraisalSubmittedAt) return true; // first fill
    return this.hasFreeEditWindow(a); // free re-edit window
  }

  // ── In-charge Actions ───────────────────────────────────────────────
  /** Logged-in user is the appraisal's in-charge (snapshot if present,
   *  else the employee's current in-charge) and hasn't submitted yet. */
  canInchargeFill(a: any): boolean {
    const inchargeId = a?.inchargeId ?? a?.employee?.inchargeId;
    if (!inchargeId) return false;
    if (Number(inchargeId) !== this.loggedEmployeeId) return false;
    if (!['PENDING_FILL', 'SELF_APPRAISAL_SUBMITTED'].includes(a.status)) return false;
    if (!a.inchargeAppraisalSubmittedAt) return true; // first fill
    return this.hasFreeEditWindow(a); // free re-edit window
  }

  onInchargeEditClick(a: any) {
    if (this.isLockedByPause(a.employeeId)) { this.toastPaused(); return; }
    const merged = {
      ...a,
      employeeId: a.employee?.id,
      employeeCode: a.employee?.employeeCode,
      fullName: `${a.employee?.firstName ?? ''} ${a.employee?.lastName ?? ''}`.trim(),
      designation: a.employee?.designation?.name,
      departmentName: this.getDepartmentName(a.employee?.departmentId),
      dateOfJoining: a.employee?.dateOfJoining,
      email: a.employee?.email,
      formType: 'INCHARGE',
    };
    this.editAppraisal.emit(merged);
  }

  canManagementRequestEdit(a: any): boolean {
    return this.isManagement &&
      !!a.managementAppraisalSubmittedAt &&
      !['COMPLETED', 'HR_APPROVED'].includes(a.status) &&
      !this.hasFreeEditWindow(a); // free window → edit directly, no request
  }

  managementEditRequestDialogVisible = false;
  managementEditRequestAppraisalId: number | null = null;
  managementEditRequestReason = '';
  managementEditLoading = false;

  openManagementEditRequest(a: any) {
    if (this.isLockedByPause(a.employeeId)) { this.toastPaused(); return; }
    this.managementEditRequestAppraisalId = a.id;
    this.managementEditRequestReason = '';
    this.managementEditRequestDialogVisible = true;
  }

  submitManagementEditRequest() {
    if (!this.managementEditRequestReason.trim()) return;
    this.managementEditLoading = true;
    this.appraisalService.requestEdit(this.managementEditRequestAppraisalId!, {
      requestedBy: this.loggedEmployeeId,
      reason: this.managementEditRequestReason,
      requestType: 'MANAGEMENT',
    }).subscribe({
      next: () => {
        this.managementEditLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Submitted', detail: 'Edit request sent to HR' });
        this.managementEditRequestDialogVisible = false;
        this.getAppraisals();
      },
      error: (e: any) => {
        this.managementEditLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' });
      }
    });
  }

  // ── HR Actions ──────────────────────────────────────────────────────
  get canSeeScores(): boolean {
    return this.isHRManager || this.isManagement || this.isHRExecutive || this.loggedRoleId === 3;
  }

  canHRVerify(a: any): boolean {
    return (this.isHRManager || this.isHRExecutive) && ['AUTO_DRAFT', 'Draft'].includes(a.status);
  }

  canHRReview(a: any): boolean {
    return (this.isHRManager || this.isHRExecutive) && ['HR_REVIEW', 'MANAGER_APPRAISAL_SUBMITTED'].includes(a.status);
  }

  canHRRespondEdit(a: any): boolean {
    return (this.isHRManager || this.isHRExecutive) && a.editRequests?.length > 0;
  }

  // ── HR override: reassign appraisal manager ─────────────────────
  reassignDialogVisible = false;
  reassignTarget: any = null;
  reassignNewManagerId: number | null = null;
  reassignReason = '';
  reassignLoading = false;
  reassignManagerOptions: { label: string; value: number }[] = [];

  /** HR only (HR Manager or HR Executive) — Management can no longer reassign.
   *  Manager hasn't submitted yet. */
  canReassignManager(a: any): boolean {
    return (this.isHRManager || this.isHRExecutive)
      && !a.managerAppraisalSubmittedAt;
  }

  /** Look up a manager's display name from the loaded employees list. */
  getManagerName(id: number | null | undefined): string {
    if (!id) return '';
    return this.allEmployees.find((e: any) => e.value === id)?.label ?? '';
  }

  openReassignDialog(a: any) {
    this.reassignTarget = a;
    this.reassignNewManagerId = null;
    this.reassignReason = '';
    this.reassignManagerOptions = [];
    this.reassignDialogVisible = true;

    // loadEmployees() is async, so building options synchronously after it would
    // run against an empty array on the first open. Fetch (or reuse) and then
    // build the filtered options when the list is ready.
    if (this.allEmployees.length) {
      this.buildReassignOptions(a);
    } else {
      this.employeeService.getActiveEmployees().subscribe(res => {
        this.allEmployees = res.map(e => ({
          label: `${e.firstName} ${e.lastName}`,
          value: e.id,
          deptId: e.departmentId,
          branchId: e.branchId,
          roleId: e.roleId,
        }));
        this.employees = [...this.allEmployees];
        this.buildReassignOptions(a);
      });
    }
  }

  /** Reporting Managers (roleId 3) and Management (roleId 4) only — exclude
   *  the current manager and the employee themselves. Active filter is already
   *  applied upstream by getActiveEmployees(). */
  private buildReassignOptions(a: any) {
    this.reassignManagerOptions = this.allEmployees.filter((e: any) =>
      (e.roleId === 3 || e.roleId === 4)
      && e.value !== a.managerId
      && e.value !== a.employeeId,
    );
  }

  submitReassign() {
    if (!this.reassignTarget || !this.reassignNewManagerId) return;
    this.reassignLoading = true;
    this.appraisalService.reassignManager(this.reassignTarget.id, {
      newManagerId: this.reassignNewManagerId,
      reason: this.reassignReason.trim() || undefined,
    }).subscribe({
      next: () => {
        this.reassignLoading = false;
        this.reassignDialogVisible = false;
        this.messageService.add({ severity: 'success', summary: 'Reassigned', detail: 'Appraisal manager updated.' });
        this.loadAppraisals();
      },
      error: (e: any) => {
        this.reassignLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed to reassign' });
      },
    });
  }

  openVerifyDialog(a: any) {
    this.verifyAppraisal = a;
    this.verifyStartDate = a.appraisalStartDate ? new Date(a.appraisalStartDate) : null;
    this.verifyEndDate = a.appraisalEndDate ? new Date(a.appraisalEndDate) : null;
    this.verifyDueDate = a.dueDate ? new Date(a.dueDate) : null;
    this.verifyDialogVisible = true;
  }

  confirmVerify() {
    this.verifyLoading = true;
    this.appraisalService.hrVerifyAppraisal(this.verifyAppraisal.id, {
      appraisalStartDate: this.verifyStartDate?.toISOString(),
      appraisalEndDate: this.verifyEndDate?.toISOString(),
      dueDate: this.verifyDueDate?.toISOString(),
      hrVerifiedBy: this.loggedEmployeeId,
    }).subscribe({
      next: () => {
        this.verifyLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Verified', detail: 'Appraisal sent to employee & manager' });
        this.verifyDialogVisible = false;
        this.loadAppraisals();
      },
      error: (e: any) => { this.verifyLoading = false; this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' }); }
    });
  }

  openHRReviewDialog(a: any) {
    this.hrReviewAppraisal = a;
    this.hrReviewComments = '';
    this.hrRecommendations = '';
    this.hrReviewDialogVisible = true;
  }

  submitHRReview(action: string) {
    this.hrReviewLoading = true;
    this.appraisalService.hrReviewAppraisal(this.hrReviewAppraisal.id, {
      hrReviewComments: this.hrReviewComments,
      hrRecommendations: this.hrRecommendations,
      hrApprovedBy: this.loggedEmployeeId,
      action,
    }).subscribe({
      next: () => {
        this.hrReviewLoading = false;
        this.messageService.add({
          severity: action === 'APPROVE' ? 'success' : 'info',
          summary: action === 'APPROVE' ? 'Approved' : 'Saved',
          detail: action === 'APPROVE' ? 'Appraisal approved & completed' : 'HR review saved'
        });
        this.hrReviewDialogVisible = false;
        this.loadAppraisals();
      },
      error: (e: any) => { this.hrReviewLoading = false; this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' }); }
    });
  }

  openEditResponseDialog(a: any) {
    this.appraisalService.getAppraisalDetail(a.id, 'HR').subscribe({
      next: (detail: any) => {
        const pending = (detail.editRequests || []).find((r: any) => r.status === 'PENDING');
        if (!pending) {
          this.messageService.add({ severity: 'warn', summary: 'No Request', detail: 'No pending edit request found' });
          return;
        }
        this.editResponseItem = pending;
        this.editResponseAction = 'APPROVE';
        this.editRejectionReason = '';
        this.editResponseDialogVisible = true;
      }
    });
  }

  confirmEditResponse() {
    this.editResponseLoading = true;
    this.appraisalService.respondEditRequest(this.editResponseItem.id, {
      action: this.editResponseAction,
      approvedBy: this.loggedEmployeeId,
      rejectionReason: this.editResponseAction === 'REJECT' ? this.editRejectionReason : undefined,
    }).subscribe({
      next: () => {
        this.editResponseLoading = false;
        this.messageService.add({
          severity: this.editResponseAction === 'APPROVE' ? 'success' : 'warn',
          summary: this.editResponseAction === 'APPROVE' ? 'Approved' : 'Rejected',
        });
        this.editResponseDialogVisible = false;
        this.loadAppraisals();
      },
      error: (e: any) => { this.editResponseLoading = false; this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' }); }
    });
  }

  private loadAppraisals() {
    this.appraisalService.getAllAppraisals().subscribe({
      next: (data) => {
        // Reuse existing filter logic
        this.appraisals = data;
        this.filteredEmployees = [...data];
      }
    });
  }
}
