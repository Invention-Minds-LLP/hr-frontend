import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { CompOffService } from '../../services/comp-off/comp-off';

@Component({
  selector: 'app-comp-off-approvals',
  imports: [
    CommonModule, FormsModule, CardModule, TableModule, ButtonModule,
    ToastModule, TooltipModule, DialogModule, TextareaModule, ModuleGuide,
  ],
  providers: [MessageService],
  templateUrl: './comp-off-approvals.html',
  styleUrl: './comp-off-approvals.css',
})
export class CompOffApprovals implements OnInit {
  pending: any[] = [];
  /** Approved claims still waiting for the manager to confirm the day. */
  awaitingConfirmation: any[] = [];
  mine: any[] = [];
  loading = true;
  actionLoading: { [id: number]: boolean } = {};

  // Rejection always carries a reason — an unexplained rejection is what sends
  // the employee back to HR to argue.
  rejectDialogVisible = false;
  rejectTarget: any = null;
  rejectNote = '';

  // Confirmation sets the worked figure HR credits against, so it gets a dialog
  // rather than a bare button.
  confirmDialogVisible = false;
  confirmTarget: any = null;
  confirmWorked = true;
  confirmHours: number | null = null;
  confirmNote = '';

  constructor(private compOffService: CompOffService, private messageService: MessageService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    // Stage one only. HR does its half on the Comp Off register under HR Manual
    // Entries, so duplicating the HR queue here would just be two doors into the
    // same work.
    // Every action sets actionLoading[id] and refreshes on success; without
    // clearing it here the row's buttons stay disabled until a page reload.
    this.actionLoading = {};

    forkJoin({
      pending: this.compOffService.getManagerPending(),
      mine: this.compOffService.getMyRequests(),
    }).subscribe({
      next: ({ pending, mine }) => {
        this.pending = pending?.awaitingApproval || [];
        this.awaitingConfirmation = pending?.awaitingConfirmation || [];
        this.mine = mine?.requests || [];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  approve(row: any) {
    this.actionLoading[row.id] = true;
    this.compOffService.managerDecide(row.id, true).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success', summary: 'Approved',
          detail: 'Now confirm the day was worked',
        });
        this.load();
      },
      error: (e) => {
        this.actionLoading[row.id] = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' });
      },
    });
  }

  openReject(row: any) {
    this.rejectTarget = row;
    this.rejectNote = '';
    this.rejectDialogVisible = true;
  }

  confirmReject() {
    if (!this.rejectNote.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Reason required', detail: 'Say why you are rejecting it' });
      return;
    }
    const row = this.rejectTarget;
    this.actionLoading[row.id] = true;
    this.compOffService.managerDecide(row.id, false, this.rejectNote.trim()).subscribe({
      next: () => {
        this.messageService.add({ severity: 'info', summary: 'Rejected', detail: 'Comp-off rejected' });
        this.rejectDialogVisible = false;
        this.load();
      },
      error: (e) => {
        this.actionLoading[row.id] = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' });
      },
    });
  }

  // ── Stage two: confirming the day was worked ──────────────────────────────

  openConfirm(row: any) {
    this.confirmTarget = row;
    this.confirmWorked = true;
    // Default to the punch basis where detection found one.
    this.confirmHours = row.workedMinutes ? +(row.workedMinutes / 60).toFixed(2) : null;
    this.confirmNote = '';
    this.confirmDialogVisible = true;
  }

  submitConfirm() {
    const row = this.confirmTarget;
    if (!this.confirmWorked && !this.confirmNote.trim()) {
      this.messageService.add({
        severity: 'warn', summary: 'Reason required',
        detail: 'Explain why the day was not worked — this rejects the claim',
      });
      return;
    }

    const hours = Number(this.confirmHours);
    const workedMinutes = this.confirmWorked && Number.isFinite(hours) && hours > 0
      ? Math.round(hours * 60)
      : undefined;

    this.actionLoading[row.id] = true;
    this.compOffService
      .confirm(row.id, this.confirmWorked, workedMinutes, this.confirmNote.trim() || undefined)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: this.confirmWorked ? 'success' : 'info',
            summary: this.confirmWorked ? 'Confirmed' : 'Not confirmed',
            detail: this.confirmWorked ? 'Sent to HR for the credit' : 'Claim rejected',
          });
          this.confirmDialogVisible = false;
          this.load();
        },
        error: (e) => {
          this.actionLoading[row.id] = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' });
        },
      });
  }

  withdraw(row: any) {
    this.compOffService.withdrawRequest(row.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'info', summary: 'Withdrawn' });
        this.load();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' }),
    });
  }

  fmtDate(d: any): string {
    if (!d) return '-';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  fmtHours(minutes: number | null): string {
    if (!minutes && minutes !== 0) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }

  /**
   * Why the day qualified. Detection sets the qualifier from the calendar; a
   * claim raised by hand often has none yet, so fall back to who raised it
   * rather than mislabelling an employee's own claim as "HR raised".
   */
  qualifierLabel(row: any): string {
    if (row?.qualifier === 'HOLIDAY') return 'Holiday';
    if (row?.qualifier === 'WEEK_OFF') return 'Week off';
    if (row?.source === 'EMPLOYEE_REQUEST') return 'Self-claimed';
    if (row?.source === 'HR') return 'HR raised';
    return '-';
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING_MANAGER': return 'With manager';
      case 'PENDING_CONFIRMATION': return 'Awaiting confirmation';
      case 'PENDING_HR': return 'With HR';
      case 'APPROVED': return 'Credited';
      case 'REJECTED': return 'Rejected';
      case 'WITHDRAWN': return 'Withdrawn';
      default: return status;
    }
  }

  statusClass(status: string): string {
    if (status === 'APPROVED') return 'ok';
    if (status === 'REJECTED' || status === 'WITHDRAWN') return 'bad';
    return 'wait';
  }
}
