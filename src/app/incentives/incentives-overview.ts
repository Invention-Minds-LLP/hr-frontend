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
import { IncentiveService } from '../services/incentive/incentive';
import { Employees } from '../services/employees/employees';
import { AutoCompleteModule } from 'primeng/autocomplete';

@Component({
  selector: 'app-incentives-overview',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    TooltipModule, DialogModule, InputTextModule, TextareaModule, SelectModule,
    DatePickerModule, ConfirmDialogModule, ModuleGuide, AutoCompleteModule
  ],
  templateUrl: './incentives-overview.html',
  styleUrl: './incentives-overview.css',
  providers: [MessageService, ConfirmationService]
})
export class IncentivesOverview implements OnInit {
  incentives: any[] = [];
  loading = true;
  loggedEmpId = Number(localStorage.getItem('empId')) || 0;

  dialogVisible = false;
  isEditing = false;
  editingId: number | null = null;

  selectedEmployee: any = null;
  formType = 'BONUS';
  formAmount: number | null = null;
  formDescription = '';
  formEffectiveDate: Date | null = null;
  formRemarks = '';

  statusDialogVisible = false;
  statusItem: any = null;
  statusValue = '';

  allEmployees: any[] = [];
  filteredEmployees: any[] = [];

  typeOptions = [
    { label: 'Bonus', value: 'BONUS' },
    { label: 'Performance', value: 'PERFORMANCE' },
    { label: 'Festival', value: 'FESTIVAL' },
    { label: 'Referral', value: 'REFERRAL' },
    { label: 'Other', value: 'OTHER' },
  ];

  statusOptions = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  constructor(
    private incentiveService: IncentiveService,
    private employeeService: Employees,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadEmployees();
  }

  loadData() {
    this.loading = true;
    this.incentiveService.getAll().subscribe({
      next: (data) => { this.incentives = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
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
      e.displayName.toLowerCase().includes(query)
    );
  }

  fmtDate(d: any): string {
    if (!d) return '';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  openDialog() {
    this.isEditing = false;
    this.editingId = null;
    this.selectedEmployee = null;
    this.formType = 'BONUS';
    this.formAmount = null;
    this.formDescription = '';
    this.formEffectiveDate = null;
    this.formRemarks = '';
    this.dialogVisible = true;
  }

  save() {
    if (!this.selectedEmployee?.id || !this.formAmount || !this.formEffectiveDate) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Employee, amount, date required' });
      return;
    }
    this.incentiveService.create({
      employeeId: this.selectedEmployee.id,
      type: this.formType,
      amount: this.formAmount,
      description: this.formDescription || undefined,
      effectiveDate: this.formEffectiveDate.toISOString(),
      remarks: this.formRemarks || undefined,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Incentive created' });
        this.dialogVisible = false;
        this.loadData();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  openStatusDialog(item: any) {
    this.statusItem = item;
    this.statusValue = item.status;
    this.statusDialogVisible = true;
  }

  updateStatus() {
    this.incentiveService.update(this.statusItem.id, {
      status: this.statusValue,
      approvedBy: this.statusValue === 'APPROVED' ? this.loggedEmpId : undefined,
      paidOn: this.statusValue === 'PAID' ? new Date().toISOString() : undefined,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Updated' });
        this.statusDialogVisible = false;
        this.loadData();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  confirmDelete(item: any) {
    this.confirmationService.confirm({
      message: 'Delete this incentive?',
      accept: () => {
        this.incentiveService.delete(item.id).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted' }); this.loadData(); },
          error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
        });
      }
    });
  }

  getStatusClass(s: string): string {
    switch (s) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'PAID': return 'status-paid';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
  }
}
