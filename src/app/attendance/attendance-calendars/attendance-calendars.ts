import { Component, OnInit, inject, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarModule, DateAdapter, CalendarEvent } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { AttendanceCalendar } from '../../services/attendance-calendar/attendance-calendar';
import { HttpClientModule } from '@angular/common/http';
// import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import { DialogModule } from 'primeng/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { addHours } from 'date-fns';
import { Subject } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';


@Component({
  selector: 'app-attendance-calendars',
  imports: [CommonModule,
    CalendarModule,
    DialogModule,
    ReactiveFormsModule,
    FormsModule,
    TooltipModule,
    ToastModule
  ],
  templateUrl: './attendance-calendars.html',
  styleUrl: './attendance-calendars.css',
  providers: [MessageService]
})
export class AttendanceCalendars {
  @Input() employeeId!: number;
  @Input() employeeName!: string;
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  refresh: Subject<any> = new Subject();
  rejectPopupVisible = false;
  rejectReason = '';
  selectedEventForReject: any = null;
  forcePopupVisible = false;
  selectedForceEvent: any = null;
  selectedForceDate: Date | undefined = undefined;





  calendarOptions: any;

  selectedMonth = new Date().getFullYear() + '-' +
    String(new Date().getMonth() + 1).padStart(2, '0');

  constructor(private attendanceService: AttendanceCalendar, private messageService: MessageService) { }



  viewDate: Date = new Date();
  events: CalendarEvent[] = [];
  pendingList: any[] = [];


  ngOnInit() {
    this.loadCalendar();
  }

