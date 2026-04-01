import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { WeeklyTrackerService } from '../../services/weekly-tracker/weekly-tracker';

@Component({
  selector: 'app-weekly-tracker-form',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    InputTextModule, TextareaModule, SelectModule, DatePickerModule, DialogModule
  ],
  templateUrl: './weekly-tracker-form.html',
  styleUrl: './weekly-tracker-form.css',
  providers: [MessageService]
})
export class WeeklyTrackerForm implements OnInit {
  @Input() report: any = null;
  @Output() close = new EventEmitter<void>();

  loggedEmpId = Number(localStorage.getItem('empId')) || 0;

  // Report fields
  reportId: number | null = null;
  weekStartDate: Date | null = null;
  weekEndDate: Date | null = null;
  weekLabel = '';
  employeeSummary = '';
  reportStatus = 'DRAFT';

  // Tasks
  tasks: any[] = [];

  // Task form dialog
  taskDialogVisible = false;
  editingTaskIndex: number | null = null;
  taskForm: any = {
    taskDate: null,
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

  saving = false;

  constructor(
    private trackerService: WeeklyTrackerService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    if (this.report) {
      this.reportId = this.report.id;
      this.reportStatus = this.report.status;
      this.employeeSummary = this.report.employeeSummary || '';
      this.weekStartDate = new Date(this.report.weekStartDate);
      this.weekEndDate = new Date(this.report.weekEndDate);
      this.weekLabel = this.report.weekLabel || '';
      this.loadTasks();
    } else {
      this.setCurrentWeek();
    }
  }

  setCurrentWeek() {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    this.weekStartDate = monday;
    this.weekEndDate = sunday;
  }

  loadTasks() {
    if (!this.reportId) return;
    this.trackerService.getReportById(this.reportId).subscribe({
      next: (data) => {
        this.tasks = data.dailyTasks || [];
      }
    });
  }

  fmtDate(d: any): string {
    if (!d) return '';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  // ── Save Report (Create or Update) ─────────────────────────────────────
  saveReport() {
    if (!this.weekStartDate || !this.weekEndDate) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please select week dates' });
      return;
    }

    this.saving = true;
    const payload = {
      employeeId: this.loggedEmpId,
      weekStartDate: this.weekStartDate.toISOString(),
      weekEndDate: this.weekEndDate.toISOString(),
      employeeSummary: this.employeeSummary || null,
    };

    if (this.reportId) {
      this.trackerService.updateReport(this.reportId, payload).subscribe({
        next: (res) => {
          this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Report updated' });
          this.saving = false;
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Update failed' });
          this.saving = false;
        }
      });
    } else {
      this.trackerService.createReport(payload).subscribe({
        next: (res) => {
          this.reportId = res.id;
          this.reportStatus = res.status;
          this.weekLabel = res.weekLabel;
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Report created. Now add your tasks.' });
          this.saving = false;
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Create failed' });
          this.saving = false;
        }
      });
    }
  }

  // ── Task Dialog ────────────────────────────────────────────────────────
  openTaskDialog(task?: any, index?: number) {
    if (task) {
      this.editingTaskIndex = index ?? null;
      this.taskForm = {
        taskDate: task.taskDate ? new Date(task.taskDate) : null,
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
      this.editingTaskIndex = null;
      this.taskForm = {
        taskDate: this.weekStartDate ? new Date(this.weekStartDate) : new Date(),
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
    this.taskDialogVisible = true;
  }

  saveTask() {
    if (!this.taskForm.taskDescription?.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Task description is required' });
      return;
    }
    if (!this.taskForm.taskDate) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Task date is required' });
      return;
    }

    const payload = {
      ...this.taskForm,
      taskDate: this.taskForm.taskDate?.toISOString(),
      deadline: this.taskForm.deadline?.toISOString() || null,
      completionDate: this.taskForm.completionDate?.toISOString() || null,
    };

    if (this.editingTaskIndex !== null && this.tasks[this.editingTaskIndex]) {
      const taskId = this.tasks[this.editingTaskIndex].id;
      this.trackerService.updateTask(taskId, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Task updated' });
          this.taskDialogVisible = false;
          this.loadTasks();
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Update failed' });
        }
      });
    } else {
      this.trackerService.addTask(this.reportId!, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Added', detail: 'Task added' });
          this.taskDialogVisible = false;
          this.loadTasks();
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
        this.loadTasks();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Delete failed' });
      }
    });
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  submitReport() {
    if (!this.reportId) return;
    this.trackerService.submitReport(this.reportId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Submitted', detail: 'Report submitted for approval' });
        this.close.emit();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Submit failed' });
      }
    });
  }

  goBack() {
    this.close.emit();
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
