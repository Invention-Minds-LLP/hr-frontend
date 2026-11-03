import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DownloadLogRow, DownloadOtpService } from '../../shared/download-otp/download-otp.service';

/** DPDP audit trail: every authorised download — who, what, when, why. HR + Management. */
@Component({
  selector: 'app-download-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, DatePipe],
  template: `
    <div class="dl">
      <div class="dl__head">
        <div class="dl__title">Download Logs</div>
        <div class="dl__filters">
          <input pInputText type="text" placeholder="Search Download ID, name, code, file, reason" [(ngModel)]="search" (keyup.enter)="load(1)" />
          <input pInputText type="date" [(ngModel)]="from" (change)="load(1)" aria-label="From date" />
          <input pInputText type="date" [(ngModel)]="to" (change)="load(1)" aria-label="To date" />
          <button pButton type="button" icon="pi pi-search" label="Search" (click)="load(1)"></button>
        </div>
      </div>

      <p-table [value]="rows" [lazy]="true" [paginator]="true" [rows]="pageSize" [totalRecords]="total" [loading]="loading"
               (onLazyLoad)="onPage($event)" [first]="(page - 1) * pageSize" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr>
            <th>Download ID</th><th>When</th><th>Employee</th><th>Department / Role</th><th>What</th><th>Reason</th><th>Served</th><th>IP</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td class="dl__code">{{ r.downloadCode || '—' }}</td>
            <td>{{ r.createdAt | date: 'dd MMM yyyy, hh:mm a' }}</td>
            <td><b>{{ r.username }}</b><div class="dl__muted">{{ r.employeeCode }}</div></td>
            <td>{{ r.departmentName || '—' }}<div class="dl__muted">{{ r.role }}</div></td>
            <td>{{ r.label }}<div class="dl__muted">{{ r.page }}</div></td>
            <td class="dl__reason">{{ r.reason }}</td>
            <td>{{ r.servedAt ? (r.servedAt | date: 'hh:mm:ss a') : (r.serverRoute ? '—' : 'In browser') }}</td>
            <td>{{ r.ip || '—' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="dl__muted">No downloads recorded for this filter.</td></tr>
        </ng-template>
      </p-table>
      @if (error) { <p class="dl__error">{{ error }}</p> }
    </div>
  `,
  styles: [`
    .dl { padding: 16px; }
    .dl__head { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .dl__title { font-size: 1.2rem; font-weight: 600; }
    .dl__filters { display: flex; flex-wrap: wrap; gap: 8px; }
    .dl__muted { font-size: 12px; opacity: .7; }
    .dl__reason { max-width: 320px; white-space: pre-wrap; }
    .dl__code { font-family: monospace; font-size: 12px; white-space: nowrap; user-select: text; }
    .dl__error { color: #c2410c; }
  `],
})
export class DownloadLogs implements OnInit {
  private svc = inject(DownloadOtpService);

  rows: DownloadLogRow[] = [];
  total = 0;
  page = 1;
  pageSize = 25;
  loading = false;
  search = '';
  from = '';
  to = '';
  error = '';

  ngOnInit(): void {
    this.load(1);
  }

  onPage(e: any): void {
    const page = Math.floor((e.first ?? 0) / (e.rows ?? this.pageSize)) + 1;
    if (page !== this.page || (e.rows && e.rows !== this.pageSize)) {
      this.pageSize = e.rows ?? this.pageSize;
      this.load(page);
    }
  }

  load(page: number): void {
    this.loading = true;
    this.error = '';
    this.page = page;
    this.svc.getLogs({ page, pageSize: this.pageSize, search: this.search.trim(), from: this.from, to: this.to }).subscribe({
      next: (res) => { this.rows = res.data; this.total = res.total; this.loading = false; },
      error: (e) => { this.loading = false; this.error = e?.error?.error || 'Could not load download logs.'; },
    });
  }
}
