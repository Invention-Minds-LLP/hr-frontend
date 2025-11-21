import { Component, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Leaves } from '../../services/leaves/leaves';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { from } from 'rxjs';
import { MessageService } from 'primeng/api';

interface CalendarDay {
  date: Date;
  number: number;
  selected: boolean;
  isCurrentMonth: boolean;
  blocked?: boolean; // new optional flag
}

@Component({
  selector: 'app-leave-popup',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './leave-popup.html',
  styleUrl: './leave-popup.css'
})
export class LeavePopup {


  constructor(private leaveService: Leaves, private messageService: MessageService) { }

  @Input() showPopup = true;
  @Input() leaveData: any = null;     // Data passed when opening popup
  @Input() isViewOnly: boolean = false; // Controls editability
  @Output() close = new EventEmitter<void>();
  @Input() hasBackdrop = true;


  closePopup() {
    this.close.emit();
  }



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
  declineReason: string = '';
  blockedRanges: { startDate: Date, endDate: Date }[] = [];
  today = new Date();




  updateFromDate() {
    this.fromDate = new Date(this.fromYear, this.monthToIndex(this.fromMonth), this.fromDay);
    this.currentMonthIndex = this.monthToIndex(this.fromMonth);
    this.currentYear = this.fromYear;
    this.calculateDays();
    this.generateCalendar();
  }

  updateToDate() {
    this.toDate = new Date(this.toYear, this.monthToIndex(this.toMonth), this.toDay);
    this.currentMonthIndex = this.monthToIndex(this.fromMonth);
    this.currentYear = this.fromYear;
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
        const bal = balances.find((b:any) => b.leaveTypeId === selected.id);
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
        this.resetForm();
      },
      error: (err) => {
        console.error('Error applying leave:', err);
        // alert('Failed to apply leave. Please try again.');
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
  
    return false;
  }
  
}
