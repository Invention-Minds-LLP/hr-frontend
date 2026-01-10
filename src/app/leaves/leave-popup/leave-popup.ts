import { Component, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Leaves } from '../../services/leaves/leaves';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { from } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Holidays } from '../../services/holidays/holidays';

interface CalendarDay {
  date: Date;
  number: number;
  selected: boolean;
  isCurrentMonth: boolean;
  blocked?: boolean; // new optional flag
}

@Component({
  selector: 'app-leave-popup',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ToastModule],
  templateUrl: './leave-popup.html',
  styleUrl: './leave-popup.css'
})
export class LeavePopup {


  constructor(private leaveService: Leaves, private messageService: MessageService, private holidayService: Holidays) { }

  @Input() showPopup = true;
  @Input() leaveData: any = null;     // Data passed when opening popup
  @Input() isViewOnly: boolean = false; // Controls editability
  @Output() close = new EventEmitter<void>();
  @Input() hasBackdrop = true;
  isHR: boolean = false;
  role: string = '';
  loggedEmployeeId: number = 0;
  currentDeclineRole: 'REPORTING_MANAGER' | 'HR_MANAGER' | 'MANAGEMENT' | null = null;
  loggedRoleId: number = 0;
  loggedEmpId: number = 0;
  isHRManager: boolean = false;
  isNormalEmployee: boolean = false;
  isReportingManager: boolean = false;
  isManagement: boolean = false;
  declineDialogVisible: boolean = false;  // Controls the dialog visibility
  declineReason: string = '';             // Stores the decline reason input
  currentDeclineId: number | null = null; // Stores the leave ID being declined
  currentUserId: number = Number(localStorage.getItem('empId')) || 0;
  holidays: Date[] = [];



  closePopup() {
    this.close.emit();
  }

  isLoading = false;