  loadCalendar() {
    console.log('Loading calendar for employeeId:', this.employeeId, this.viewDate);

    const month = this.viewDate.getFullYear() + '-' +
      String(this.viewDate.getMonth() + 1).padStart(2, '0');

    this.attendanceService.getCalendarData(this.employeeId, month)
      .subscribe((res: any) => {

        this.events = [];
        this.pendingList = [];

        // res.forEach((item: any) => {

        //   /** ------------------------------
        //    *  ATTENDANCE / PERMISSION EVENTS
        //    * ------------------------------ */
        //   if (item.type !== 'leave') {

        //     const ev = {
        //       start: new Date(item.start),
        //       allDay: true,
        //       title: item.title,
        //       meta: {
        //         type: item.type,
        //         hours: item.hours,
        //         checkIn: item.checkIn,
        //         checkOut: item.checkOut,
        //         status: item.status,
        //         leaveType: item.title.replace('Leave (', '').replace(')', ''),
        //         flag: item.flag,
        //         finalStatus: item.finalStatus,
        //         approvedBy: item.approvedBy,
        //         approvedAt: item.approvedAt,
        //         needsApproval: item.needsApproval,
        //         attendanceId: item.attendanceId,
        //         date: item.start
        //       },
        //       color: {
        //         primary: this.getColor(item.type),
        //         secondary: this.getColor(item.type) + '33'
        //       }
        //     };

        //     this.events.push(ev);

        //     // ⭐ STORE PENDING APPROVAL ITEMS
        //     if (item.needsApproval) {
        //       this.pendingList.push({
        //         attendanceId: item.attendanceId,
        //         date: new Date(item.start),
        //         checkIn: item.checkIn,
        //         checkOut: item.checkOut,
        //         flag: item.flag,
        //         finalStatus: item.finalStatus
        //       });
        //     }
        //   }



        //   /** ------------------------------
        //    *  LEAVE EVENTS (MULTI-DAY)
        //    * ------------------------------ */
        //   else {
        //     let current = new Date(item.start);
        //     const end = new Date(item.end);

        //     while (current <= end) {
        //       this.events.push({
        //         start: new Date(current),
        //         allDay: true,
        //         title: item.title,
        //         meta: {
        //           type: 'leave',
        //           leaveType: item.title
        //         },
        //         color: {
        //           primary: this.getColor('leave'),
        //           secondary: this.getColor('leave') + '33'
        //         }
        //       });

        //       current.setDate(current.getDate() + 1);
        //     }
        //   }

        // }); 

        res.forEach((item: any) => {

          /* ------------------------------
             ✅ WEEK OFF EVENTS (NEW)
          ------------------------------ */
          if (item.type === 'weekoff') {
            this.events.push({
              start: new Date(item.start),
              allDay: true,
              title: 'Week Off',
              meta: {
                type: 'weekoff',
                approved: item.approved === true
              },
              color: {
                primary: this.getColor('weekoff'),
                secondary: this.getColor('weekoff') + '33'
              }
            });

            return; // ⛔ IMPORTANT: stop here
          }

          /* ------------------------------
             ATTENDANCE / PERMISSION
          ------------------------------ */
          if (item.type !== 'leave') {
            const ev = {
              start: new Date(item.start),
              allDay: true,
              title: item.title,
              meta: {
                type: item.type,
                hours: item.hours,
                checkIn: item.checkIn,
                checkOut: item.checkOut,
                status: item.status,
                leaveType: item.title.replace('Leave (', '').replace(')', ''),
                flag: item.flag,
                finalStatus: item.finalStatus,
                approvedBy: item.approvedBy,
                approvedAt: item.approvedAt,
                needsApproval: item.needsApproval,
                attendanceId: item.attendanceId,
                date: item.start
              },
              color: {
                primary: this.getColor(item.type),
                secondary: this.getColor(item.type) + '33'
              }
            };

            this.events.push(ev);

            if (item.needsApproval) {
              this.pendingList.push({
                attendanceId: item.attendanceId,
                date: new Date(item.start),
                checkIn: item.checkIn,
                checkOut: item.checkOut,
                flag: item.flag,
                finalStatus: item.finalStatus
              });
            }

            return;
          }

          /* ------------------------------
             LEAVE EVENTS
          ------------------------------ */
          let current = new Date(item.start);
          const end = new Date(item.end);

          while (current <= end) {
            this.events.push({
              start: new Date(current),
              allDay: true,
              title: item.title,
              meta: {
                type: 'leave',
                leaveType: item.title
              },
              color: {
                primary: this.getColor('leave'),
                secondary: this.getColor('leave') + '33'
              }
            });

            current.setDate(current.getDate() + 1);
          }
        });

        console.log('Events:', this.events);
        console.log('Pending Approvals:', this.pendingList);

        this.refresh.next(null);
      });
  }
  forcePresent(event: any) {
    const attendanceId = event.attendanceId || event.meta?.attendanceId;

    this.attendanceService.approveAttendance(
      attendanceId,
      'FORCE_PRESENT',
      Number(localStorage.getItem('empId'))
    ).subscribe(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Attendance marked as force present.'
      });
      this.loadCalendar();
    });
  }

  prevMonth() {
    console.log('Current viewDate before prevMonth:', this.viewDate);
    this.viewDate = new Date(
      this.viewDate.getFullYear(),
      this.viewDate.getMonth() - 1,
      1
    );
    console.log('Previous month viewDate:', this.viewDate);
    this.loadCalendar();
    setTimeout(() => this.adjustCalendarScale(), 50);
  }

  nextMonth() {
    console.log('Current viewDate before nextMonth:', this.viewDate);
    this.viewDate = new Date(
      this.viewDate.getFullYear(),
      this.viewDate.getMonth() + 1,
      1
    );
    console.log('Next month viewDate:', this.viewDate);
    this.loadCalendar();
    setTimeout(() => this.adjustCalendarScale(), 50);
  }


  getColor(type: string) {
    switch (type) {
      case 'attendance': return '#4CAF50';
      case 'leave': return '#F44336';
      case 'permission': return '#FFC107';
      case 'weekoff':
        return '#5dc0f2';

      default: return '#9E9E9E';
    }
  }
  onViewChange(event: any) {
    const newStart = event.period.start;  // always 1st day of that month
    this.viewDate = newStart;
    this.loadCalendar();
  }
  getTooltip(ev: any) {
    if (!ev?.meta) return '';

    // Attendance Tooltip
    if (ev.meta.type === 'attendance') {
      const cin = this.formatTime(ev.meta.checkIn);
      const cout = this.formatTime(ev.meta.checkOut);

      return `Hours: ${ev.meta.hours}
  ${cin ? 'In: ' + cin : ''}
  ${cout ? 'Out: ' + cout : ''}`;
    }

    // Leave Tooltip
    if (ev.meta.type === 'leave') {
      return `${ev.meta.leaveType || 'Leave'}`
    }

    // Permission Tooltip
    if (ev.meta.type === 'permission') {
      return `Permission (${ev.meta.timing || ''})`;
    }

    if (ev.meta.type === 'weekoff') {
      // console.log('Weekoff event meta:', ev.meta);
      return ev.meta.approved
        ? 'Approved Week Off'
        : 'Weekly Off (Sunday)';
    }

    return '';
  }


  getDayClass(day: any) {
    const date = day.date;
    const event = day.events?.[0];

    // if (date.getDay() === 0) return 'sunday';
    if (!event || !event.meta) return '';

    const status = event.meta.status;
    const flag = event.meta.flag;

    // Absent
    if (status === 'Absent') return 'absent-day';

    // Present + late login/early logout
    if (status === 'Present') {
      if (flag?.includes('half-day')) return 'half-day';
      if (flag?.includes('late-login')) return 'late-login-day';
      if (flag?.includes('early-logout')) return 'early-logout-day';
      return 'present-day';
    }
    if (event.meta.finalStatus === 'PendingApproval') return 'pending-approval-day';
    if (event.meta.finalStatus === 'Absent') return 'absent-day';
    if (event.meta.finalStatus === 'Present') return 'present-day';

    if (event.meta.attendanceApproval === 'FORCE_PRESENT') {
      return 'force-present-day';
    }


    // Leave days
    if (event.meta.type === 'leave') return 'leave-day';

    // Permission
    if (event.meta.type === 'permission') return 'permission-day';

    if (event.meta.type === 'weekoff') {
      return 'weekoff-day';
    }


    return '';
  }

  formatTime(isoString: string | null): string {
    if (!isoString) return '';

    const date = new Date(isoString);

    // Format HH:MM
    let hours = date.getHours();
    let minutes = date.getMinutes().toString().padStart(2, '0');

    // Convert to AM/PM (optional)
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${hours}:${minutes} ${ampm}`;
  }
  approve(event: any) {
    // const attendanceId = event.meta.attendanceId;   // backend must send this
    const attendanceId =
      event?.meta?.attendanceId || event?.attendanceId;
    console.log('Approving attendanceId:', attendanceId);

    this.attendanceService.approveAttendance(attendanceId, 'APPROVED', Number(localStorage.getItem('empId')))  // HR ID
      .subscribe(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Attendance approved successfully.'
        });
        this.loadCalendar();
      });
  }

  reject(event: any) {
    this.selectedEventForReject = event;
    this.rejectReason = '';
    this.rejectPopupVisible = true;
  }
  submitReject() {
    if (!this.rejectReason.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Reject reason is required.'
      });
      return;
    }

    const attendanceId = this.selectedEventForReject?.meta?.attendanceId || this.selectedEventForReject?.attendanceId;

    this.attendanceService.approveAttendance(
      attendanceId,
      'REJECTED',
      Number(localStorage.getItem('empId')), // HR userId
      this.rejectReason
    ).subscribe(() => {
      this.rejectPopupVisible = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Attendance rejected successfully.'
      });
      this.loadCalendar();
    });
  }
  onDialogClose() {
    this.visibleChange.emit(false); // Update parent
  }

  ngAfterViewInit() {
    setTimeout(() => this.adjustCalendarScale(), 50);
  }

  adjustCalendarScale() {
    const wrapper = document.querySelector('.calendar-scale-wrapper') as HTMLElement | null;
    const calendar = wrapper?.children[0] as HTMLElement | null;

    if (!wrapper || !calendar) return;

    const wrapperHeight = wrapper.clientHeight;
    const calendarHeight = calendar.scrollHeight;

    let scale = wrapperHeight / calendarHeight;

    // Keep scale between 0.65 and 1
    scale = Math.min(1, Math.max(scale, 0.65));

    wrapper.style.setProperty('--cal-scale', scale.toString());
  }

  onDayClick(day: any) {
    const event = day.events?.[0];

    this.selectedForceEvent = event || null;
    this.selectedForceDate = day.date;
    this.forcePopupVisible = true;
  }

  submitForcePresent() {
    if (!this.selectedForceDate) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selected = new Date(this.selectedForceDate);
    selected.setHours(0, 0, 0, 0);

    // Allow only today
    if (selected.getTime() !== today.getTime()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Not allowed',
        detail: 'Force present is allowed only for today.'
      });
      this.forcePopupVisible = false;
      return;
    }
    const attendanceId = this.selectedForceEvent?.meta?.attendanceId || null;

    this.attendanceService.approveAttendance(
      attendanceId,
      'FORCE_PRESENT',
      Number(localStorage.getItem('empId')),
      undefined,
      this.selectedForceDate,
      this.employeeId
    ).subscribe(() => {
      this.forcePopupVisible = false;

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Attendance marked as force present.'
      });

      this.loadCalendar();
    });
  }



}
