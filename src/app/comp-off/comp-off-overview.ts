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
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ModuleGuide } from '../shared/module-guide/module-guide';
import { CompOffService } from '../services/comp-off/comp-off';
import { Employees } from '../services/employees/employees';
import { AutoCompleteModule } from 'primeng/autocomplete';

@Component({
  selector: 'app-comp-off-overview',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    TooltipModule, DialogModule, InputTextModule, TextareaModule, SelectModule,
    DatePickerModule, ConfirmDialogModule, ModuleGuide, AutoCompleteModule
  ],
  templateUrl: './comp-off-overview.html',
  styleUrl: './comp-off-overview.css',
  providers: [MessageService, ConfirmationService]
})
export class CompOffOverview implements OnInit {
  credits: any[] = [];
  loading = true;
  statusFilter: string | null = null;
  loggedEmpId = Number(localStorage.getItem('empId')) || 0;

  dialogVisible = false;
  selectedEmployee: any = null;
  formWorkDate: Date | null = null;
  formExpiryDate: Date | null = null;
  formReason = '';

  // Employee search
  allEmployees: any[] = [];
  filteredEmployees: any[] = [];

  statusOptions = [
    { label: 'All', value: null },
    { label: 'Unused', value: 'unused' },
    { label: 'Used', value: 'used' },
  ];

  constructor(
    private compOffService: CompOffService,
    private employeeService: Employees,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadEmployees();
  }

  loadEmployees() {
    this.employeeService.getEmployees(1, 50).subscribe({
      next: (res: any) => {
        this.allEmployees = (res.data || res).map((e: any) => ({
          ...e,
          displayName: `${e.employeeCode} - ${e.firstName} ${e.lastName}`
        }));
      }
    });
  }

  searchEmployees(event: any) {
    const query = (event.query || '').toLowerCase();
    this.filteredEmployees = this.allEmployees.filter(e =>
      e.displayName.toLowerCase().includes(query) ||
      e.employeeCode?.toLowerCase().includes(query) ||
      e.firstName?.toLowerCase().includes(query) ||
      e.lastName?.toLowerCase().includes(query)
    );
  }

  loadData() {
    this.loading = true;
    const params: any = {};
    if (this.statusFilter) params.status = this.statusFilter;
    this.compOffService.getCredits(params).subscribe({
      next: (data) => { this.credits = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  fmtDate(d: any): string {
    if (!d) return '';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  openDialog() {
    this.selectedEmployee = null;
    this.formWorkDate = null;
    this.formExpiryDate = null;
    this.formReason = '';
    this.dialogVisible = true;
  }

  save() {
    if (!this.selectedEmployee?.id || !this.formWorkDate) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Employee and work date required' });
      return;
    }
    this.compOffService.create({
      employeeId: this.selectedEmployee.id,
      workDate: this.formWorkDate.toISOString(),
      expiryDate: this.formExpiryDate?.toISOString() || undefined,
      grantedBy: this.loggedEmpId,
      grantReason: this.formReason || undefined,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Comp off granted' });
        this.dialogVisible = false;
        this.loadData();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  confirmDelete(item: any) {
    this.confirmationService.confirm({
      message: 'Delete this comp off credit?',
      accept: () => {
        this.compOffService.delete(item.id).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted' }); this.loadData(); },
          error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
        });
      }
    });
  }
}
