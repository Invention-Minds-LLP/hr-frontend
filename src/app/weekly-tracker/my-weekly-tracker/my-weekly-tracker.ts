import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { WeeklyTrackerService } from '../../services/weekly-tracker/weekly-tracker';
import { Employees } from '../../services/employees/employees';

@Component({
  selector: 'app-my-weekly-tracker',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    TooltipModule, DialogModule, SelectModule, TextareaModule, InputTextModule, DatePickerModule
  ],
  templateUrl: './my-weekly-tracker.html',
  styleUrl: './my-weekly-tracker.css',
  providers: [MessageService]
})
export class MyWeeklyTracker implements OnInit {
  loggedEmpId = Number(localStorage.getItem('empId')) || 0;

  reports: any[] = [];
  loading = true;
  creating = false;
  savingTask = false;

  // Carry-forward
  carryDialogVisible = false;
  carrying = false;
  carrySourceId: number | null = null;
  carryCandidates: any[] = [];

  // Carry-forward history
  historyDialogVisible = false;
  historyLoading = false;
  historyEntries: any[] = [];

  // Employee picker (Assigned By)
  allEmployees: any[] = [];

  // Create report
  createDialogVisible = false;
  weekStartDate: Date | null = null;
  weekEndDate: Date | null = null;
  employeeSummary = '';

  // Task form
  selectedReport: any = null;
  taskDialogVisible = false;
  editingTaskId: number | null = null;
  tasks: any[] = [];
  taskForm: any = this.emptyTaskForm();

  // View detail
  detailDialogVisible = false;
  detailReport: any = null;
  detailTasks: any[] = [];

  priorityOptions = [
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' },
  ];

  taskStatusOptions = [
    { label: 'Not Started', value: 'NOT_STARTED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Blocked', value: 'BLOCKED' },
  ];

  constructor(
    private trackerService: WeeklyTrackerService,
    private employeeService: Employees,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadReports();
    this.loadEmployees();
  }

  // All active employees (no pagination cap) so the picker can find anyone.
  loadEmployees() {
    this.employeeService.getActiveEmployees().subscribe({
      next: (rows: any) => {
        const list = Array.isArray(rows) ? rows : (rows?.data ?? rows ?? []);
        this.allEmployees = list.map((e: any) => ({
          ...e,
          displayName: `${e.employeeCode} - ${e.firstName} ${e.lastName}`
        }));
      },
      error: () => { this.allEmployees = []; },
    });
  }

  loadReports() {
    this.loading = true;
    this.trackerService.getReports({ employeeId: this.loggedEmpId }).subscribe({
      next: (res) => {
        this.reports = res.data || res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  fmtDate(d: any): string {
    if (!d) return '';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  emptyTaskForm() {
    return {
      taskDate: new Date(),
      taskDescription: '',
      category: '',
      priority: 'MEDIUM',
      taskStatus: 'NOT_STARTED',
      percentComplete: 0,
      assignedById: null,
      deadline: null,
      completionDate: null,
      remarks: '',
    };
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

  // Editable by the owner until an approver acts: DRAFT, REJECTED, or SUBMITTED-and-untouched.
  isEditable(report: any): boolean {
    if (!report) return false;
    if (report.status === 'DRAFT' || report.status === 'REJECTED') return true;
    if (report.status === 'SUBMITTED') {
      return report.inChargeDecision === 'PENDING'
        && report.hodDecision === 'PENDING'
        && report.hrDecision === 'PENDING';
    }
    return false;
  }

  // First submission vs. re-submission (after edit/reject) — drives the button label.
  submitLabel(report: any): string {
    return report?.status === 'DRAFT' ? 'Submit' : 'Resubmit';
  }

  // ── Create Report ──────────────────────────────────────────────────────
  openCreateDialog() {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    this.weekStartDate = monday;
    this.weekEndDate = sunday;
    this.employeeSummary = '';
    this.createDialogVisible = true;
  }

  createReport() {
    if (!this.weekStartDate || !this.weekEndDate) return;
    this.creating = true;
    this.trackerService.createReport({
      employeeId: this.loggedEmpId,
      weekStartDate: this.weekStartDate.toISOString(),
      weekEndDate: this.weekEndDate.toISOString(),
      employeeSummary: this.employeeSummary || null,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Weekly report created' });
        this.createDialogVisible = false;
        this.creating = false;
        this.loadReports();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Create failed' });
        this.creating = false;
      }
    });
  }

  // ── View Detail ────────────────────────────────────────────────────────
  viewReport(report: any) {
    this.trackerService.getReportById(report.id).subscribe({
      next: (data) => {
        this.detailReport = data;
        this.detailTasks = data.dailyTasks || [];
        this.detailDialogVisible = true;
      }
    });
  }

  // ── Task Management ────────────────────────────────────────────────────
  openTasksForReport(report: any) {
    this.selectedReport = report;
    this.trackerService.getReportById(report.id).subscribe({
      next: (data) => {
        this.tasks = data.dailyTasks || [];
        this.selectedReport = data;
      }
    });
  }

  closeTaskView() {
    this.selectedReport = null;
    this.tasks = [];
    this.loadReports();
  }

  openTaskDialog(task?: any) {
    if (task) {
      this.editingTaskId = task.id;
      this.taskForm = {
        taskDate: task.taskDate ? new Date(task.taskDate) : new Date(),
        taskDescription: task.taskDescription || '',
        category: task.category || '',
        priority: task.priority || 'MEDIUM',
        taskStatus: task.taskStatus || 'NOT_STARTED',
        percentComplete: task.percentComplete || 0,
        assignedById: task.assignedById || null,
        deadline: task.deadline ? new Date(task.deadline) : null,
        completionDate: task.completionDate ? new Date(task.completionDate) : null,
        remarks: task.remarks || '',
      };
    } else {
      this.editingTaskId = null;
      this.taskForm = this.emptyTaskForm();
      if (this.selectedReport?.weekStartDate) {
        this.taskForm.taskDate = new Date(this.selectedReport.weekStartDate);
      }
    }
    this.taskDialogVisible = true;
  }

  saveTask() {
    if (!this.taskForm.taskDescription?.trim() || !this.taskForm.taskDate) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Task date and description are required' });
      return;
    }

    const payload = {
      ...this.taskForm,
      taskDate: this.taskForm.taskDate?.toISOString(),
      deadline: this.taskForm.deadline?.toISOString() || null,
      completionDate: this.taskForm.completionDate?.toISOString() || null,
    };

    this.savingTask = true;
    if (this.editingTaskId) {
      this.trackerService.updateTask(this.editingTaskId, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Task updated' });
          this.taskDialogVisible = false;
          this.savingTask = false;
          this.openTasksForReport(this.selectedReport);
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Update failed' });
          this.savingTask = false;
        }
      });
    } else {
      this.trackerService.addTask(this.selectedReport.id, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Added', detail: 'Task added' });
          this.taskDialogVisible = false;
          this.savingTask = false;
          this.openTasksForReport(this.selectedReport);
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Add failed' });
          this.savingTask = false;
        }
      });
    }
  }

