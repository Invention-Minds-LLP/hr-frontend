import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Appraisal } from '../../services/appraisal/appraisal';

/**
 * Shared pause dialog used by Managerial Appraisal table AND Dept Performance
 * table. Inputs an employeeId; loads active pause + history; lets HR start a
 * new pause or end the active one. One pause covers both modules' clocks.
 */
@Component({
  selector: 'app-appraisal-pause-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, TextareaModule,
    TableModule, DatePickerModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './appraisal-pause-dialog.html',
  styleUrl: './appraisal-pause-dialog.css',
})
export class AppraisalPauseDialog implements OnChanges {
  @Input() visible = false;
  @Input() employeeId: number | null = null;
  @Input() employeeLabel: string = '';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() changed = new EventEmitter<void>();

  loading = false;
  saving = false;
  active: any = null;
  history: any[] = [];

  newStart: Date | null = null;
  newEnd: Date | null = null;
  newReason: string = '';

  endDate: Date | null = null;

  loggedEmployeeId = Number(localStorage.getItem('empId') || 0);

  constructor(
    private appraisalService: Appraisal,
    private messageService: MessageService,
    private confirmService: ConfirmationService,
  ) {}

  ngOnChanges(c: SimpleChanges) {
    if (c['visible'] && this.visible && this.employeeId) {
      this.resetForm();
      this.load();
    }
  }

  resetForm() {
    this.newStart = new Date();
    this.newEnd = null;
    this.newReason = '';
    this.endDate = new Date();
  }

  load() {
    if (!this.employeeId) return;
    this.loading = true;
    this.appraisalService.listEmployeePauses(this.employeeId).subscribe({
      next: (rows) => {
        const list = rows || [];
        this.active = list.find(r => !r.endDate) || null;
        this.history = list.filter(r => r.endDate);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load pauses' });
      },
    });
  }

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  startPause() {
    if (!this.employeeId) return;
    if (!this.newStart) {
      this.messageService.add({ severity: 'warn', summary: 'Start date required', detail: 'Pick a start date' });
      return;
    }
    if (!this.newReason || !this.newReason.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Reason required', detail: 'Provide a reason' });
      return;
    }
    if (!this.loggedEmployeeId) {
      this.messageService.add({ severity: 'error', summary: 'Not logged in', detail: 'Cannot identify the logged-in user' });
      return;
    }
    this.saving = true;
    this.appraisalService.startPause(this.employeeId, {
      startDate: this.newStart.toISOString(),
      endDate: this.newEnd ? this.newEnd.toISOString() : null,
      reason: this.newReason.trim(),
      createdBy: this.loggedEmployeeId,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({ severity: 'success', summary: 'Pause started', detail: 'Appraisal clock paused' });
        this.changed.emit();
        this.load();
        this.resetForm();
      },
      error: (err) => {
        this.saving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Cannot start pause',
          detail: err?.error?.error || 'Failed to start pause',
        });
      },
    });
  }

  endActivePause() {
    if (!this.active || !this.endDate) return;
    this.confirmService.confirm({
      message: 'End the active pause on ' + this.endDate.toLocaleDateString() + '? The appraisal clock resumes from this date.',
      header: 'End Pause',
      icon: 'pi pi-question-circle',
      accept: () => {
        this.saving = true;
        this.appraisalService.updatePause(this.active.id, {
          endDate: this.endDate!.toISOString(),
          endedBy: this.loggedEmployeeId,
        }).subscribe({
          next: () => {
            this.saving = false;
            this.messageService.add({ severity: 'success', summary: 'Pause ended', detail: 'Clock resumed' });
            this.changed.emit();
            this.load();
          },
          error: (err) => {
            this.saving = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Failed',
              detail: err?.error?.error || 'Failed to end pause',
            });
          },
        });
      },
    });
  }

  deletePause(p: any) {
    this.confirmService.confirm({
      message: `Delete this pause record? This cannot be undone.`,
      header: 'Delete Pause',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.appraisalService.deletePause(p.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted' });
            this.changed.emit();
            this.load();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Failed',
              detail: err?.error?.error || 'Failed to delete',
            });
          },
        });
      },
    });
  }
}
