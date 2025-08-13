import { Component, Input } from '@angular/core';
import { Entitles } from '../../services/entitles/entitles';
import { TableModule } from 'primeng/table';
import { DatePipe } from '@angular/common';
import { CommonModule } from '@angular/common';
import { DatePicker } from "primeng/datepicker";
import { FormsModule } from '@angular/forms';
import {  Departments } from '../../services/departments/departments';
import { LeavePopup } from '../leave-popup/leave-popup';
import { WfhPopup } from '../wfh-popup/wfh-popup';
import { PermissionPopup } from '../permission-popup/permission-popup';
import { Employees } from '../../services/employees/employees';

@Component({
  selector: 'app-employee-details',
  imports: [TableModule, DatePipe, CommonModule, DatePicker, FormsModule, LeavePopup, WfhPopup, PermissionPopup],
  templateUrl: './employee-details.html',
  styleUrl: './employee-details.css'
})
export class EmployeeDetails {
  @Input() employee: any;

  leaveRequests: any[] = [];
  permissionRequests: any[] = [];
  wfhRequests: any[] = [];
  accruals:any[]= [];
  entitlements:any | null = null;
  totalLeave: any;
  totalWFH: any;
  departments:any[]=[];
  showLeaveDetailsPopup = false;
  selectedLeaveForView: any | null = null;
  selectedPermission:any | null =null;
  selectedWFH:any | null = null;
  showWFHPopup:boolean = false;
  showPermissionPopup: boolean = false;
  // model
  selectedDates: Date[] = [];
  filtered = { leave: [] as any[], permission: [] as any[], wfh: [] as any[] };


  // Helpers to normalize and test dates
  private toKey(d: Date | string): string {
    const dt = new Date(d);
    // normalize to local yyyy-mm-dd
    return dt.toISOString().slice(0, 10);
  }

  private daysBetween(start: Date | string, end?: Date | string): string[] {
    const s = new Date(start);
    const e = new Date(end ?? start);
    // normalize to midnight
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    const keys: string[] = [];
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      keys.push(this.toKey(d));
    }
    return keys;
  }



  constructor(private entitles: Entitles, private departmentService: Departments, private employeeService: Employees, private entitleService: Entitles) { }

  ngOnInit(): void {
    if (this.employee?.id) {
      this.entitles.getEmployeeRequests(this.employee.id).subscribe((data) => {
        this.leaveRequests = data.leaveRequests || [];
        this.permissionRequests = data.permissionRequests || [];
        this.wfhRequests = data.wfhRequests || [];
        this.totalLeave = data.totals?.totalLeaveDays ?? 0;
        this.totalWFH   = data.totals?.totalWFHDays ?? 0;
        this.entitlements = data.entitlements || this.entitlements;
        this.applyFilters();
      });
      this.employeeService.getAccruals(this.employee?.id).subscribe({
        next: rows => this.accruals = rows
      });
      const year = new Date().getFullYear(); // or derive from selected date range
      // this.entitleService.getEntitlementPolicyByYear(year).subscribe({
      //   next: (res) => {
      //     // If your backend (by mistake) returns an array, normalize it:
      //     this.entitlements = Array.isArray(res) ? (res[0] ?? null) : res;
      //   },
      //   error: (e) => console.error('Entitlements load failed', e)
      // });
      
      this.departmentService.getDepartments().subscribe(data => this.departments = data);
    }
  }

  applyFilters() {
    console.log(this.selectedDates)
    if (!this.selectedDates || this.selectedDates.length === 0) {
      console.log(this.selectedDates)
      this.filtered.leave = [...this.leaveRequests];
      this.filtered.permission = [...this.permissionRequests];
      this.filtered.wfh = [...this.wfhRequests];

      console.log(this.filtered.leave)
      return;
    }

    const selectedSet = new Set(this.selectedDates.map(d => this.toKey(d)));

    // LEAVE: range overlap with any selected day
    this.filtered.leave = this.leaveRequests.filter(row => {
      const rangeKeys = this.daysBetween(row.startDate, row.endDate);
      return rangeKeys.some(k => selectedSet.has(k));
    });

    // PERMISSION: single-day match
    this.filtered.permission = this.permissionRequests.filter(row =>
      selectedSet.has(this.toKey(row.day))
    );

    // WFH: range overlap with any selected day
    this.filtered.wfh = this.wfhRequests.filter(row => {
      const rangeKeys = this.daysBetween(row.startDate, row.endDate);
      return rangeKeys.some(k => selectedSet.has(k));
    });
  }

  clearFilters() {
    this.selectedDates = [];
    this.applyFilters();
  }

  getTotalPermissionHours(): number {
    return this.permissionRequests.reduce((sum, perm) => {
      switch (perm.timing) {
        case 'HOURLY':
          if (perm.startTime && perm.endTime) {
            const hours = (new Date(perm.endTime).getTime() - new Date(perm.startTime).getTime()) / (1000 * 60 * 60);
            return sum + hours;
          }
          return sum;
        case 'HALFDAY':
          return sum + 4;
        case 'FULLDAY':
          return sum + 8;
        default:
          return sum;
      }
    }, 0);
  }
  getPermissionHours(perm: any): number {
    if (perm.timing === 'HOURLY' && perm.startTime && perm.endTime) {
      const hours = (new Date(perm.endTime).getTime() - new Date(perm.startTime).getTime()) / (1000 * 60 * 60);
      return +hours.toFixed(1);
    }

    if (perm.timing === 'HALFDAY') return 4;
    if (perm.timing === 'FULLDAY') return 8;

    return 0;
  }
  getDurationDays(start: Date | string, end: Date | string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    // Difference in milliseconds
    const diffTime = endDate.getTime() - startDate.getTime();
    // Convert to days
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    // If you want to include the start date, add +1
    return diffDays + 1;
  }
  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }

  getDepartmentName(id: number): string {
    return this.departments.find(dep => dep.id === id)?.name || 'N/A';
  }


openLeaveDetails(row: any) {
  // Map to the shape your popup expects
  this.selectedLeaveForView = {
    startDate: row.startDate,                    // ISO/date ok
    endDate: row.endDate ?? row.startDate,       // fallback if single-day
    leaveType: row.leaveType.name ?? row.leaveType.name ?? '',  // adjust if your field differs
    reason: row.reason ?? ''
  };
  this.showLeaveDetailsPopup = true;
}
openDetailsPopup(request: any) {
  // Pass mapped data to popup
  this.selectedPermission = request; // make popup readonly
  this.showPermissionPopup = true;
}
openWFHDetails(wfh: any) {
  this.selectedWFH = {
    ...wfh,
    startDate: wfh.startDate,
    endDate: wfh.endDate,
    reason: wfh.reason
  };
  this.showWFHPopup = true;
}
}