  deleteTask(task: any) {
    if (!confirm('Delete this task?')) return;
    this.trackerService.deleteTask(task.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Task removed' });
        this.openTasksForReport(this.selectedReport);
      }
    });
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  submitReport(report: any) {
    this.trackerService.submitReport(report.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Submitted', detail: 'Report submitted for approval' });
        if (this.selectedReport?.id === report.id) this.closeTaskView();
        else this.loadReports();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Submit failed' });
      }
    });
  }

  // ── Delete Report ──────────────────────────────────────────────────────
  deleteReport(report: any) {
    if (!confirm('Delete this draft report?')) return;
    this.trackerService.deleteReport(report.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Report deleted' });
        this.loadReports();
      }
    });
  }

  // ── Carry Forward ──────────────────────────────────────────────────────
  openCarryDialog(report: any) {
    this.trackerService.getReportById(report.id).subscribe({
      next: (data) => {
        const candidates = (data.dailyTasks || []).filter(
          (t: any) => t.taskStatus !== 'COMPLETED' && t.taskStatus !== 'CARRIED_FORWARD'
        );
        if (candidates.length === 0) {
          this.messageService.add({ severity: 'info', summary: 'Nothing to carry', detail: 'No incomplete tasks in this report.' });
          return;
        }
        this.carrySourceId = report.id;
        this.carryCandidates = candidates.map((t: any) => ({ ...t, _sel: true }));
        this.carryDialogVisible = true;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load tasks' });
      }
    });
  }

  confirmCarryForward() {
    const ids = this.carryCandidates.filter(t => t._sel).map(t => t.id);
    if (!ids.length) {
      this.messageService.add({ severity: 'warn', summary: 'Select tasks', detail: 'Pick at least one task to carry forward.' });
      return;
    }
    this.carrying = true;
    this.trackerService.carryForwardTasks(this.carrySourceId!, { taskEntryIds: ids, userId: this.loggedEmpId }).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: 'Carried forward', detail: res?.message || 'Tasks carried to next week' });
        this.carrying = false;
        this.carryDialogVisible = false;
        if (this.selectedReport) this.openTasksForReport(this.selectedReport);
        this.loadReports();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Carry forward failed' });
        this.carrying = false;
      }
    });
  }

  actLabel(a: string): string {
    return ({
      CREATED: 'Created', SUBMITTED: 'Submitted', RESUBMITTED: 'Resubmitted', EDITED: 'Edited',
      TASK_ADDED: 'Task added', TASK_UPDATED: 'Task updated', TASK_DELETED: 'Task deleted',
      APPROVED: 'Approved', DECLINED: 'Declined', CARRIED_FORWARD: 'Carried forward'
    } as any)[a] || a;
  }

  actClass(a: string): string {
    if (a === 'APPROVED') return 'act-approved';
    if (a === 'DECLINED') return 'act-declined';
    if (a === 'CARRIED_FORWARD') return 'act-carried';
    return 'act-neutral';
  }

  // ── Carry-forward history ──────────────────────────────────────────────
  openHistory(task: any) {
    this.historyDialogVisible = true;
    this.historyLoading = true;
    this.historyEntries = [];
    this.trackerService.getTaskHistory(task.id).subscribe({
      next: (res) => {
        this.historyEntries = res?.history || [];
        this.historyLoading = false;
      },
      error: () => {
        this.historyLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load history' });
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
