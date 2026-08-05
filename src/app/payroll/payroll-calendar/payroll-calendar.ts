import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { DividerModule } from 'primeng/divider';
import {
  PayrollService, EmployeeCalendar, CalendarDay, PayslipCalendarResponse,
} from '../../services/payroll/payroll.service';

/**
 * Month-grid view of everything behind one employee's payslip.
 *
 * Used two ways:
 *   • inside a payroll run  — pass runId + employeeId, shows reconciliation
 *     against the payslip and the loan/incentive lines
 *   • standalone            — pass employeeId + month + year
 */
@Component({
  selector: 'app-payroll-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, TagModule, TooltipModule, SkeletonModule, TableModule, DividerModule],
  templateUrl: './payroll-calendar.html',
  styleUrl: './payroll-calendar.css',
})
export class PayrollCalendar implements OnChanges {

  @Input() employeeId!: number;
  @Input() runId?: number;
  @Input() month?: number;
  @Input() year?: number;

  loading = false;
  error = '';

  calendar: EmployeeCalendar | null = null;
  payslip: any = null;
  adjustments: PayslipCalendarResponse['adjustments'] | null = null;
  reconciliation: PayslipCalendarResponse['reconciliation'] = null;

  /** Day cells padded so the 1st lands under its real weekday. */
  grid: (CalendarDay | null)[] = [];
  readonly weekdayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  selectedDay: CalendarDay | null = null;

  constructor(private svc: PayrollService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeId'] || changes['runId'] || changes['month'] || changes['year']) {
      this.load();
    }
  }

  load(): void {
    if (!this.employeeId) return;
    this.loading = true;
    this.error = '';
    this.selectedDay = null;

    const done = (cal: EmployeeCalendar) => {
      this.calendar = cal;
      this.buildGrid(cal);
      this.loading = false;
    };
    const fail = (e: any) => {
      this.loading = false;
      this.calendar = null;
      this.error = e?.error?.message || 'Could not load the attendance calendar';
    };

    if (this.runId) {
      this.svc.getPayslipCalendar(this.runId, this.employeeId).subscribe({
        next: (r) => {
          this.payslip = r.payslip;
          this.adjustments = r.adjustments;
          this.reconciliation = r.reconciliation;
          done(r.calendar);
        },
        error: fail,
      });
    } else {
      const now = new Date();
      this.svc.getEmployeeCalendar(
        this.employeeId,
        this.month ?? now.getMonth() + 1,
        this.year ?? now.getFullYear(),
      ).subscribe({ next: done, error: fail });
    }
  }

  /** Pad the front of the month so day 1 sits under the correct weekday. */
  private buildGrid(cal: EmployeeCalendar): void {
    const first = cal.days[0];
    const lead = first ? this.weekdayHeaders.indexOf(first.weekday) : 0;
    this.grid = [
      ...Array(Math.max(0, lead)).fill(null),
      ...cal.days,
    ];
  }

  selectDay(day: CalendarDay | null): void {
    if (!day) return;
    this.selectedDay = this.selectedDay?.date === day.date ? null : day;
  }

  // ── cell appearance ────────────────────────────────────────────────────────

  /** Base colour band for a day, driven by how it was PAID, not just status. */
  dayClass(day: CalendarDay | null): string {
    if (!day) return 'empty';
    if (day.holidayName || day.status === 'HOLIDAY') return 'holiday';
    if (day.status === 'WEEK_OFF') return 'weekoff';
    if (day.payTreatment === 'LOP') return 'lop';
    if (day.status === 'LEAVE') return day.leaveIsLop ? 'lop' : 'leave';
    if (day.status === 'HALF_DAY' || day.payTreatment === 'HALF') return 'half';
    if (day.status === 'WFH') return 'wfh';
    if (day.status === 'COMP_OFF') return 'compoff';
    if (day.status === 'PRESENT') return 'present';
    if (!day.status) return 'nodata';
    return 'other';
  }

  /** Short label shown in the cell. */
  dayLabel(day: CalendarDay): string {
    if (day.holidayName) return 'Holiday';
    switch (day.status) {
      case 'WEEK_OFF': return 'Week off';
      case 'LEAVE':    return day.leaveType || 'Leave';
      case 'HALF_DAY': return 'Half day';
      case 'WFH':      return 'WFH';
      case 'COMP_OFF': return 'Comp off';
      case 'ABSENT':   return 'Absent';
      case 'PRESENT':  return 'Present';
      default:         return day.status ? this.pretty(day.status) : 'No record';
    }
  }

  /** Full explanation on hover — this is what makes the grid auditable. */
  dayTooltip(day: CalendarDay): string {
    const lines: string[] = [`${day.date} (${day.weekday}) — ${this.dayLabel(day)}`];

    if (day.shiftStart) lines.push(`Shift ${day.shiftStart}–${day.shiftEnd} ${day.shiftName ? '(' + day.shiftName + ')' : ''}`);
    if (day.checkIn || day.checkOut) {
      lines.push(`In ${day.checkIn || '—'} · Out ${day.checkOut || '—'}` +
        (day.workedMinutes != null ? ` · worked ${this.hm(day.workedMinutes)}` : ''));
    }
    if (day.lateMinutes) {
      lines.push(`Late ${day.lateMinutes} min — ${day.lateApproved ? 'APPROVED' : 'not approved'}`);
      if (day.lateApprovalNote) lines.push(`  ${day.lateApprovalNote}`);
    }
    if (day.earlyMinutes) lines.push(`Left ${day.earlyMinutes} min early`);
    if (day.otMinutes) lines.push(`OT ${this.hm(day.otMinutes)} — ${day.otApproved ? 'approved' : 'NOT approved, unpaid'}`);
    if (day.leaveType) lines.push(`${day.leaveType} (${day.leaveStatus})${day.leaveIsLop ? ' — unpaid' : ''}`);
    if (day.holidayName) lines.push(day.holidayName);
    if (day.isForcedPresent) lines.push('Force-marked present by HR');
    if (day.isPunchCorrected) lines.push('Punch corrected manually');
    if (day.isOverridden) lines.push('Attendance overridden');
    if (day.remarks) lines.push(`Note: ${day.remarks}`);
    lines.push(`Payroll treatment: ${this.pretty(day.payTreatment)}`);

    return lines.join('\n');
  }

  /** Corner markers — the at-a-glance signals an approver scans for. */
  hasLate(day: CalendarDay): boolean { return day.lateMinutes > 0; }
  hasUnapprovedLate(day: CalendarDay): boolean { return day.lateMinutes > 0 && !day.lateApproved; }
  hasEarly(day: CalendarDay): boolean { return day.earlyMinutes > 0; }
  hasOt(day: CalendarDay): boolean { return day.otMinutes > 0; }
  hasPendingOt(day: CalendarDay): boolean { return day.otMinutes > 0 && !day.otApproved; }
  wasTouched(day: CalendarDay): boolean {
    return day.isForcedPresent || day.isPunchCorrected || day.isOverridden;
  }
  missingPunch(day: CalendarDay): boolean {
    return day.status === 'PRESENT' && (!day.checkIn || !day.checkOut);
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Minutes → "7h 30m". */
  hm(minutes?: number | null): string {
    if (!minutes) return '0m';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h ? `${h}h${m ? ' ' + m + 'm' : ''}` : `${m}m`;
  }

  pretty(v?: string | null): string {
    if (!v) return '—';
    return v.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  }

  inr(n?: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  }

  monthName(m?: number): string {
    const names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return names[m ?? 0] || '';
  }
}
