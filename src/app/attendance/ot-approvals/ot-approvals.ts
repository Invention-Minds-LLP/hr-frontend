import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Dashboard } from '../../services/dashboard/dashboard';
import { ModuleGuide } from '../../shared/module-guide/module-guide';

@Component({
  selector: 'app-ot-approvals',
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    TagModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
    ModuleGuide,
  ],
  providers: [MessageService],
  templateUrl: './ot-approvals.html',
  styleUrl: './ot-approvals.css',
})
export class OtApprovals implements OnInit {
  records: any[] = [];
  loading = true;
  actionLoading: { [id: number]: boolean } = {};

  constructor(private api: Dashboard, private messageService: MessageService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.api.getManagerOtPending().subscribe({
      next: (data) => {
        this.records = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  approve(row: any) {
    this.actionLoading[row.id] = true;
    this.api.approveOrRejectOTManager([row.id], 'APPROVE').subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Approved', detail: 'OT approved and sent to HR' });
        this.load();
      },
      error: () => {
        this.actionLoading[row.id] = false;
      },
    });
  }

  reject(row: any) {
    this.actionLoading[row.id] = true;
    this.api.approveOrRejectOTManager([row.id], 'REJECT').subscribe({
      next: () => {
        this.messageService.add({ severity: 'info', summary: 'Rejected', detail: 'OT rejected' });
        this.load();
      },
      error: () => {
        this.actionLoading[row.id] = false;
      },
    });
  }

  formatTime(d: string | Date | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  formatDate(d: string | Date | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}-${dt.getFullYear()}`;
  }

  formatDuration(minutes: number): string {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
}
