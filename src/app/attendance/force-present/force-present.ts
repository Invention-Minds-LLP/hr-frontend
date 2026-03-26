import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { ForcePresentService } from '../../services/force-present/force-present';
import { Employees } from '../../services/employees/employees';
import { ModuleGuide } from '../../shared/module-guide/module-guide';

@Component({
  selector: 'app-force-present',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    ToastModule,
    InputTextModule,
    CheckboxModule,
    TagModule,
    AutoCompleteModule,
    DatePickerModule,
    DividerModule,
    ModuleGuide,
  ],
  providers: [MessageService],
  templateUrl: './force-present.html',
  styleUrl: './force-present.css',
})
export class ForcePresent implements OnInit {
  // Form
  selectedEmployee: any = null;
  employeeSuggestions: any[] = [];
  selectedDate: Date | null = null;
  reason = '';
  createCompOff = false;
  submitting = false;

  // Preview
  previewLeaves: any[] = [];
  previewing = false;

  // History table
  records: any[] = [];
  total = 0;
  page = 1;
  limit = 20;
  loadingList = false;

  constructor(
    private svc: ForcePresentService,
    private empSvc: Employees,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadList();
  }

  searchEmployees(event: any) {
    this.empSvc.getEmployees(1, 20, event.query).subscribe({
      next: (res: any) => {
        const list = res.employees ?? res.data ?? res ?? [];
        this.employeeSuggestions = list.map((e: any) => ({
          ...e,
          label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
        }));
      },
      error: () => (this.employeeSuggestions = []),
    });
  }

  onDateChange() {
    this.previewLeaves = [];
    if (!this.selectedEmployee?.id || !this.selectedDate) return;

    const dateStr = this.formatDateISO(this.selectedDate);
    this.previewing = true;
    this.svc.getApprovedLeavesOnDate(this.selectedEmployee.id, dateStr).subscribe({
      next: (leaves) => {
        this.previewLeaves = leaves.map((l: any) => ({
          ...l,
          action: this.resolveLeaveAction(l, dateStr),
        }));
        this.previewing = false;
      },
      error: () => (this.previewing = false),
    });
  }

  resolveLeaveAction(leave: any, dateStr: string): string {
    const target = new Date(dateStr);
    const start  = new Date(leave.startDate);
    const end    = new Date(leave.endDate);
    const isSame = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    if (isSame(start, end))           return 'Leave will be cancelled entirely';
    if (isSame(target, start))        return 'Leave start date will be moved to the next day';
    if (isSame(target, end))          return 'Leave end date will be moved to the previous day';
    return 'Leave will be split — remaining days kept as a separate leave';
  }

  submit() {
    if (!this.selectedEmployee?.id || !this.selectedDate || !this.reason.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Employee, date, and reason are required.',
      });
      return;
    }

    this.submitting = true;
    this.svc
      .markForcePresent({
        employeeId: this.selectedEmployee.id,
        date: this.formatDateISO(this.selectedDate),
        reason: this.reason.trim(),
        createCompOff: this.createCompOff,
      })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Done',
            detail: 'Employee marked as Force Present. Leave cancelled and balance restored.',
          });
          this.resetForm();
          this.loadList();
        },
        error: (err) => {
          const msg = err?.error?.error ?? 'Failed to mark force present.';
          this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
          this.submitting = false;
        },
      });
  }

  resetForm() {
    this.selectedEmployee = null;
    this.selectedDate = null;
    this.reason = '';
    this.createCompOff = false;
    this.previewLeaves = [];
    this.submitting = false;
  }

  loadList() {
    this.loadingList = true;
    this.svc.getList(this.page, this.limit).subscribe({
      next: (res) => {
        this.records = res.records ?? [];
        this.total = res.total ?? 0;
        this.loadingList = false;
      },
      error: () => (this.loadingList = false),
    });
  }

  onPageChange(event: any) {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.limit = event.rows;
    this.loadList();
  }

  formatDateISO(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDate(d: string | Date | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
  }

  empName(row: any): string {
    const e = row.employee;
    return e ? `${e.firstName} ${e.lastName}` : '—';
  }
}
