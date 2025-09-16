import { Component, Input } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule,FormGroup, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Resignation } from '../../services/resignation/resignation';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';

type Status = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'WITHDRAWN'  | 'WITHDRAW_REQUESTED' | 'APPROVED' | 'REJECTED';

@Component({
  selector: 'app-resignation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, ButtonModule, TextareaModule, InputNumberModule, CardModule, TableModule, FormsModule],
  templateUrl: './resignation-form.html',
  styleUrl: './resignation-form.css'
})
export class ResignationForm {
  @Input() employeeId!: number;
  rows: any[] = [];
  withdrawReason = '';
  withdrawingId: number | null = null;

  submitted?: any;
  loading = false;
  form!: FormGroup;


  constructor(private fb: FormBuilder, private api: Resignation, private messageService : MessageService) {}
  ngOnInit(): void {
    this.form = this.fb.group({
      reason: ['', [Validators.required, Validators.minLength(10)]],
      additionalNotes: [''],
      noticePeriodDays: [30, [Validators.required, Validators.min(0), Validators.max(180)]],
    });
    this.employeeId = Number(localStorage.getItem('empId'))
    this.load();
  }
  get proposedLWD(): Date | null {
    if (!this.form) return null;                   // guard in case template runs early
    const npd = this.form.get('noticePeriodDays')?.value ?? 0;
    const d = new Date();
    d.setDate(d.getDate() + Number(npd));
    return d;
  }

  submit() {
    if (this.form.invalid || !this.employeeId) return;
    this.loading = true;
    this.api.create({ employeeId: this.employeeId, ...this.form.value as any })
      .subscribe({
        next: (rec) => { this.submitted = rec; this.loading = false; },
        error: () => { 
          // alert('Failed to submit'); 
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to submit resignation'
          })
          this.loading = false; 
        }
      });
    this.load();
  }

  // withdraw() {
  //   if (!this.submitted?.id) return;
  //   this.api.withdraw(this.submitted.id).subscribe({
  //     next: r => this.submitted = r,
  //     error: () => alert('Withdraw failed')
  //   });
  // }
  load() {
    if (!this.employeeId) return;
    this.api.list({ scope: 'mine', employeeId: this.employeeId }).subscribe(r => this.rows = r);
  }

  // withdrawable(r: any): boolean {
  //   const s = (r.status as Status);
  //   return (s === 'SUBMITTED' || s === 'UNDER_REVIEW') && !r.hrConfirmedAt;
  // }
  withdrawable(r: any): boolean {
    const s = r.status as Status;
    return ['SUBMITTED', 'UNDER_REVIEW'].includes(s);
  }
  

  askWithdraw(r: any) {
    this.withdrawingId = r.id;
    this.withdrawReason = '';
  }

  cancelWithdraw() {
    this.withdrawingId = null;
    this.withdrawReason = '';
  }

  confirmWithdraw() {
    if (!this.withdrawingId) return;
    this.api.requestWithdraw(this.withdrawingId, this.withdrawReason).subscribe({
      next: () => {
        this.withdrawingId = null;
        this.withdrawReason = '';
        this.load();
      },
      error: () => 
        // alert('Failed to withdraw')
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to withdraw resignation'
      })
    });
  }

  badgeClass(s: Status) {
    switch (s) {
      case 'SUBMITTED': return 'b b-blue';
      case 'UNDER_REVIEW': return 'b b-amber';
      case 'WITHDRAW_REQUESTED': return 'b b-purple';
      case 'WITHDRAWN': return 'b b-gray';
      case 'APPROVED': return 'b b-green';
      case 'REJECTED': return 'b b-red';
      default: return 'b';
    }
  }
}
