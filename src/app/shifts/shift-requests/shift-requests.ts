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
import { TooltipModule } from 'primeng/tooltip';


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
    FormsModule,
    TooltipModule
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
  patternDialogVisible = false;
  weekWisePattern: any[] = [];
  selectedMonthLabel = '';
  allShifts: any[] = [];
  selectedMonth: Date = new Date();   // fixes selectedMonth error
  loadingAction: { [key: string]: boolean } = {};
  declineSubmitting = false;






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
  private actionKey(id: number, level: 'LEVEL1' | 'LEVEL2') {
    return `${id}_${level}`;
  }


  load() {
    this.shifts.getApprovalsInbox().subscribe(r => this.approvals = r);
    console.log(this.approvals);
    this.shifts.getShiftTemplates().subscribe(s => this.allShifts = s)
  }

  private getWeekOffDate(
    week: { start: Date; end: Date },
    dayOfWeek: number
  ): Date {
    const d = new Date(week.start);
    d.setDate(week.start.getDate() + dayOfWeek);
    return d;
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
  getShiftStatusSeverity(a: any):
    | 'success'
    | 'secondary'
    | 'info'
    | 'warn'
    | 'danger'
    | 'contrast' {

    if (a.hasIncharge && a.rmDecision === 'REJECTED') {
      return 'danger';
    }

    if (a.hrDecision === 'REJECTED') {
      return 'danger';
    }

    if (a.hrDecision === 'APPROVED') {
      return 'success';
    }

    if (a.hasIncharge && a.rmDecision === 'APPROVED' && a.hrDecision === 'PENDING') {
      return 'info';
    }

    if (!a.hasIncharge && a.hrDecision === 'PENDING') {
      return 'warn'; // ✅ FIXED
    }

    return 'secondary';
  }

  getRejectReason(a: any): string | undefined {
    if (a.rmDecision === 'REJECTED') {
      return a.rmRejectReason || 'No reason provided';
    }

    if (a.hrDecision === 'REJECTED') {
      return a.hrRejectReason || 'No reason provided';
    }

    return undefined; // ✅ NOT null
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
    const key = this.actionKey(a.id, level);
    this.loadingAction[key] = true;

    let role: 'RM' | 'HR';

    if (level === 'LEVEL1') {
      role = 'RM';
    } else {
      role = 'HR';
    }

    this.shifts.approveShiftChange(a.id, {
      role,
      decision: 'APPROVED'
    }).subscribe({
      next: () => this.load(),
      error: () => this.loadingAction[key] = false,
      complete: () => this.loadingAction[key] = false
    });
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
    this.declineSubmitting = true;
    const role: 'RM' | 'HR' =
      this.currentDeclineLevel === 'LEVEL1' ? 'RM' : 'HR';

    this.shifts.approveShiftChange(this.currentDeclineId, {
      role,
      decision: 'REJECTED',
      reason: this.declineReason
    }).subscribe({
      next: () => {
        this.declineDialogVisible = false;
        this.load();
      },
      error: () => {
        this.declineSubmitting = false;
      },
      complete: () => {
        this.declineSubmitting = false;
        this.currentDeclineId = null;
        this.currentDeclineLevel = null;
        this.declineReason = '';
      }
    });


  }


  closeDeclineDialog() {
    this.declineDialogVisible = false;
    this.declineReason = '';
    this.currentDeclineId = null;
  }
  // openPatternDialog(approval: any) {
  //   console.log(approval)
  //   if (!approval.pattern?.items) return;

  //   this.selectedMonthLabel = this.formatMonth(
  //     approval.pattern.month,
  //     approval.pattern.year
  //   );

  //   console.log(this.selectedMonthLabel,)

  //   this.weekWisePattern = this.buildWeekPattern(
  //     approval.pattern.items,
  //     approval.pattern.month,
  //     approval.pattern.year
  //   );

  //   this.patternDialogVisible = true;
  // }
  async openPatternDialog(approval: any) {
    this.patternDialogVisible = true;

    const month = approval.pattern.month; // 1-12
    const year = approval.pattern.year;
    const employeeId = approval.employeeId;

    this.selectedMonthLabel = this.formatMonth(month, year);

    // 1️⃣ Calendar weeks for UI
    const weeks = this.buildCalendarWeeks(month, year);

    // 2️⃣ Build current month weekShiftIds from pattern.items
    //    (weekIndex = floor(dayIndex / 7), first item in that week wins)
    const currWeekShiftIds = this.buildWeekShiftMapFromPatternItems(
      approval.pattern.items || []
    );
    const weekOffWeeks = approval.weekOffConfig?.weeks || {};

    // // 3️⃣ Fill weekWisePattern from CURRENT month first
    // this.weekWisePattern = weeks.map((w, i) => ({
    //   ...w,
    //   shift: currWeekShiftIds[i] != null ? this.getShiftById(currWeekShiftIds[i]) : null
    // }));


    this.weekWisePattern = weeks.map((w, i) => {
      const weekOffDay = weekOffWeeks[i]; // 0–6 or undefined

      return {
        ...w,
        shift: currWeekShiftIds[i] != null
          ? this.getShiftById(currWeekShiftIds[i])
          : null,
        weekOffDate:
          typeof weekOffDay === 'number'
            ? this.getWeekOffDate(w, weekOffDay)
            : null
      };
    });


    // 4️⃣ If Week-1 overlaps previous month → fill ONLY that week from previous month
    //    (can be more than 1 overlap in rare cases, so do it for all overlap weeks)
    const overlapIndexes = weeks
      .map((w, i) => ({ w, i }))
      .filter(x => x.w.start.getMonth() !== (month - 1)) // week starts outside selected month
      .map(x => x.i);

    if (overlapIndexes.length === 0) return;

    // 5️⃣ Fetch previous month assignment (weekShifts) for the employee
    const prev = this.getPrevMonth(month, year);

    const prevRes = await this.shifts
      .getMonthlyShiftForEmployee({
        employeeId,
        month: prev.month,
        year: prev.year
      })
      .toPromise();

    const prevWeekShifts = prevRes?.weekShifts ?? {};

    // 6️⃣ Find which weekIndex in previous month contains the overlap week start date
    const prevWeeks = this.buildCalendarWeeks(prev.month, prev.year);

    overlapIndexes.forEach(overlapIdx => {
      const overlapWeek = weeks[overlapIdx];
      const dateToMatch = overlapWeek.start; // e.g. May 31

      const prevWeekIndex = prevWeeks.findIndex(pw =>
        dateToMatch >= pw.start && dateToMatch <= pw.end
      );

      if (prevWeekIndex >= 0) {
        const shiftId = prevWeekShifts[prevWeekIndex];
        this.weekWisePattern[overlapIdx] = {
          ...this.weekWisePattern[overlapIdx],
          shift: shiftId != null ? this.getShiftById(shiftId) : this.weekWisePattern[overlapIdx].shift
        };
      }
    });
  }


  /** Builds weeks exactly like ManagerShift (Sunday-based week blocks) */
  buildCalendarWeeks(month: number, year: number) {
    const weeks: { start: Date; end: Date }[] = [];

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const firstWeekStart = new Date(monthStart);
    firstWeekStart.setDate(monthStart.getDate() - monthStart.getDay());
    firstWeekStart.setHours(0, 0, 0, 0);

    let current = new Date(firstWeekStart);

    while (current <= monthEnd) {
      const start = new Date(current);
      const end = new Date(current);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      weeks.push({ start, end });
      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }

  /** Converts pattern.items -> weekIndex -> shiftId (first entry in that week wins) */
  buildWeekShiftMapFromPatternItems(items: any[]) {
    const weekShift: Record<number, number> = {};

    for (const item of items) {
      if (typeof item?.dayIndex !== 'number') continue;
      if (typeof item?.shiftId !== 'number') continue;

      const weekIndex = Math.floor(item.dayIndex / 7);

      // first shift in that week wins (all days in week usually same)
      if (weekShift[weekIndex] == null) {
        weekShift[weekIndex] = item.shiftId;
      }
    }

    return weekShift;
  }

  getPrevMonth(month: number, year: number) {
    if (month === 1) return { month: 12, year: year - 1 };
    return { month: month - 1, year };
  }






  closePatternDialog() {
    this.patternDialogVisible = false;
    this.selectedMonthLabel = '';
  }
  // buildWeekPattern(items: any[], month: number, year: number) {
  //   if (!month || !year || !Array.isArray(items)) return [];

  //   // 1️⃣ Build calendar weeks (same as Manager Shift)
  //   const monthStart = new Date(year, month - 1, 1);
  //   const monthEnd = new Date(year, month, 0);

  //   const firstWeekStart = new Date(monthStart);
  //   firstWeekStart.setDate(monthStart.getDate() - monthStart.getDay());
  //   firstWeekStart.setHours(0, 0, 0, 0);

  //   const weeks: any[] = [];
  //   let current = new Date(firstWeekStart);

  //   while (current <= monthEnd) {
  //     const start = new Date(current);
  //     const end = new Date(current);
  //     end.setDate(end.getDate() + 6);

  //     weeks.push({
  //       start,
  //       end,
  //       shift: null
  //     });

  //     current.setDate(current.getDate() + 7);
  //   }

  //   // 2️⃣ Map pattern items by absolute day index
  //   const itemMap = new Map<number, any>();
  //   items.forEach(i => {
  //     if (i?.dayIndex != null) {
  //       itemMap.set(i.dayIndex, i.shift);
  //     }
  //   });

  //   // 3️⃣ Resolve week shift (first matching day wins)
  //   weeks.forEach(week => {
  //     for (let d = 0; d < 7; d++) {
  //       const date = new Date(week.start);
  //       date.setDate(date.getDate() + d);

  //       // convert calendar date → rotation dayIndex
  //       const dayIndex =
  //         Math.floor(
  //           (date.getTime() - firstWeekStart.getTime()) /
  //           (24 * 60 * 60 * 1000)
  //         );

  //       if (itemMap.has(dayIndex)) {
  //         week.shift = itemMap.get(dayIndex);
  //         break;
  //       }
  //     }
  //   });

  //   return weeks;
  // }
  buildWeekPattern(items: any[], month: number, year: number) {
    if (!month || !year || !Array.isArray(items)) return [];

    // 1️⃣ Build calendar weeks for the month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const firstWeekStart = new Date(monthStart);
    firstWeekStart.setDate(monthStart.getDate() - monthStart.getDay());
    firstWeekStart.setHours(0, 0, 0, 0);

    const weeks: { start: Date; end: Date; shift: any | null; fromPreviousMonth: any }[] = [];
    let current = new Date(firstWeekStart);

    while (current <= monthEnd) {
      const start = new Date(current);
      const end = new Date(current);
      end.setDate(end.getDate() + 6);

      // weeks.push({ start, end, shift: null });
      weeks.push({
        start,
        end,
        shift: null,
        fromPreviousMonth: start.getMonth() !== (month - 1)
      });

      current.setDate(current.getDate() + 7);
    }

    // 2️⃣ Map pattern dayIndex → shiftId
    const itemMap = new Map<number, number>();
    items.forEach(i => {
      if (typeof i?.dayIndex === 'number' && typeof i?.shiftId === 'number') {
        itemMap.set(i.dayIndex, i.shiftId);
      }
    });

    // 3️⃣ Resolve shift for each week
    weeks.forEach(week => {
      for (let d = 0; d < 7; d++) {
        const date = new Date(week.start);
        date.setDate(date.getDate() + d);

        const dayIndex = Math.floor(
          (date.getTime() - firstWeekStart.getTime()) /
          (24 * 60 * 60 * 1000)
        );

        if (itemMap.has(dayIndex)) {
          const shiftId = itemMap.get(dayIndex)!;
          week.shift = this.getShiftById(shiftId);
          break;
        }
      }
    });

    return weeks;
  }


  startOfWeek(date: Date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  formatMonth(month: number, year: number): string {
    return new Date(year, month - 1)
      .toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
  }

  getShiftName(shiftId: number): string {
    const shift = this.approvals
      .flatMap(a => a.pattern?.items || [])
      .find((i: any) => i.shiftId === shiftId);

    return shift?.shift?.name || `Shift ${shiftId}`;
  }
  getShiftById(shiftId: number) {
    return this.allShifts.find(s => s.id === shiftId) || null;
  }

  formatISTTime(dateStr: string): string {
    if (!dateStr) return '';

    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata'
    });
  }

  getDefaultImage(gender?: string | null): string {
    const g = gender?.toUpperCase?.() || 'MALE';
    return g === 'FEMALE'
      ? '/img-women.png'
      : '/img.png';
  }

}
