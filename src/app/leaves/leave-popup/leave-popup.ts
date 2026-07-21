import { Component, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Leaves } from '../../services/leaves/leaves';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { from } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Holidays } from '../../services/holidays/holidays';
import { Shifts } from '../../services/shifts/shifts';

interface CalendarDay {
  date: Date;
  number: number;
  selected: boolean;
  isCurrentMonth: boolean;
  blocked?: boolean;
  compOff?: boolean;
  past?: boolean;
  isNH?: boolean;
  isRH?: boolean;
  isWeekOff?: boolean;
}

@Component({
  selector: 'app-leave-popup',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ToastModule],
  templateUrl: './leave-popup.html',
  styleUrl: './leave-popup.css'
})
export class LeavePopup {


  constructor(private leaveService: Leaves, private messageService: MessageService, private holidayService: Holidays,
    private shiftService: Shifts
  ) { }

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
  employeeGender: 'MALE' | 'FEMALE' | '' = '';
  filteredLeaveTypes: any[] = [];
  isHalfDay = false;
  halfDaySession: 'FIRST_HALF' | 'SECOND_HALF' = 'FIRST_HALF';

  // Half-day shift timing (derived from the employee's shift for the selected day)
  firstHalfRange = '';        // e.g. "9:00 AM – 1:00 PM"
  secondHalfRange = '';       // e.g. "1:00 PM – 5:00 PM"
  shiftTimingLoading = false;
  noShiftForDay = false;
  compOffDates = new Set<string>();
  selectedPrescription: File | null = null;
  optionalHolidays: any[] = [];
  optionalHolidayDates = new Set<string>();
  mandatoryHolidayDates = new Set<string>();
  rhTotal = 0;
  rhUsedCount = 0;





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
  /** This employee's PENDING/APPROVED leaves (with type) — used for the
   *  "one leave type per ISO week" rule (Rule A). */
  myActiveLeaves: { startDate: Date; endDate: Date; typeName: string }[] = [];
  today = new Date();
  approvedWeekOffDates = new Set<string>(); // yyyy-mm-dd
  weekOffSource: 'MONTHLY_SHIFT' | 'SUNDAY_DEFAULT' = 'SUNDAY_DEFAULT';
  compOffCredits: any[] = [];
  prescriptionUrl: string | null = null;
  previewUrl: string | null = null;







  updateFromDate() {
    const tempDate = new Date(
      this.fromYear,
      this.monthToIndex(this.fromMonth),
      this.fromDay
    );

    // if (this.isPastDate(tempDate) || this.isDayBlocked(tempDate)) {
    //   return; // stop selection
    // }

    if (this.isDayBlocked(tempDate)) {
      return; // stop selection
    }

    this.fromDate = new Date(this.fromYear, this.monthToIndex(this.fromMonth), this.fromDay);
    this.currentMonthIndex = this.monthToIndex(this.fromMonth);
    this.currentYear = this.fromYear;
    if (!this.validateSandwichOrReset()) return;
    this.calculateDays();
    this.generateCalendar();
    if (this.isHalfDay) this.loadShiftTimingForSelectedDay();
  }

  getAvailableDays(monthStr: string, year: number): number[] {
    const monthIndex = this.monthToIndex(monthStr);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const validDays: number[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, monthIndex, d);

      // if (!this.isPastDate(dateObj) && !this.isDayBlocked(dateObj)) {
      //   validDays.push(d);
      // }
      if (!this.isDayBlocked(dateObj)) {
        validDays.push(d);
      }
    }