  monthsList = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];
  yearsList: number[] = [];

  fromDate!: Date;
  toDate!: Date;

  days = 0;

  leaveTypes: any[] = [];
  leaveType = '';

  calendarDays: CalendarDay[] = [];

  // For calendar navigation
  currentMonthIndex!: number;
  currentYear!: number;

  // Drag selection
  isDragging = false;
  daysList = Array.from({ length: 31 }, (_, i) => i + 1);
  reason = '';
  employeeId: string = '';
  // declineReason: string = '';
  blockedRanges: { startDate: Date, endDate: Date }[] = [];
  today = new Date();




  updateFromDate() {
    this.fromDate = new Date(this.fromYear, this.monthToIndex(this.fromMonth), this.fromDay);
    this.currentMonthIndex = this.monthToIndex(this.fromMonth);
    this.currentYear = this.fromYear;
    if (!this.validateSandwichOrReset()) return;
    this.calculateDays();
    this.generateCalendar();
  }

  updateToDate() {
    this.toDate = new Date(this.toYear, this.monthToIndex(this.toMonth), this.toDay);
    this.currentMonthIndex = this.monthToIndex(this.fromMonth);
    this.currentYear = this.fromYear;
    if (!this.validateSandwichOrReset()) return;
    this.calculateDays();
    this.generateCalendar();
  }

  ngOnInit(): void {
    this.employeeId = localStorage.getItem('empId') || '';
    console.log(Number(this.employeeId))
    this.leaveService.getBlockedDates(Number(localStorage.getItem('empId')))
      .subscribe((res: any[]) => {
        console.log('Blocked Dates Response:', res);
        this.blockedRanges = res.map(r => ({
          startDate: new Date(r.startDate),
          endDate: new Date(r.endDate)
        }));

        console.log('Blocked Ranges:', this.blockedRanges);

        this.generateCalendar();
      });

    const year = new Date().getFullYear();

    this.holidayService.getHolidaysByYear(year).subscribe((res: any) => {
      this.holidays = res.holidays.map((h: any) => {
        const d = new Date(h.date);
        d.setHours(0, 0, 0, 0);
        return d;
      });
    });



    if (this.leaveData) {
      this.populateFromLeaveData(this.leaveData);
    } else {
      this.initializeDefaults();
    }
    this.populateYears();
    this.generateCalendar();
    this.calculateDays();
    this.leaveService.getLeaveTypes().subscribe(types => {
      this.leaveTypes = types;
    });

    this.isHR = this.isHRRole(localStorage.getItem('role') || '')
  }

  private isHRRole(role: string): boolean {
    const norm = role.trim().toUpperCase();
    return norm === 'HR' || norm === 'HR MANAGER';
  }

  populateFromLeaveData(data: any) {
    this.fromDate = new Date(data.startDate);
    this.toDate = new Date(data.endDate);
    this.currentMonthIndex = this.fromDate.getMonth();
    this.currentYear = this.fromDate.getFullYear();
    this.syncDropdownsFromDates();
    this.leaveType = data.leaveType;
    this.reason = data.reason;
    this.declineReason = data.declineReason
    this.calculateDays();

    // Disable dragging in calendar for view-only
    this.isDragging = false;
  }
  initializeDefaults() {
    const today = new Date();
    this.fromDate = today;
    this.toDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    this.fromDay = this.fromDate.getDate();
    this.fromMonth = this.monthsList[this.fromDate.getMonth()];
    this.fromYear = this.fromDate.getFullYear();

    this.toDay = this.toDate.getDate();
    this.toMonth = this.monthsList[this.toDate.getMonth()];
    this.toYear = this.toDate.getFullYear();

    this.currentMonthIndex = today.getMonth();
    this.currentYear = today.getFullYear();
  }



  remainingLeave = 0;

  checkLeaveBalance() {
    const selected = this.leaveTypes.find(t => t.name === this.leaveType);
    if (!selected) return;

    const year = this.fromDate.getFullYear();

    this.leaveService.getLeaveBalance(Number(this.employeeId), year)
      .subscribe((balances: any) => {
        const bal = balances.find((b: any) => b.leaveTypeId === selected.id);
        if (!bal) return;

        this.remainingLeave = bal.remaining;

        if (this.days > bal.remaining) {
          this.messageService.add({
            severity: 'error',
            summary: 'Insufficient Balance',
            detail: `Only ${bal.remaining} days left for ${this.leaveType}`
          });
          this.leaveType = '';
        }

      });

    if (this.leaveType) {
      this.checkCausalLeaveBalance()
    }

  }


  populateYears() {
    const currentYear = new Date().getFullYear();
    this.yearsList = [currentYear, currentYear + 1, currentYear + 2];
  }

  monthToIndex(month: string): number {
    return this.monthsList.indexOf(month);
  }

  // calculateDays() {
  //   if (this.toDate >= this.fromDate) {
  //     this.days =
  //       Math.floor(
  //         (this.toDate.getTime() - this.fromDate.getTime()) / (1000 * 60 * 60 * 24)
  //       ) + 1;
  //   } else {
  //     this.days = 0;
  //   }
  // }
  calculateDays() {
    if (this.toDate < this.fromDate) {
      this.days = 0;
      return;
    }

    let total = 0;

    // Loop through each date in the selected range
    for (
      let d = new Date(this.fromDate);
      d <= this.toDate;
      d.setDate(d.getDate() + 1)
    ) {
      const current = new Date(d);

      // Skip blocked days
      if (this.isDayBlocked(current)) {
        continue;
      }

      total++;
    }

    this.days = total;
  }


  generateCalendar() {
    const firstDayOfMonth = new Date(this.currentYear, this.currentMonthIndex, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonthIndex + 1, 0).getDate();

    this.calendarDays = [];

    // Leading blanks
    const leadingEmpty = (firstDayOfMonth + 6) % 7;
    for (let i = 0; i < leadingEmpty; i++) {
      this.calendarDays.push({
        date: new Date(this.currentYear, this.currentMonthIndex, 0),
        number: 0,
        selected: false,
        isCurrentMonth: false
      });
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(this.currentYear, this.currentMonthIndex, day);
      const isSelected =
        dateObj >= this.fromDate && dateObj <= this.toDate;

      const isBlocked = this.isDayBlocked(dateObj);

      this.calendarDays.push({
        date: dateObj,
        number: day,
        selected: isSelected,
        isCurrentMonth: true,
        blocked: isBlocked   // add new flag
      });


      // this.calendarDays.push({
      //   date: dateObj,
      //   number: day,
      //   selected: isSelected,
      //   isCurrentMonth: true
      // });
    }

  }
  isDayBlocked(date: Date): boolean {
    return this.blockedRanges.some(range =>
      date >= range.startDate && date <= range.endDate
    );
  }


  // Handle date click
  onDateClick(day: CalendarDay) {
    if (!day.isCurrentMonth) return;
    if (day.blocked || !day.isCurrentMonth) {
      this.messageService.add({
        severity: 'error',
        summary: 'Date Unavailable',
        detail: 'This date is already applied or approved'
      });
      return;
    }

    if (!this.fromDate || (this.fromDate && this.toDate)) {
      // Reset range
      this.fromDate = day.date;
      this.toDate = day.date;
    } else if (this.fromDate && !this.toDate) {
      // Set second bound
      if (day.date < this.fromDate) {
        this.toDate = this.fromDate;
        this.fromDate = day.date;
      } else {
        this.toDate = day.date;
      }
    }

    let tempFrom = this.fromDate;
    let tempTo = day.date;

    if (!tempFrom || tempTo < tempFrom) {
      tempFrom = tempTo;
    }

    if (this.isSandwichLeave(tempFrom, tempTo)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Sandwich Leave Not Allowed',
        detail: 'Leave cannot be applied before and after holidays/weekends'
      });
      return;
    }

    this.calculateDays();
    this.generateCalendar();
    this.syncDropdownsFromDates();
  }

  // Drag handling
  startDrag(day: CalendarDay) {
    if (!day.isCurrentMonth) return;
    this.isDragging = true;
    this.fromDate = day.date;
    this.toDate = day.date;
    this.generateCalendar();
    this.syncDropdownsFromDates();

  }

  dragOver(day: CalendarDay) {
    if (this.isDragging && day.isCurrentMonth) {
      if (day.date < this.fromDate) {
        this.toDate = this.fromDate;
        this.fromDate = day.date;
      } else {
        this.toDate = day.date;
      }
      this.calculateDays();
      this.generateCalendar();
      this.syncDropdownsFromDates();

    }
  }

  endDrag() {
    this.isDragging = false;
    this.updateFromDate();
    this.updateToDate();
    this.syncDropdownsFromDates();

  }
  syncDropdownsFromDates() {
    this.fromDay = this.fromDate.getDate();
    this.fromMonth = this.monthsList[this.fromDate.getMonth()];
    this.fromYear = this.fromDate.getFullYear();

    this.toDay = this.toDate.getDate();
    this.toMonth = this.monthsList[this.toDate.getMonth()];
    this.toYear = this.toDate.getFullYear();
  }


  // Dropdown sync
  onDropdownChange() {
    this.currentMonthIndex = this.monthToIndex(this.fromMonth);
    this.currentYear = this.fromYear;
    if (!this.validateSandwichOrReset()) return;
    this.calculateDays();
    this.generateCalendar();
  }

  fromDay!: number;
  fromMonth!: string;
  fromYear!: number;
  toDay!: number;
  toMonth!: string;
  toYear!: number;

  isRangeBlocked(from: Date, to: Date): boolean {
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (this.isDayBlocked(new Date(d))) {
        return true;
      }
    }
    return false;
  }


  applyLeave() {
    if (!this.leaveType) {
      // alert('Please select a leave type');
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a leave type'
      })
      return;
    }
    if (this.isRangeBlocked(this.fromDate, this.toDate)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Blocked Range',
        detail: 'Your selected dates overlap with existing leave request.'
      });
      return;
    }
    if (!this.validateSandwichOrReset()) {
      return;
    }

    this.isLoading = true;

    const payload = {
      employeeId: parseInt(this.employeeId), // Replace with actual logged-in employee ID (or @Input() if coming from parent)
      leaveTypeId: this.leaveTypes.find(type => type.name === this.leaveType)?.id,
      startDate: this.fromDate.toISOString(),
      endDate: this.toDate.toISOString(),
      reason: this.reason // we’ll add `reason` binding below
    };
    this.leaveService.createLeave(payload).subscribe({
      next: (res) => {
        // alert('Leave applied successfully!');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Leave applied successfully!'
        });
        console.log('API response:', res);
        this.isLoading = false;
        this.closePopup();
        this.resetForm();
      },
      error: (err) => {
        console.error('Error applying leave:', err);
        // alert('Failed to apply leave. Please try again.');
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to apply leave. Please try again.'
        });
      }
    });
  }

  resetForm() {
    this.initializeDefaults();
    this.generateCalendar();
    this.calculateDays();
    this.syncDropdownsFromDates();
    this.leaveType = '';
    this.reason = ''
  }
  isDisabledDay(day: number, monthStr: string, year: number): boolean {
    const monthIndex = this.monthToIndex(monthStr);
    const dateObj = new Date(year, monthIndex, day);

    // Block past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateObj < today) return true;

    // Block already applied days
    if (this.isDayBlocked(dateObj)) return true;

    const next = new Date(dateObj);
    next.setDate(next.getDate() + 1);

    return false;
  }
  openDeclineDialog(id: number, level: 'LEVEL1' | 'LEVEL2') {
    let backendRole: 'REPORTING_MANAGER' | 'HR_MANAGER' | 'MANAGEMENT' | null = null;

    // LEVEL 1 approvals
    if (level === 'LEVEL1') {

      if (this.isReportingManager) backendRole = 'REPORTING_MANAGER';
      else if (this.isHRManager) backendRole = 'HR_MANAGER';
      else if (this.isManagement) backendRole = 'MANAGEMENT';

    }

    // LEVEL 2 approvals → always HR Manager
    else if (level === 'LEVEL2') {
      backendRole = 'HR_MANAGER';
    }

    this.currentDeclineId = id;
    this.currentDeclineRole = backendRole;
    this.declineDialogVisible = true;
  }


  confirmDecline() {
    if (!this.declineReason.trim()) return;
    this.leaveService.updateLeaveStatus(
      this.currentDeclineId!,
      'Declined',
      this.currentUserId,
      this.currentDeclineRole!,
      this.declineReason
    ).subscribe({
      next: () => {
        this.declineDialogVisible = false;
        this.declineReason = '';
        this.currentDeclineId = null;
      },
      error: (err) => console.error('Error declining leave:', err)
    });
  }

  closeDeclineDialog() {
    this.declineDialogVisible = false;
    this.declineReason = '';
    this.currentDeclineId = null;
  }
  acceptLeave(id: number, level: 'LEVEL1' | 'LEVEL2') {

    this.isLoading = true;

    let backendRole: 'REPORTING_MANAGER' | 'HR_MANAGER' | 'MANAGEMENT' | null = null;

    if (level === 'LEVEL1') {

      if (this.isReportingManager) backendRole = 'REPORTING_MANAGER';
      else if (this.isHRManager) backendRole = 'HR_MANAGER';
      else if (this.isManagement) backendRole = 'MANAGEMENT';

    } else if (level === 'LEVEL2') {
      backendRole = 'HR_MANAGER';
      const previousLeaveType = this.leaveData?.leaveType; // string
      const selectedLeaveType = this.leaveType;            // string

      // const selectedLeaveTypeId =
      //   this.leaveTypes.find(t => t.name === selectedLeaveType)?.id;
      //  CASE 1: Leave type NOT changed (or not selected)
      if (!selectedLeaveType || selectedLeaveType === previousLeaveType) {

        this.leaveService.updateLeaveStatus(
          id,
          'Approved',
          this.loggedEmpId,
          backendRole!
        ).subscribe(() => {
          this.closePopup()
          this.isLoading = false
        });

        return;
      }

      // CASE 2: Leave type CHANGED
      const selectedLeaveTypeId =
        this.leaveTypes.find(t => t.name === selectedLeaveType)?.id;

      console.log(selectedLeaveTypeId)

      // // Safety (should not normally happen)
      // if (!selectedLeaveTypeId) {
      //   console.error('Selected leave type not found');
      //   return;
      // }

      //  Update leave type
      this.leaveService.updateLeaveType(
        id,
        selectedLeaveTypeId,
      ).subscribe({
        next: () => {

          //  Approve leave
          this.leaveService.updateLeaveStatus(
            id,
            'Approved',
            this.loggedEmpId,
            backendRole!
          ).subscribe(() => {
            this.closePopup()
            this.isLoading = false
          });

        }
      });
    }

    // this.leaveService.updateLeaveStatus(id, 'Approved', this.loggedEmpId, backendRole!)
    //   .subscribe(() => this.closePopup());

  }
  showLevel1Approve(leave: any): boolean {

    // console.log('Checking Level 1 approval for leave:', leave);

    // HR Employee (dept = HR AND roleId ≠ HR Manager)
    if (leave.department === 1 && leave.roleId !== 1) {
      console.log('HR Employee - No Level 1 approval', this.isHRManager, leave.hodDecision);
      return this.isHRManager && leave.hodDecision === 'PENDING';
    }

    // HR Manager → only Management approves
    if (leave.roleId === 1) {
      return this.isManagement && leave.hodDecision === 'PENDING';
    }

    // Reporting Manager & HOD → Management approves
    if (leave.roleId === 3 || leave.roleId === 5 /* if HOD role exists */) {
      return this.isManagement && leave.hodDecision === 'PENDING';
    }

    // Normal Employee → Reporting Manager approves
    if (leave.roleId === 2) {
      return this.isReportingManager && leave.hodDecision === 'PENDING';
    }

    return false;
  }
  showLevel2Approve(leave: any): boolean {

    console.log(leave)

    // HR Employees → NO Level 2 approval
    if (leave.department === 1 && leave.roleId !== 1) {
      return false;
    }

    // HR Manager → NO Level 2 approval
    if (leave.roleId === 1) {
      return false;
    }

    // Reporting Manager & HOD → HR Manager at Level 2
    if (leave.roleId === 3 || leave.roleId === 5) {
      return this.isHRManager && leave.hodDecision === 'APPROVED' && leave.hrDecision === 'PENDING';
    }

    // Normal Employee → HR Manager at Level 2
    if (leave.roleId === 2) {
      console.log('role')
      return this.isHR && leave.hodDecision === 'APPROVED' && leave.hrDecision === 'PENDING';
    }

    return false;
  }
  splitByMonth(from: Date, to: Date): Map<string, number> {
    const map = new Map<string, number>();

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      map.set(key, (map.get(key) || 0) + 1);
    }

    return map;
  }

  checkCausalLeaveBalance() {
    if (this.leaveType !== 'Casual Leave') return;

    const monthlySplit = this.splitByMonth(this.fromDate, this.toDate);

    monthlySplit.forEach((days, key) => {
      const [year, month] = key.split('-').map(Number);

      this.leaveService
        .getMonthlyCasualUsage(Number(this.employeeId), year, month)
        .subscribe(res => {
          if (days > res.remaining) {
            this.messageService.add({
              severity: 'error',
              summary: 'Monthly Limit Exceeded',
              detail: `Only ${res.remaining} Casual Leave day(s) left in ${this.monthsList[month]
                }`
            });

            this.leaveType = '';
          }
        });
    });
  }

  isHolidayOrWeekend(date: Date): boolean {
    const day = date.getDay(); // 0 = Sun, 6 = Sat

    if (day === 0 || day === 6) return true;

    return this.holidays.some(h =>
      h.getTime() === date.getTime()
    );
  }
  stripTime(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  isSandwichLeave(from: Date, to: Date): boolean {
    from = this.stripTime(from);
    to = this.stripTime(to);

    // Case 1: Holiday(s) inside the selected range
    let foundWorkingDay = false;
    let foundHolidayAfterWork = false;

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const current = this.stripTime(new Date(d));

      if (this.isHolidayOrWeekend(current)) {
        if (foundWorkingDay) {
          foundHolidayAfterWork = true;
        }
      } else {
        if (foundHolidayAfterWork) {
          return true; // Leave → Holiday → Leave
        }
        foundWorkingDay = true;
      }
    }

    // Case 2: Leave → Holiday(s)
    let next = new Date(to);
    next.setDate(next.getDate() + 1);

    if (this.isHolidayOrWeekend(this.stripTime(next))) {
      return true;
    }

    // Case 3: Holiday(s) → Leave
    let prev = new Date(from);
    prev.setDate(prev.getDate() - 1);

    if (this.isHolidayOrWeekend(this.stripTime(prev))) {
      return true;
    }

    return false;
  }


  validateSandwichOrReset(): boolean {
    if (!this.fromDate || !this.toDate) return true;

    if (this.isSandwichLeave(this.fromDate, this.toDate)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Sandwich Leave Not Allowed',
        detail: 'Leave cannot be applied before and after holidays/weekends'
      });

      // Reset selection safely
      this.toDate = this.fromDate;
      this.calculateDays();
      this.generateCalendar();
      this.syncDropdownsFromDates();

      return false;
    }

    return true;
  }


}
