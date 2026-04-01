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
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadReports();
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
    this.trackerService.createReport({
      employeeId: this.loggedEmpId,
      weekStartDate: this.weekStartDate.toISOString(),
      weekEndDate: this.weekEndDate.toISOString(),
      employeeSummary: this.employeeSummary || null,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Weekly report created' });
        this.createDialogVisible = false;
        this.loadReports();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Create failed' });
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

    if (this.editingTaskId) {
      this.trackerService.updateTask(this.editingTaskId, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Task updated' });
          this.taskDialogVisible = false;
          this.openTasksForReport(this.selectedReport);
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Update failed' });
        }
      });
    } else {
      this.trackerService.addTask(this.selectedReport.id, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Added', detail: 'Task added' });
          this.taskDialogVisible = false;
          this.openTasksForReport(this.selectedReport);
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Add failed' });
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