    return validDays;
  }


  updateToDate() {
    const tempDate = new Date(
      this.toYear,
      this.monthToIndex(this.toMonth),
      this.toDay
    );

    // if (this.isPastDate(tempDate) || this.isDayBlocked(tempDate)) {
    //   return;
    // }
    if (this.isDayBlocked(tempDate)) {
      return;
    }

    this.toDate = new Date(this.toYear, this.monthToIndex(this.toMonth), this.toDay);
    this.currentMonthIndex = this.monthToIndex(this.fromMonth);
    this.currentYear = this.fromYear;
    if (!this.validateSandwichOrReset()) return;
    this.calculateDays();
    this.generateCalendar();
  }

  isApprovedWeekOff(date: Date): boolean {
    const key = this.stripTime(date).toISOString().slice(0, 10);

    if (this.weekOffSource === 'MONTHLY_SHIFT') {
      return this.approvedWeekOffDates.has(key);
    }

    // fallback → Sunday
    return date.getDay() === 0;
  }


  ngOnInit(): void {
    this.employeeId = localStorage.getItem('empId') || '';
    this.employeeGender = (localStorage.getItem('gender') || '').toUpperCase() as any;



    console.log(Number(this.employeeId))
    this.leaveService.getBlockedDates(Number(localStorage.getItem('empId')))
      .subscribe((res: any[]) => {
        console.log('Blocked Dates Response:', res);
        this.blockedRanges = res
          .filter((r: any) => {
            // When viewing an existing leave, exclude its own dates from blocked ranges
            if (this.leaveData?.id && r.id === this.leaveData.id) return false;
            return true;
          })
          .map(r => ({
            startDate: new Date(r.startDate),
            endDate: new Date(r.endDate)
          }));

        console.log('Blocked Ranges:', this.blockedRanges);

        this.generateCalendar();
      });
    this.leaveService.getCompOffCredits(Number(this.employeeId))
      .subscribe((credits: any[]) => {

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // keep only valid credits
        this.compOffCredits = credits.filter(c =>
          !c.used && new Date(c.expiryDate) >= today
        );

        this.compOffDates = new Set(
          this.compOffCredits.map(c => {
            const d = new Date(c.workDate);
            d.setHours(0, 0, 0, 0);
            return d.toISOString().slice(0, 10);
          })
        );

        this.generateCalendar();
      });


    const year = new Date().getFullYear();
    const today = new Date();
    const month = today.getMonth() + 1;

    this.shiftService.getApprovedWeekOffs({
      employeeId: Number(this.employeeId),
      month,
      year
    }).subscribe(res => {
      this.weekOffSource = res.source;

      this.approvedWeekOffDates = new Set(
        res.weekOffDates.map(d => {
          const x = new Date(d);
          x.setHours(0, 0, 0, 0);
          return x.toISOString().slice(0, 10);
        })
      );

      this.generateCalendar(); // refresh calendar
    });

    this.holidayService.getHolidaysByYear(year).subscribe((res: any) => {
      this.holidays = res.holidays.map((h: any) => {
        const d = new Date(h.date);
        d.setHours(0, 0, 0, 0);
        return d;
      });

      // Store optional holidays for RH
      this.optionalHolidays = (res.holidays || []).filter((h: any) => h.isOptional);
      this.rhTotal = this.optionalHolidays.length;
      this.optionalHolidayDates = new Set(
        this.optionalHolidays.map((h: any) => {
          const d = new Date(h.date);
          d.setHours(0, 0, 0, 0);
          return d.toISOString();
        })
      );

      // Store mandatory national holidays (non-optional) — excluded from day count
      this.mandatoryHolidayDates = new Set(
        (res.holidays || [])
          .filter((h: any) => !h.isOptional)
          .map((h: any) => {
            const d = new Date(h.date);
            d.setHours(0, 0, 0, 0);
            return d.toISOString().slice(0, 10);
          })
      );
    });

    // Load RH usage count for current FY + this employee's active leaves
    this.leaveService.getLeaves().subscribe((leaves: any[]) => {
      const empId = Number(this.employeeId);
      const mine = (leaves ?? []).filter((l: any) =>
        l.employee?.id === empId &&
        (l.status === 'PENDING' || l.status === 'APPROVED') &&
        // When editing an existing request, don't let it conflict with itself.
        (!this.leaveData?.id || l.id !== this.leaveData.id)
      );
      this.rhUsedCount = mine.filter((l: any) => l.leaveType?.name === 'RH').length;
      this.myActiveLeaves = mine.map((l: any) => ({
        startDate: new Date(l.startDate),
        endDate:   new Date(l.endDate),
        typeName:  l.leaveType?.name ?? '',
      }));
      console.log("RH used count for employee", empId, "is", this.rhUsedCount, "active leaves:", this.myActiveLeaves.length);
    });



    if (this.leaveData) {
      this.populateFromLeaveData(this.leaveData);
    } else {
      this.initializeDefaults();
    }
    this.populateYears();
    this.generateCalendar();
    this.calculateDays();
    // this.leaveService.getLeaveTypes().subscribe(types => {
    //   this.leaveTypes = types;

    //   this.filteredLeaveTypes = types.filter((t: any) => {
    //     const name = t.name.toLowerCase();

    //     if (name.includes('maternity')) {
    //       return this.employeeGender === 'FEMALE';
    //     }

    //     if (name.includes('paternity')) {
    //       return this.employeeGender === 'MALE';
    //     }

    //     return true; // all other leave types visible
    //   });
    // });
    this.leaveService.getLeaveTypes().subscribe(types => {
      this.leaveTypes = types;

      // Required display order
      const leaveOrder = [
        'CL',
        'SL',
        'EL',
        'CO',
        'RH',
        'Maternity Leave',
        'Paternity Leave',
        'LOP'
      ];

      // Step 1: Filter by gender
      let filtered = types.filter((t: any) => {
        const name = t.name;

        if (name === 'Maternity Leave') {
          return this.employeeGender === 'FEMALE';
        }

        if (name === 'Paternity Leave') {
          return this.employeeGender === 'MALE';
        }

        return true;
      });

      // Step 2: Sort in required order
      filtered.sort((a: any, b: any) => {
        return leaveOrder.indexOf(a.name) - leaveOrder.indexOf(b.name);
      });

      this.filteredLeaveTypes = filtered;
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
    // leaveType from the API can be either a string like "SL"
    // or an object like { id: 1, name: "SL" }. Normalize to the string name
    // because the rest of this component expects a string.
    this.leaveType =
      typeof data.leaveType === 'object' && data.leaveType !== null
        ? (data.leaveType.name ?? '')
        : (data.leaveType ?? '');
    this.reason = data.reason;
    this.declineReason = data.declineReason;
    this.isHalfDay = data.isHalfDay;
    this.selectedPrescription = null;
    this.prescriptionUrl = data.prescriptionUrl || null;

    this.halfDaySession = data.halfDaySession || 'FIRST_HALF';
    this.calculateDays();
    if (this.isHalfDay) this.loadShiftTimingForSelectedDay();

    // Disable dragging in calendar for view-only
    this.isDragging = false;

    console.log('Populated form from leave data:', {
      fromDate: this.fromDate,
      toDate: this.toDate,
      isHalfDay: this.isHalfDay,
      halfDaySession: this.halfDaySession
    });
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

  checkCompOffAvailability() {
    if (this.leaveType !== 'CO') return;

    const selectedDates: Date[] = [];

    for (
      let d = new Date(this.fromDate);
      d <= this.toDate;
      d.setDate(d.getDate() + 1)
    ) {
      selectedDates.push(new Date(d));
    }

    for (const leaveDate of selectedDates) {
      const validCredit = this.compOffCredits.find(c => {
        const expiry = new Date(c.expiryDate);
        expiry.setHours(0, 0, 0, 0);

        return expiry >= this.stripTime(leaveDate);
      });

      if (!validCredit) {
        this.messageService.add({
          severity: 'error',
          summary: 'Comp-Off Expired',
          detail: 'No valid comp-off credit available for selected date'
        });
        this.leaveType = '';
        return;
      }
    }
  }




  checkLeaveBalance() {
    const selected = this.leaveTypes.find(t => t.name === this.leaveType);
    if (!selected) return;

    if (this.leaveType === 'CO') {
      console.log('Checking comp-off availability for selected dates');
      this.checkCompOffAvailability();
      return;
    }

    // RH uses request count, not balance table
    if (this.leaveType === 'RH') {
      this.remainingLeave = Math.max(0, 2 - this.rhUsedCount);
      if (this.remainingLeave <= 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'RH Limit Reached',
          detail: `You have already used all ${this.rhTotal} Restricted Holidays this year.`
        });
        this.leaveType = '';
      }
      return;
    }

    // LOP is unpaid by definition — it has no balance. Don't run the balance
    // check (which would print a misleading "0 LOP balance left" warning).
    if (this.leaveType === 'LOP') {
      this.remainingLeave = 0;
      if (this.days > 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Loss of Pay',
          detail: `This leave is applied as Loss of Pay — all ${this.days} day(s) will be unpaid.`,
          life: 6000,
        });
      }
      return;
    }


    const year = this.getFinancialYear(this.fromDate)

    this.leaveService.getLeaveBalance(Number(this.employeeId), year)
      .subscribe((balances: any) => {
        const bal = balances.find((b: any) => b.leaveTypeId === selected.id);
        if (!bal) return;

        this.remainingLeave = bal.remaining;

        // Over-balance no longer blocks the application: the shortfall is booked
        // as Loss of Pay (unpaid) at approval. Warn, but keep the selection.
        if (this.days > bal.remaining) {
          const lop = this.days - Math.max(0, bal.remaining);
          this.messageService.add({
            severity: 'warn',
            summary: 'Loss of Pay',
            detail: `Only ${Math.max(0, bal.remaining)} day(s) of ${this.leaveType} balance left. `
                  + `${lop} day(s) will be Loss of Pay (unpaid).`,
            life: 6000,
          });
        }

      });

    if (this.leaveType) {
      this.checkCausalLeaveBalance()
    }
    if (this.leaveType === 'EL') {
      this.validateEarnedLeave();
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
  // calculateDays() {
  //   if (this.toDate < this.fromDate) {
  //     this.days = 0;
  //     return;
  //   }

  //   let total = 0;

  //   // Loop through each date in the selected range
  //   for (
  //     let d = new Date(this.fromDate);
  //     d <= this.toDate;
  //     d.setDate(d.getDate() + 1)
  //   ) {
  //     const current = new Date(d);

  //     // Skip blocked days
  //     if (this.isDayBlocked(current)) {
  //       continue;
  //     }

  //     total++;
  //   }

  //   this.days = total;
  // }
  calculateDays() {
    if (this.isHalfDay) {
      this.days = 0.5;
      return;
    }

    if (this.toDate < this.fromDate) {
      this.days = 0;
      return;
    }

    // Earned Leave "sandwich rule": week-offs that fall inside the EL range
    // ARE counted as leave days (matches the backend's countWorkingDays with
    // includeWeekOffs). Mandatory national holidays and days already covered
    // by another leave request are never counted, regardless of type.
    const isEL = this.leaveType === 'EL';

    let total = 0;
    for (
      let d = new Date(this.fromDate);
      d <= this.toDate;
      d.setDate(d.getDate() + 1)
    ) {
      const current = new Date(d);
      const key = this.stripTime(current).toISOString().slice(0, 10);
      const isHoliday    = this.mandatoryHolidayDates.has(key);
      const isPriorLeave = this.blockedRanges.some(r => current >= r.startDate && current <= r.endDate);
      const isWeekOff    = this.isApprovedWeekOff(current);

      // Always exclude mandatory holidays + days already on another leave.
      if (isHoliday || isPriorLeave) continue;
      // Week-offs: excluded for normal leave, INCLUDED for EL.
      if (isWeekOff && !isEL) continue;
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
      const key = this.stripTime(dateObj).toISOString().slice(0, 10);
      const isCompOff = this.compOffDates.has(key);
      console.log(isCompOff, key)

      const isBlocked = this.isDayBlocked(dateObj);
      const isPast = this.isPastDate(dateObj);

      // Holiday type detection
      const strippedDate = this.stripTime(dateObj);
      const isOptionalHoliday = this.optionalHolidayDates.has(strippedDate.toISOString());
      const isNationalHoliday = !isOptionalHoliday && this.isHoliday(dateObj);
      const isWeekOff = this.isApprovedWeekOff(dateObj);

      this.calendarDays.push({
        date: dateObj,
        number: day,
        selected: isSelected,
        isCurrentMonth: true,
        blocked: isBlocked,
        compOff: isCompOff,
        past: isPast,
        isNH: isNationalHoliday,
        isRH: isOptionalHoliday,
        isWeekOff: isWeekOff,
      });

      console.log(this.calendarDays)


      // this.calendarDays.push({
      //   date: dateObj,
      //   number: day,
      //   selected: isSelected,
      //   isCurrentMonth: true
      // });
    }

  }
  isDayBlocked(date: Date): boolean {
    // if (this.isPastDate(date)) return true;
    if (this.isApprovedWeekOff(date)) return true;
    // Mandatory national holidays are non-working days
    const key = this.stripTime(date).toISOString().slice(0, 10);
    if (this.mandatoryHolidayDates.has(key)) return true;
    return this.blockedRanges.some(range =>
      date >= range.startDate && date <= range.endDate
    );
  }


  // Handle date click
  onDateClick(day: CalendarDay) {
    if (!day.isCurrentMonth) return;
    // if (day.past) return;


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

    this.calculateDays();
    this.generateCalendar();
    this.syncDropdownsFromDates();
    if (this.isHalfDay) this.loadShiftTimingForSelectedDay();
  }

  // Drag handling
  startDrag(day: CalendarDay) {
    if (!day.isCurrentMonth) return;
    if (this.isHalfDay) {
      this.fromDate = day.date;
      this.toDate = day.date;
      this.calculateDays();
      this.generateCalendar();
      this.syncDropdownsFromDates();
      this.loadShiftTimingForSelectedDay();
      return;
    }

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
    this.syncDropdownsFromDates();
    if (!this.validateSandwichOrReset()) return;
    this.calculateDays();
    this.generateCalendar();
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
    if (this.isHalfDay) this.loadShiftTimingForSelectedDay();
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
    if (!this.reason) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please provide a reason'
      })
      return;
    }
    if (this.leaveType === 'CO') {
      for (
        let d = new Date(this.fromDate);
        d <= this.toDate;
        d.setDate(d.getDate() + 1)
      ) {
        const leaveDate = this.stripTime(new Date(d));

        const validCredit = this.compOffCredits.find(c => {
          const expiry = this.stripTime(new Date(c.expiryDate));
          return expiry >= leaveDate;
        });

        if (!validCredit) {
          this.messageService.add({
            severity: 'error',
            summary: 'Comp-Off Expired',
            detail: 'Selected date exceeds comp-off expiry'
          });
          return;
        }
      }
    }

    // Check overlap with existing leave requests first (applies to all leave types)
    if (this.hasOverlapWithExistingLeave(this.fromDate, this.toDate)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Leave Conflict',
        detail: 'Your selected dates overlap with an existing leave request.'
      });
      this.toDate = this.fromDate;
      this.calculateDays();
      this.generateCalendar();
      this.syncDropdownsFromDates();
      return;
    }


    // 🔴 Rule A: one leave TYPE per ISO week
    const weeklyClashType = this.weeklyTypeConflictName();
    if (weeklyClashType) {
      this.messageService.add({
        severity: 'error',
        summary: 'One leave type per week',
        detail: `You already have a ${weeklyClashType} leave in this week. `
              + `Use ${weeklyClashType} for these dates, or pick dates in a different week.`,
        life: 6000,
      });
      return;
    }

    // 🔴 EL validation
    if (!this.validateEarnedLeave()) {
      return;
    }

    // 🔴 RH validation
    if (this.leaveType === 'RH') {
      if (this.rhUsedCount >= 2) {
        this.messageService.add({
          severity: 'error',
          summary: 'RH Limit Reached',
          detail: 'You have already used 2 Restricted Holidays this year.'
        });
        return;
      }
      const fromKey = new Date(this.fromDate);
      fromKey.setHours(0, 0, 0, 0);
      if (!this.optionalHolidayDates.has(fromKey.toISOString())) {
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid Date',
          detail: 'RH can only be applied on a Restricted Holiday (optional holiday) date.'
        });
        return;
      }
      if (this.days > 1) {
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid',
          detail: 'RH can only be applied for 1 day at a time.'
        });
        return;
      }
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
      reason: this.reason, // we’ll add `reason` binding below
      isHalfDay: this.isHalfDay,
      halfDaySession: this.isHalfDay ? this.halfDaySession : null
    };

    // If an existing leave was passed in AND not view-only, update instead of create
    const isEditMode = !!this.leaveData?.id && !this.isViewOnly;
    const request$ = isEditMode
      ? this.leaveService.updateLeaveRequest(this.leaveData.id, payload)
      : this.leaveService.createLeave(payload);

    request$.subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: isEditMode ? 'Leave updated successfully!' : 'Leave applied successfully!',
        });
        console.log('API response:', res);
        this.isLoading = false;
        if (!isEditMode && this.leaveType === 'SL' && this.selectedPrescription) {
          const fileData = new FormData();
          fileData.append('prescription', this.selectedPrescription);

          this.leaveService.uploadPrescription(res.id, fileData)
            .subscribe(() => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'File uploaded successfully!'
              });
            });
        }
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
    // return this.isPastDate(dateObj) || this.isDayBlocked(dateObj);
    return this.isDayBlocked(dateObj)
    // if (this.isDayBlocked(dateObj)) return true;

    // const next = new Date(dateObj);
    // next.setDate(next.getDate() + 1);

    // return false;
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
    if (leave.roleId === 3  /* if HOD role exists */) {
      return this.isManagement && leave.hodDecision === 'PENDING';
    }

    // Normal Employee → assigned reporting manager approves.
    // Identity check, not role check: the assigned reportingManager may be
    // roleId 3 (Reporting Manager) or roleId 4 (Management). Allow either,
    // as long as the logged-in user is the actual reporting manager.
    if (leave.roleId === 2 || leave.roleId === 5) {
      const isAssignedRM = leave.reportingManagerId === this.currentUserId;
      return isAssignedRM &&
        (this.isReportingManager || this.isManagement) &&
        leave.hodDecision === 'PENDING';
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
    if (leave.roleId === 3) {
      return this.isHRManager && leave.hodDecision === 'APPROVED' && leave.hrDecision === 'PENDING';
    }

    // Normal Employee → HR Manager at Level 2
    if (leave.roleId === 2 || leave.roleId === 5) {
      console.log('role')
      return this.isHR && leave.hodDecision === 'APPROVED' && leave.hrDecision === 'PENDING';
    }

    return false;
  }
  splitByMonth(from: Date, to: Date): Map<string, number> {
    const map = new Map<string, number>();

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      map.set(key, (map.get(key) || 0) + 1);
    }

    return map;
  }

  checkCausalLeaveBalance() {
    console.log('Checking casual leave balance for CL type', this.leaveType);
    if (this.leaveType !== 'CL') return;

    const monthlySplit = this.splitByMonth(this.fromDate, this.toDate);

    monthlySplit.forEach((days, key) => {
      const [years, month] = key.split('-').map(Number);

      const year = this.getFinancialYear(this.fromDate)

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

    // if (day === 0) return true;
    if (this.isApprovedWeekOff(date)) return true;

    return this.holidays.some(h =>
      h.getTime() === date.getTime()
    );
  }

  /* ── Rule A: one leave TYPE per ISO week ─────────────────────── */

  /** Monday 00:00 of the ISO week containing `d`. */
  private startOfISOWeek(d: Date): Date {
    const x = this.stripTime(d);
    const day = x.getDay();                    // 0 Sun .. 6 Sat
    const diff = (day === 0 ? -6 : 1 - day);   // shift to Monday
    x.setDate(x.getDate() + diff);
    return x;
  }
  /** Sunday 23:59:59.999 of that ISO week. */
  private endOfISOWeek(d: Date): Date {
    const s = this.startOfISOWeek(d);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  }
  /** Every ISO week (Mon..Sun) the range [start, end] overlaps. */
  private isoWeeksTouched(start: Date, end: Date): { ws: Date; we: Date }[] {
    const out: { ws: Date; we: Date }[] = [];
    let cur = this.startOfISOWeek(start);
    const last = this.startOfISOWeek(end);
    while (cur.getTime() <= last.getTime()) {
      out.push({ ws: new Date(cur), we: this.endOfISOWeek(cur) });
      cur = new Date(cur);
      cur.setDate(cur.getDate() + 7);
    }
    return out;
  }

  /** If the selected dates clash with an existing different-type leave in
   *  the same ISO week, return that leave's type name; else null.
   *  RH and CO are exempt — they neither block nor are blocked. */
  private weeklyTypeConflictName(): string | null {
    const EXEMPT = ['RH', 'CO'];
    if (EXEMPT.includes(this.leaveType)) return null;
    if (!this.fromDate || !this.toDate) return null;

    const weeks = this.isoWeeksTouched(this.fromDate, this.toDate);
    for (const l of this.myActiveLeaves) {
      if (EXEMPT.includes(l.typeName)) continue;        // an existing RH/CO doesn't block
      if (l.typeName === this.leaveType) continue;       // same type is allowed (Rule A)
      // Does this existing leave overlap any of the new request's ISO weeks?
      for (const w of weeks) {
        if (l.startDate <= w.we && l.endDate >= w.ws) {
          return l.typeName;
        }
      }
    }
    return null;
  }
  stripTime(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // isSandwichLeave(from: Date, to: Date): boolean {
  //   from = this.stripTime(from);
  //   to = this.stripTime(to);

  //   // Case 1: Holiday(s) inside the selected range
  //   let foundWorkingDay = false;
  //   let foundHolidayAfterWork = false;

  //   for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
  //     const current = this.stripTime(new Date(d));

  //     if (this.isHolidayOrWeekend(current)) {
  //       if (foundWorkingDay) {
  //         foundHolidayAfterWork = true;
  //       }
  //     } else {
  //       if (foundHolidayAfterWork) {
  //         return true; // Leave → Holiday → Leave
  //       }
  //       foundWorkingDay = true;
  //     }
  //   }

  //   // Case 2: Leave → Holiday(s)
  //   let next = new Date(to);
  //   next.setDate(next.getDate() + 1);

  //   if (this.isHolidayOrWeekend(this.stripTime(next))) {
  //     return true;
  //   }

  //   // Case 3: Holiday(s) → Leave
  //   let prev = new Date(from);
  //   prev.setDate(prev.getDate() - 1);

  //   if (this.isHolidayOrWeekend(this.stripTime(prev))) {
  //     return true;
  //   }

  //   return false;
  // }
  isSandwichLeave(from: Date, to: Date): boolean {
    from = this.stripTime(from);
    to = this.stripTime(to);

    // Check 1: Off-day inside the leave range (week-off/holiday mixed with working days)
    let hasOffDay = false;
    let hasWorkingDay = false;

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const current = this.stripTime(new Date(d));

      if (this.isApprovedWeekOff(current) || this.isHoliday(current)) {
        hasOffDay = true;
      } else {
        hasWorkingDay = true;
      }

      if (hasOffDay && hasWorkingDay) {
        return true;
      }
    }

    // Check 2: Consecutive off-days AFTER leave contain both week-off and holiday
    // e.g. Leave(Sat 4) → WeekOff(Sun 5) → Holiday(Mon 6) = sandwich
    let afterHasWeekOff = false;
    let afterHasHoliday = false;
    let d = new Date(to);
    d.setDate(d.getDate() + 1);
    while (this.isApprovedWeekOff(this.stripTime(new Date(d))) || this.isHoliday(this.stripTime(new Date(d)))) {
      if (this.isApprovedWeekOff(this.stripTime(new Date(d)))) afterHasWeekOff = true;
      if (this.isHoliday(this.stripTime(new Date(d)))) afterHasHoliday = true;
      d.setDate(d.getDate() + 1);
    }
    if (afterHasWeekOff && afterHasHoliday) return true;

    // Check 3: Consecutive off-days BEFORE leave contain both week-off and holiday
    // e.g. Holiday(Thu) → WeekOff(Fri) → Leave(Sat) = sandwich
    let beforeHasWeekOff = false;
    let beforeHasHoliday = false;
    d = new Date(from);
    d.setDate(d.getDate() - 1);
    while (this.isApprovedWeekOff(this.stripTime(new Date(d))) || this.isHoliday(this.stripTime(new Date(d)))) {
      if (this.isApprovedWeekOff(this.stripTime(new Date(d)))) beforeHasWeekOff = true;
      if (this.isHoliday(this.stripTime(new Date(d)))) beforeHasHoliday = true;
      d.setDate(d.getDate() - 1);
    }
    if (beforeHasWeekOff && beforeHasHoliday) return true;

    // Check 4: Leave is between two off-days (off → leave → off)
    const dayBefore = this.stripTime(new Date(from));
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = this.stripTime(new Date(to));
    dayAfter.setDate(dayAfter.getDate() + 1);

    const beforeIsOff = this.isApprovedWeekOff(dayBefore) || this.isHoliday(dayBefore);
    const afterIsOff = this.isApprovedWeekOff(dayAfter) || this.isHoliday(dayAfter);

    if (beforeIsOff && afterIsOff) {
      return true;
    }

    return false;
  }


  isHoliday(date: Date): boolean {
    const d = this.stripTime(date);
    return this.holidays.some(h => h.getTime() === d.getTime());
  }

  isWeekend(date: Date): boolean {
    // Sunday or approved week off
    return this.isApprovedWeekOff(date);
  }


  // Returns true if any date in [from, to] falls within an already-applied leave range.
  hasOverlapWithExistingLeave(from: Date, to: Date): boolean {
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const current = this.stripTime(new Date(d));
      if (this.blockedRanges.some(range => current >= range.startDate && current <= range.endDate)) {
        return true;
      }
    }
    return false;
  }

  validateSandwichOrReset(): boolean {
    if (!this.fromDate || !this.toDate) return true;


    // RH is applied ON a holiday — skip sandwich check
    // SL is unplanned (illness) — employee cannot control dates around holidays
    if (this.leaveType === 'RH' || this.leaveType === 'SL'|| this.leaveType === 'EL' || this.leaveType === 'LOP') return true;

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

  onHalfDayToggle() {
    if (this.isHalfDay) {
      if (this.leaveType === 'EL') {
        this.messageService.add({
          severity: 'warn',
          summary: 'Invalid Selection',
          detail: 'Half day is not allowed for Earned Leave.'
        });
      }
      // Force single-day selection
      this.toDate = this.fromDate;
      this.calculateDays();
      this.generateCalendar();
      this.syncDropdownsFromDates();
      this.loadShiftTimingForSelectedDay();
    } else {
      this.firstHalfRange = '';
      this.secondHalfRange = '';
      this.noShiftForDay = false;
    }
  }

  /** Timing of the currently-selected half, e.g. "1:00 PM – 5:00 PM". */
  get selectedHalfRange(): string {
    return this.halfDaySession === 'FIRST_HALF' ? this.firstHalfRange : this.secondHalfRange;
  }

  /**
   * Fetch the employee's shift for the selected day and split it at its
   * midpoint into a first-half and second-half time range, so the popup can
   * show exactly which hours the chosen half covers.
   */
  loadShiftTimingForSelectedDay() {
    if (!this.isHalfDay || !this.fromDate) return;

    const empId = this.shiftEmployeeId();
    if (!empId) return;

    const dateStr = this.toYmd(this.fromDate);
    this.shiftTimingLoading = true;
    this.noShiftForDay = false;
    this.firstHalfRange = '';
    this.secondHalfRange = '';

    this.shiftService
      .getDailyShiftsForRange({ employeeId: empId, from: dateStr, to: dateStr })
      .subscribe({
        next: (rows: any[]) => {
          this.shiftTimingLoading = false;
          const row = (rows || []).find((r: any) => r?.shift);
          if (!row?.shift) {
            this.noShiftForDay = true;
            return;
          }
          this.computeHalfRanges(row.shift.startTime, row.shift.endTime);
        },
        error: () => {
          this.shiftTimingLoading = false;
          this.noShiftForDay = true;
        }
      });
  }

  /** Employee whose shift we should read: the leave's owner when viewing,
   *  otherwise the logged-in applicant. */
  private shiftEmployeeId(): number {
    return Number(this.leaveData?.empID ?? this.leaveData?.employeeId ?? this.employeeId) || 0;
  }

  /** Shift times are stored as UTC instants; read them in local (IST) time —
   *  same as the "Shift Plan" widget's toLocaleTimeString — and split at the
   *  midpoint (8h shift → 4h + 4h). */
  private computeHalfRanges(startISO: string, endISO: string) {
    const s = new Date(startISO);
    const e = new Date(endISO);
    const startMin = s.getHours() * 60 + s.getMinutes();
    let endMin = e.getHours() * 60 + e.getMinutes();
    if (endMin <= startMin) endMin += 1440; // overnight shift
    const midMin = Math.round((startMin + endMin) / 2);

    this.firstHalfRange = `${this.fmtMinutes(startMin)} – ${this.fmtMinutes(midMin)}`;
    this.secondHalfRange = `${this.fmtMinutes(midMin)} – ${this.fmtMinutes(endMin)}`;
  }

  /** Minutes-since-midnight → "h:mm AM/PM". */
  private fmtMinutes(total: number): string {
    const t = ((total % 1440) + 1440) % 1440;
    const h = Math.floor(t / 60);
    const m = t % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  /** Local YYYY-MM-DD (avoids UTC date-shift from toISOString). */
  private toYmd(d: Date): string {
    const x = new Date(d);
    return `${x.getFullYear()}-${(x.getMonth() + 1).toString().padStart(2, '0')}-${x.getDate().toString().padStart(2, '0')}`;
  }
  validateEarnedLeave(): boolean {
    if (this.leaveType !== 'EL') return true;

    if (this.days < 3) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid EL Request',
        detail: 'Earned Leave must be at least 3 days.'
      });
      return false;
    }

    if (this.days > 7) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid EL Request',
        detail: 'Earned Leave cannot exceed 7 days.'
      });
      return false;
    }

    return true;
  }
  isPastDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    return d < today;
  }
  onPrescriptionSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.previewUrl = URL.createObjectURL(file);

    if (!file.type.startsWith('image/')) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid File',
        detail: 'Only image files allowed'
      });
      return;
    }

    this.selectedPrescription = file;
  }
  getFinancialYear(date: Date): number {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return month >= 4 ? year : year - 1;
  }
}
