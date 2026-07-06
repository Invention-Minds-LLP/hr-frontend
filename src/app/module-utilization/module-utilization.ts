import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ModuleGuide } from '../shared/module-guide/module-guide';
import {
  ModuleUsageService,
  ModuleUsageModule,
  ModuleUsageUser,
} from '../services/module-usage/module-usage.service';

@Component({
  selector: 'app-module-utilization',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    DialogModule, DatePickerModule, InputTextModule, TooltipModule,
    ModuleGuide,
  ],
  providers: [MessageService],
  templateUrl: './module-utilization.html',
  styleUrl: './module-utilization.css',
})
export class ModuleUtilization implements OnInit {
  // Date range (defaults to last 30 days)
  fromDate: Date = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
  toDate: Date = new Date();

  loading = false;
  modules: ModuleUsageModule[] = [];
  totalEligible = 0;
  rangeFrom: string | null = null;
  rangeTo: string | null = null;

  // Users dialog
  usersDialogVisible = false;
  selectedModule: ModuleUsageModule | null = null;
  usersTab: 'using' | 'notUsing' = 'using';
  userSearch = '';

  constructor(
    private svc: ModuleUsageService,
    private messageService: MessageService,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    if (this.fromDate && this.toDate && this.fromDate > this.toDate) {
      this.messageService.add({
        severity: 'warn', summary: 'Invalid range',
        detail: '"From" date must be on or before "To" date.',
      });
      return;
    }
    this.loading = true;
    this.svc.getSummary(this.toISO(this.fromDate), this.toISO(this.toDate)).subscribe({
      next: (res) => {
        this.modules = res.modules || [];
        this.totalEligible = res.totalEligible || 0;
        this.rangeFrom = res.from;
        this.rangeTo = res.to;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error', summary: 'Load failed',
          detail: err?.error?.error || err?.error?.message || 'Could not load module utilization.',
        });
      },
    });
  }

  openUsers(mod: ModuleUsageModule, tab: 'using' | 'notUsing' = 'using') {
    this.selectedModule = mod;
    this.usersTab = tab;
    this.userSearch = '';
    this.usersDialogVisible = true;
  }

  get dialogUsers(): ModuleUsageUser[] {
    if (!this.selectedModule) return [];
    const list = this.usersTab === 'using'
      ? this.selectedModule.activeUsers
      : this.selectedModule.inactiveUsers;
    const q = this.userSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      (u.code || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q),
    );
  }

  adoptionClass(pct: number): string {
    if (pct >= 70) return 'high';
    if (pct >= 40) return 'mid';
    return 'low';
  }

  private toISO(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
