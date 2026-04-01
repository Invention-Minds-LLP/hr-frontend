import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { WeeklyTrackerService } from '../../services/weekly-tracker/weekly-tracker';
import { WeeklyTrackerForm } from '../weekly-tracker-form/weekly-tracker-form';

@Component({
  selector: 'app-weekly-tracker-overview',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    TooltipModule, SkeletonModule, InputTextModule, SelectModule,
    DialogModule, TextareaModule, ModuleGuide, WeeklyTrackerForm
  ],
  templateUrl: './weekly-tracker-overview.html',
  styleUrl: './weekly-tracker-overview.css',
  providers: [MessageService]
})
export class WeeklyTrackerOverview implements OnInit {
  active: string = 'list';
  reports: any[] = [];
  filteredReports: any[] = [];
  loading = true;
  totalRecords = 0;
  searchText = '';

  // Role info
  loggedEmpId = Number(localStorage.getItem('empId')) || 0;
  loggedRoleId = Number(localStorage.getItem('roleId')) || 0;
  deptId = Number(localStorage.getItem('deptId')) || 0;
  isHRManager = false;
  isReportingManager = false;
  isManagement = false;
  isIncharge = false;

  // Approval dialog
  approvalDialogVisible = false;
  declineDialogVisible = false;
  selectedReport: any = null;
  currentApprovalLevel: 'LEVEL1' | 'LEVEL2' = 'LEVEL1';
  approvalRating: number | null = null;
  approvalNote = '';
  declineReason = '';

  // View detail
  detailDialogVisible = false;
  detailReport: any = null;
  detailTasks: any[] = [];

  // Edit
  editReport: any = null;

  // Status filter
  statusFilter: any = null;
  statusOptions = [
    { label: 'All', value: null },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Submitted', value: 'SUBMITTED' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  ratingOptions = [
    { label: '1 - Poor', value: 1 },
    { label: '2 - Below Average', value: 2 },
    { label: '3 - Average', value: 3 },
    { label: '4 - Good', value: 4 },
    { label: '5 - Excellent', value: 5 },
  ];

  constructor(
    private trackerService: WeeklyTrackerService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.isHRManager = this.loggedRoleId === 1;
    this.isReportingManager = this.loggedRoleId === 3;
    this.isManagement = this.loggedRoleId === 4;
    this.isIncharge = this.loggedRoleId === 5;
    this.loadReports();
  }

  show(value: string) {
    this.active = value;
    if (value === 'list') this.loadReports();
  }

  loadReports() {
    this.loading = true;
    const params: any = {};
    if (this.statusFilter) params.status = this.statusFilter;

    this.trackerService.getReports(params).subscribe({
      next: (res) => {
        this.reports = res.data || res;
        this.totalRecords = res.total || this.reports.length;
        this.filteredReports = [...this.reports];
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load reports' });
        this.loading = false;
      }
    });
  }

  onFilter() {
    if (!this.searchText.trim()) {
      this.filteredReports = [...this.reports];
      return;
    }
    const s = this.searchText.toLowerCase();
    this.filteredReports = this.reports.filter(r =>
      r.employee?.employeeCode?.toLowerCase().includes(s) ||
      r.employee?.firstName?.toLowerCase().includes(s) ||
      r.employee?.lastName?.toLowerCase().includes(s) ||
      r.weekLabel?.toLowerCase().includes(s)
    );
  }

  onStatusFilter() {
    this.loadReports();
  }

