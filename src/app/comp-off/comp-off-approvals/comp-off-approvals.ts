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
  mine: any[] = [];
  loading = true;
  actionLoading: { [id: number]: boolean } = {};

  // Rejection always carries a reason — an unexplained rejection is what sends
  // the employee back to HR to argue.
  rejectDialogVisible = false;
  rejectTarget: any = null;
  rejectNote = '';

  constructor(private compOffService: CompOffService, private messageService: MessageService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    // Stage one only. HR does its half on the Comp Off register under HR Manual
    // Entries, so duplicating the HR queue here would just be two doors into the
    // same work.
    forkJoin({
      pending: this.compOffService.getManagerPending(),
      mine: this.compOffService.getMyRequests(),
    }).subscribe({
      next: ({ pending, mine }) => {
        this.pending = pending || [];
        this.mine = mine || [];
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
          detail: 'Comp-off approved and sent to HR',
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

  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING_MANAGER': return 'With manager';
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
