import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ModuleGuide } from '../shared/module-guide/module-guide';
import { EncashmentService } from '../services/encashment/encashment';

@Component({
  selector: 'app-encashment-overview',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    TooltipModule, DialogModule, InputTextModule, TextareaModule, SelectModule,
    ConfirmDialogModule, ModuleGuide
  ],
  templateUrl: './encashment-overview.html',
  styleUrl: './encashment-overview.css',
  providers: [MessageService, ConfirmationService]
})
export class EncashmentOverview implements OnInit {
  activeTab: 'eligible' | 'all' | 'history' = 'eligible';

  year = this.getFinancialYear();
  years = Array.from({ length: 5 }, (_, i) => this.getFinancialYear() - i);

  // Data
  data: any = null;
  eligible: any[] = [];
  allEmployees: any[] = [];
  loading = true;

  // Summary
  maxCarryForward = 45;
  maxBalance = 60;
  totalExcessDays = 0;
  totalEncashedDays = 0;

  // Encashment dialog
  encashDialogVisible = false;
  selectedEmployee: any = null;
  encashDays: number = 0;
  encashRemarks = '';
  processing = false;

  // History dialog
  historyDialogVisible = false;
  historyEmployee: any = null;
  historyEntries: any[] = [];
  historyTotal = 0;

  loggedEmpId = Number(localStorage.getItem('empId')) || 0;

  constructor(
    private encashmentService: EncashmentService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.encashmentService.getEligible(this.year).subscribe({
      next: (res) => {
        this.data = res;
        this.eligible = res.eligible || [];
        this.allEmployees = res.all || [];
        this.maxCarryForward = res.maxCarryForward;
        this.maxBalance = res.maxBalance;
        this.totalExcessDays = res.totalExcessDays;
        this.totalEncashedDays = res.totalEncashedDays;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load encashment data' });
        this.loading = false;
      }
    });
  }

  onYearChange() {
    this.loadData();
  }

  fmtDate(d: any): string {
    if (!d) return '';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  // ── Process Encashment ────────────────────────────────────────────────
  openEncashDialog(emp: any) {
    this.selectedEmployee = emp;
    this.encashDays = emp.pendingEncashment;
    this.encashRemarks = '';
    this.encashDialogVisible = true;
  }

  confirmEncash() {
    if (!this.selectedEmployee || this.encashDays <= 0) return;

    this.confirmationService.confirm({
      message: `Encash ${this.encashDays} days for ${this.selectedEmployee.employeeName}?`,
      header: 'Confirm Encashment',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.doEncash(),
    });
  }

  doEncash() {
    this.processing = true;
    this.encashmentService.processEncashment({
      employeeId: this.selectedEmployee.employeeId,
      days: this.encashDays,
      year: this.year,
      performedBy: this.loggedEmpId,
      remarks: this.encashRemarks || undefined,
    }).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success', summary: 'Encashed',
          detail: `${res.daysEncashed} days encashed. Balance: ${res.previousBalance} → ${res.newBalance}`
        });
        this.encashDialogVisible = false;
        this.processing = false;
        this.loadData();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Encashment failed' });
        this.processing = false;
      }
    });
  }

  // ── View History ──────────────────────────────────────────────────────
  viewHistory(emp: any) {
    this.historyEmployee = emp;
    this.encashmentService.getHistory(emp.employeeId, this.year).subscribe({
      next: (res) => {
        this.historyEntries = res.entries || [];
        this.historyTotal = res.totalEncashed;
        this.historyDialogVisible = true;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load history' });
      }
    });
  }

  private getFinancialYear(): number {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  }
}
