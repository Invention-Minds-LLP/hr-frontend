import { Component } from '@angular/core';
import { Shifts } from '../../services/shifts/shifts';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { Dialog, DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-shift-requests',
  imports: [
    CommonModule,
    CardModule,
    DialogModule,
    SelectModule,
    TableModule,
    CardModule,
    TagModule,
    ButtonModule,
    FormsModule
  ],
  templateUrl: './shift-requests.html',
  styleUrl: './shift-requests.css',
})
export class ShiftRequests {
  approvals: any[] = [];
  role = localStorage.getItem('role') || ''; // HR_MANAGER / REPORTING_MANAGER
  roleId = localStorage.getItem('roleId') || '';
  isHRManager: boolean = false;
  isNormalEmployee: boolean = false;
  isReportingManager: boolean = false;
  isIncharge: boolean = false;
  isHR: boolean = false;
  declineDialogVisible: boolean = false;
  declineReason: string = '';
  currentDeclineId: number | null = null;
currentDeclineLevel: 'LEVEL1' | 'LEVEL2' | null = null;


  constructor(private shifts: Shifts) { }

  ngOnInit() {
    this.load();
    this.isHRManager = Number(this.roleId) === 1;
    this.isReportingManager = Number(this.roleId) === 3;
    this.isNormalEmployee = Number(this.roleId) === 2;
    this.isIncharge = Number(this.roleId) === 5;
    
    this.isHR = this.isHRRole(this.role);
  }

    private isHRRole(role: string): boolean {
    const norm = role.trim().toUpperCase();
    return norm === 'HR' || norm === 'HR MANAGER';
  }


  load() {
    this.shifts.getApprovalsInbox().subscribe(r => this.approvals = r);
    console.log(this.approvals);
  }

  approve(row: any) {
    const role = this.role === 'HR_MANAGER' ? 'HR' : 'RM';

    this.shifts.approveShiftChange(row.id, {
      role,
      decision: 'APPROVED'
    }).subscribe(() => this.load());
  }

  reject(row: any) {
    const role = this.role === 'HR_MANAGER' ? 'HR' : 'RM';

    this.shifts.approveShiftChange(row.id, {
      role,
      decision: 'REJECTED'
    }).subscribe(() => this.load());
  }
  getShiftStatusLabel(a: any): string {

    if (a.hasIncharge && a.rmDecision === 'REJECTED') {
      return 'Reporting Manager Rejected';
    }

    if (a.hasIncharge && a.rmDecision === 'APPROVED' && a.hrDecision === 'PENDING') {
      return 'RM Approved (Waiting HR)';
    }

    if (!a.hasIncharge && a.hrDecision === 'PENDING') {
      return 'Waiting HR Approval';
    }

    if (a.hrDecision === 'APPROVED') {
      return 'HR Approved';
    }

    if (a.hrDecision === 'REJECTED') {
      return 'HR Rejected';
    }

    return 'Pending';
  }
  showShiftLevel1Approve(a: any): boolean {

    // No Level-1 if no incharge
    if (!a.hasIncharge) return false;

    // Only Reporting Manager
    if (!this.isReportingManager) return false;

    return a.rmDecision === 'PENDING';
  }
  showShiftLevel2Approve(a: any): boolean {

    // Only HR
    if (!this.isHRManager || !this.isHR) return false;

    // If RM exists → must approve first
    if (a.hasIncharge && a.rmDecision !== 'APPROVED') return false;

    return a.hrDecision === 'PENDING';
  }

  approveShift(a: any, level: 'LEVEL1' | 'LEVEL2') {

    let role: 'RM' | 'HR';

    if (level === 'LEVEL1') {
      role = 'RM';
    } else {
      role = 'HR';
    }

    this.shifts.approveShiftChange(a.id, {
      role,
      decision: 'APPROVED'
    }).subscribe(() => this.load());
  }
  rejectShift(a: any, level: 'LEVEL1' | 'LEVEL2') {

    let role: 'RM' | 'HR';

    if (level === 'LEVEL1') {
      role = 'RM';
    } else {
      role = 'HR';
    }

    this.shifts.approveShiftChange(a.id, {
      role,
      decision: 'REJECTED'
    }).subscribe(() => this.load());
  }

openDeclineDialog(id: number, level: 'LEVEL1' | 'LEVEL2') {
  this.currentDeclineId = id;
  this.currentDeclineLevel = level;
  this.declineReason = '';
  this.declineDialogVisible = true;
}

confirmDecline() {
  if (!this.declineReason.trim() || !this.currentDeclineId || !this.currentDeclineLevel) {
    return;
  }

  const role: 'RM' | 'HR' =
    this.currentDeclineLevel === 'LEVEL1' ? 'RM' : 'HR';

  this.shifts.approveShiftChange(this.currentDeclineId, {
    role,
    decision: 'REJECTED',
    reason: this.declineReason
  }).subscribe(() => {
    this.declineDialogVisible = false;
    this.declineReason = '';
    this.currentDeclineId = null;
    this.currentDeclineLevel = null;
    this.load();
  });
}


  closeDeclineDialog() {
    this.declineDialogVisible = false;
    this.declineReason = '';
    this.currentDeclineId = null;
  }
}