  fmtDate(d: string | null): string {
    if (!d) return '';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'DRAFT': return 'status-draft';
      case 'SUBMITTED': return 'status-submitted';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      default: return '';
    }
  }

  // ── View Detail ────────────────────────────────────────────────────────────
  viewReport(report: any) {
    this.trackerService.getReportById(report.id).subscribe({
      next: (data) => {
        this.detailReport = data;
        this.detailTasks = data.dailyTasks || [];
        this.detailDialogVisible = true;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load report details' });
      }
    });
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  openForm(report?: any) {
    this.editReport = report || null;
    this.active = 'form';
  }

  onFormClose() {
    this.editReport = null;
    this.active = 'list';
    this.loadReports();
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  submitReport(report: any) {
    this.trackerService.submitReport(report.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Submitted', detail: 'Report submitted for approval' });
        this.loadReports();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Submit failed' });
      }
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  deleteReport(report: any) {
    if (!confirm('Are you sure you want to delete this draft report?')) return;
    this.trackerService.deleteReport(report.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Report deleted' });
        this.loadReports();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Delete failed' });
      }
    });
  }

  // ── Approval Flow ──────────────────────────────────────────────────────────
  canApproveLevel1(report: any): boolean {
    if (report.status !== 'SUBMITTED') return false;
    const empRoleId = report.employee?.roleId;
    const empDeptId = report.employee?.departmentId;
    const hasIncharge = !!report.employee?.inchargeId;

    // Incharge approval
    if (hasIncharge && report.inChargeDecision === 'PENDING' && this.isIncharge) return true;

    // Skip incharge level if already approved or no incharge
    if (hasIncharge && report.inChargeDecision !== 'APPROVED') return false;

    // HR employee -> HR Manager
    if (empDeptId === 1 && empRoleId !== 1 && this.isHRManager) return true;
    // HR Manager -> Management
    if (empRoleId === 1 && this.isManagement) return true;
    // HOD/Senior HOD -> Management
    if ((empRoleId === 3 || empRoleId === 5) && this.isManagement && report.hodDecision === 'PENDING') return true;
    // Normal employee -> Reporting Manager
    if (empRoleId === 2 && this.isReportingManager && report.hodDecision === 'PENDING') return true;

    return false;
  }

  canApproveLevel2(report: any): boolean {
    if (report.status !== 'SUBMITTED') return false;
    if (report.hodDecision !== 'APPROVED') return false;
    if (!this.isHRManager) return false;

    const empRoleId = report.employee?.roleId;
    const empDeptId = report.employee?.departmentId;

    // HR dept employees & HR Manager don't need level 2 (handled at level 1)
    if (empDeptId === 1) return false;
    if (empRoleId === 1) return false;

    return report.hrDecision === 'PENDING';
  }

  openApprovalDialog(report: any, level: 'LEVEL1' | 'LEVEL2') {
    this.selectedReport = report;
    this.currentApprovalLevel = level;
    this.approvalRating = null;
    this.approvalNote = '';
    this.approvalDialogVisible = true;
  }

  getBackendRole(report: any, level: 'LEVEL1' | 'LEVEL2'): string {
    if (level === 'LEVEL2') return 'HR_MANAGER';

    const empRoleId = report.employee?.roleId;
    const empDeptId = report.employee?.departmentId;
    const hasIncharge = !!report.employee?.inchargeId;

    if (hasIncharge && report.inChargeDecision === 'PENDING') return 'INCHARGE';
    if (empDeptId === 1 && empRoleId !== 1) return 'HR_MANAGER';
    if (empRoleId === 1) return 'MANAGEMENT';
    if (empRoleId === 3 || empRoleId === 5) return 'MANAGEMENT';
    if (this.isReportingManager) return 'REPORTING_MANAGER';
    if (this.isHRManager) return 'HR_MANAGER';
    return 'REPORTING_MANAGER';
  }

  confirmApproval() {
    if (!this.selectedReport) return;
    const role = this.getBackendRole(this.selectedReport, this.currentApprovalLevel);
    this.trackerService.updateReportStatus(
      this.selectedReport.id, 'Approved', this.loggedEmpId,
      role as any, undefined, this.approvalRating ?? undefined, this.approvalNote || undefined
    ).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Approved', detail: 'Report approved successfully' });
        this.approvalDialogVisible = false;
        this.loadReports();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Approval failed' });
      }
    });
  }

  openDeclineDialog(report: any, level: 'LEVEL1' | 'LEVEL2') {
    this.selectedReport = report;
    this.currentApprovalLevel = level;
    this.declineReason = '';
    this.declineDialogVisible = true;
  }

  confirmDecline() {
    if (!this.selectedReport || !this.declineReason.trim()) return;
    const role = this.getBackendRole(this.selectedReport, this.currentApprovalLevel);
    this.trackerService.updateReportStatus(
      this.selectedReport.id, 'Declined', this.loggedEmpId,
      role as any, this.declineReason
    ).subscribe({
      next: () => {
        this.messageService.add({ severity: 'warn', summary: 'Declined', detail: 'Report has been declined' });
        this.declineDialogVisible = false;
        this.loadReports();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Decline failed' });
      }
    });
  }

  getPriorityClass(p: string): string {
    switch (p) {
      case 'CRITICAL': return 'priority-critical';
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return '';
    }
  }

  getTaskStatusClass(s: string): string {
    switch (s) {
      case 'COMPLETED': return 'task-completed';
      case 'IN_PROGRESS': return 'task-progress';
      case 'BLOCKED': return 'task-blocked';
      case 'CARRIED_FORWARD': return 'task-carried';
      default: return 'task-not-started';
    }
  }
}
