import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Resignation } from '../../services/resignation/resignation';
import { DialogModule } from 'primeng/dialog';
import { ResignPost } from '../resign-post/resign-post';
import { RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-resignation-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, DatePipe,  DialogModule, ResignPost, RouterModule, RouterLink],
  templateUrl: './resignation-list.html',
  styleUrl: './resignation-list.css'
})
export class ResignationList {
  rows: any[] = [];
  role = (localStorage.getItem('role') || '');
  employeeId = Number(localStorage.getItem('empId') || 0);
  managerId = this.employeeId; // assumes logged in user is potential manager
  showPostHr = false;
  isHR = ['HR', 'HR MANAGER'].includes((localStorage.getItem('role') || '').toUpperCase());


  constructor(private api: Resignation) { }

  ngOnInit() {
    // const norm = this.normalize(this.role);
    if (this.role === 'HR' || this.role === 'HR Manager' || this.role === 'Management') {
      this.api.list({ scope: 'all' }).subscribe(r => this.rows = r);
    } else if (this.role === 'Reporting Manager' || this.role === 'Manager') {
      this.api.list({ scope: 'manager', managerId: this.managerId }).subscribe(r => this.rows = r);
    } else {
      this.api.list({ scope: 'mine', employeeId: this.employeeId }).subscribe(r => this.rows = r);
    }
  }

  approveManager(r: any) {
    this.api.managerApprove(r.id, {}).subscribe(upd => this.replace(upd));
  }
  rejectManager(r: any) {
    const note = prompt('Rejection reason?') || '';
    this.api.managerReject(r.id, { note }).subscribe(upd => this.replace(upd));
  }
  approveHR(r: any) {
    const lwd = prompt('Actual Last Working Day (yyyy-mm-dd)? Leave blank to keep proposed.') || '';
    this.api.hrApprove(r.id, { actualLastWorkingDay: lwd || undefined }).subscribe(upd => this.replace(upd));
  }
  rejectHR(r: any) {
    const note = prompt('Rejection reason?') || '';
    this.api.hrReject(r.id, { note }).subscribe(upd => this.replace(upd));
  }
  cancelHR(r: any) {
    this.api.hrCancel(r.id).subscribe(upd => this.replace(upd));
  }

  private replace(upd: any) {
    this.rows = this.rows.map(x => x.id === upd.id ? upd : x);
  }

  private normalize(s: string) {
    const n = s.trim().replace(/[_\s]+/g, ' ');
    const map: Record<string, string> = {
      'hr': 'hr',
      'human resources': 'hr',
      'hr manager': 'hr_manager',
      'hrm': 'hr_manager',
      'reporting manager': 'reporting_manager',
      'manager': 'reporting_manager'
    };
    return map[n] || s.toLowerCase().replace(/\s+/g, '_');
  }
  holdHR(r: any) {
    const note = prompt('Reason for putting on hold?') || '';
    this.api.hrHold(r.id, { note }).subscribe(upd => this.replace(upd));
  }
  dialogOpen: Record<number, boolean> = {};

  openDialog(id: number) { this.dialogOpen[id] = true; }
  closeDialog(id: number) { this.dialogOpen[id] = false; }
  isOpen(id: number) { return !!this.dialogOpen[id]; }
  approveWithdrawHR(r: any) {
    const note = prompt('Optional note for approving withdraw?') || '';
    this.api.hrApproveWithdraw(r.id, { note, approvedBy: this.employeeId })
      .subscribe(upd => this.replace(upd));
  }

  rejectWithdrawHR(r: any) {
    const note = prompt('Reason for rejecting withdraw?') || '';
    this.api.hrRejectWithdraw(r.id, { note, rejectedBy: this.employeeId })
      .subscribe(upd => this.replace(upd));
  }

}
