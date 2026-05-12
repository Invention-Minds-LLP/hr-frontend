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
import { LoanService } from '../services/loan/loan';
import { Employees } from '../services/employees/employees';
import { AutoCompleteModule } from 'primeng/autocomplete';

@Component({
  selector: 'app-loans-overview',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    TooltipModule, DialogModule, InputTextModule, TextareaModule, SelectModule,
    DatePickerModule, ConfirmDialogModule, ModuleGuide, AutoCompleteModule
  ],
  templateUrl: './loans-overview.html',
  styleUrl: './loans-overview.css',
  providers: [MessageService, ConfirmationService]
})
export class LoansOverview implements OnInit {
  loans: any[] = [];
  loading = true;
  loggedEmpId = Number(localStorage.getItem('empId')) || 0;

  // Create dialog
  dialogVisible = false;
  selectedEmployee: any = null;
  formLoanType = 'SALARY_ADVANCE';
  formPrincipal: number | null = null;
  formInterestRate = 0;
  formTenure: number | null = null;
  formReason = '';

  // Status dialog
  statusDialogVisible = false;
  statusItem: any = null;
  statusValue = '';

  // Repayment dialog
  repayDialogVisible = false;
  repayLoan: any = null;
  repayAmount: number | null = null;
  repayDate: Date | null = null;
  repayMode = 'SALARY_DEDUCTION';
  repayRemarks = '';

  // Detail dialog
  detailDialogVisible = false;
  detailLoan: any = null;

  loanTypeOptions = [
    { label: 'Salary Advance', value: 'SALARY_ADVANCE' },
    { label: 'Personal Loan', value: 'PERSONAL' },
    { label: 'Emergency Loan', value: 'EMERGENCY' },
    { label: 'Other', value: 'OTHER' },
  ];

  statusOptions = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Closed', value: 'CLOSED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  modeOptions = [
    { label: 'Salary Deduction', value: 'SALARY_DEDUCTION' },
    { label: 'Cash', value: 'CASH' },
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
  ];

  allEmployees: any[] = [];
  filteredEmployees: any[] = [];

  constructor(
    private loanService: LoanService,
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
    this.loanService.getAll().subscribe({
      next: (data) => { this.loans = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  loadEmployees() {
    // All active employees (no pagination cap) so the picker can find anyone.
    this.employeeService.getActiveEmployees().subscribe({
      next: (rows: any) => {
        const list = Array.isArray(rows) ? rows : (rows?.data ?? rows ?? []);
        this.allEmployees = list.map((e: any) => ({
          ...e,
          displayName: `${e.employeeCode} - ${e.firstName} ${e.lastName}`
        }));
      },
      error: () => { this.allEmployees = []; },
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
    this.selectedEmployee = null;
    this.formLoanType = 'SALARY_ADVANCE';
    this.formPrincipal = null;
    this.formInterestRate = 0;
    this.formTenure = null;
    this.formReason = '';
    this.dialogVisible = true;
  }

  save() {
    if (!this.selectedEmployee?.id || !this.formPrincipal || !this.formTenure) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Employee, amount, tenure required' });
      return;
    }
    this.loanService.create({
      employeeId: this.selectedEmployee.id,
      loanType: this.formLoanType,
      principalAmount: this.formPrincipal,
      interestRate: this.formInterestRate,
      tenure: this.formTenure,
      reason: this.formReason || undefined,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Loan created' });
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
    this.loanService.update(this.statusItem.id, {
      status: this.statusValue,
      approvedBy: this.statusValue === 'APPROVED' ? this.loggedEmpId : undefined,
      disbursedOn: this.statusValue === 'ACTIVE' ? new Date().toISOString() : undefined,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Updated' });
        this.statusDialogVisible = false;
        this.loadData();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  openRepayDialog(loan: any) {
    this.repayLoan = loan;
    this.repayAmount = loan.emiAmount;
    this.repayDate = new Date();
    this.repayMode = 'SALARY_DEDUCTION';
    this.repayRemarks = '';
    this.repayDialogVisible = true;
  }

  addRepayment() {
    if (!this.repayAmount || !this.repayDate) return;
    this.loanService.addRepayment(this.repayLoan.id, {
      amount: this.repayAmount,
      paidOn: this.repayDate.toISOString(),
      mode: this.repayMode,
      remarks: this.repayRemarks || undefined,
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Repayment recorded' });
        this.repayDialogVisible = false;
        this.loadData();
      },
      error: (e) => this.messageService.add({ severity: 'error', summary: 'Error', detail: e.error?.error || 'Failed' })
    });
  }

  viewDetail(loan: any) {
    this.detailLoan = loan;
    this.detailDialogVisible = true;
  }

  confirmDelete(item: any) {
    this.confirmationService.confirm({
      message: 'Delete this loan?',
      accept: () => {
        this.loanService.delete(item.id).subscribe({
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
      case 'ACTIVE': return 'status-active';
      case 'CLOSED': return 'status-closed';
      case 'REJECTED': return 'status-rejected';
      default: return '';
    }
  }
}
