import { Component, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { AutoComplete } from 'primeng/autocomplete';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Employees } from '../../services/employees/employees';
import { LeavePopup } from '../../leaves/leave-popup/leave-popup';
import { WfhPopup } from '../../leaves/wfh-popup/wfh-popup';
import { PermissionPopup } from '../../leaves/permission-popup/permission-popup';
import { Holiday, Holidays } from '../../services/holidays/holidays';
import { CarouselModule } from 'primeng/carousel';
import { finalize } from 'rxjs';
import { ResignationForm } from "../../resignation/resignation-form/resignation-form";
import { GrievanceList } from "../../grievance/grievance-list/grievance-list";
import { PoshList } from "../../posh/posh-list/posh-list";
import { Tooltip } from 'primeng/tooltip';
import { MyTests } from "../../evaluation/my-tests/my-tests";

interface individual {
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}


interface AttendanceDay {
  dayName: string;
  totalHours?: string;
  status?: 'Leave' | 'Day Off' | 'Present' | 'Empty';
}

// put this in your component class
type LeaveTypeCount = { label: string; count: number };

@Component({
  selector: 'app-individual',
  imports: [TableModule, CommonModule, ButtonModule, LeavePopup, WfhPopup,
     PermissionPopup, FormsModule, FormsModule, CarouselModule, ResignationForm,
      GrievanceList, PoshList, Tooltip,MyTests],
  templateUrl: './individual.html',
  styleUrl: './individual.css'
})
export class Individual {

  leave: any[] = []
  permission: any[] = []
  wfh: any[] = []
  // Leave
  showLeaveDetailsPopup = false;
  selectedLeaveForView: any = null;
  leaveViewMode = false;

  // Permission
  showPermissionPopup = false;
  selectedPermission: any = null;
  permissionViewMode = false;

  // WFH
  showWFHPopup = false;
  selectedWFH: any = null;
  wfhViewMode = false;

  // Holidays
  nearestHoliday: { name: string; date: Date } | null = null;
  holidayDates: { name: string; date: Date }[] = [];
  allHolidays: { name: string; date: string }[] = [];

  currentIndex = 0;
  noHolidaysMessage: string = '';
  year = new Date().getFullYear();

  leaveByTypeToday: LeaveTypeCount[] = [
    { label: 'Sick Leave', count: 3 },
    { label: 'Casual Leave', count: 2 },
    { label: 'Earned Leave', count: 1 },
    // { label: 'Maternity', count: 0 },
    // { label: 'Comp Off', count: 1 },
  ];




  constructor(private employeeService: Employees) { }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }


  today = new Date();
  selectedDate = new Date();
  weekDays: { day: string, date: Date, status: 'present' | 'absent' | 'none' | 'holiday' }[] = [];

  shiftName = 'Shift – Morning';
  weekStart!: Date;
  weekEnd!: Date;


  attendanceData: AttendanceDay[] = [];
  birthday: any[] = [];
  anniversary: any[] = [];
  loadingToday: boolean= false;

  // Attendance-card 
  attendanceRecords: { date: string, status: 'present' | 'absent' }[] = [
    { date: '2025-08-09', status: 'present' },
    { date: '2025-08-05', status: 'absent' },
    { date: '2025-08-03', status: 'present' },
    { date: '2025-08-04', status: 'present' }
  ];


  // Working-Card
  rawAttendance: { date: string; login?: string; logout?: string; status: 'Present' | 'Leave' | 'Day Off' }[] = [
    { date: '2025-08-04', login: '10:00 AM', logout: '03:50 PM', status: 'Present' },
    { date: '2025-08-05', status: 'Leave' },
    { date: '2025-08-06', login: '09:15 AM', logout: '05:17 PM', status: 'Present' },
    { date: '2025-08-07', login: '09:00 AM', logout: '05:20 PM', status: 'Present' },
    { date: '2025-08-09', login: '08:50 AM', logout: '06:20 PM', status: 'Present' },
    { date: '2025-08-10', status: 'Day Off' },
  ];

  employee: any = null;

  ngOnInit() {
    this.generateWeekDays();
    this.fetchDetails();
    this.loadToday();

    this.setWeek(new Date());
    this.loadHolidays(this.year);
    const employeeId = Number(localStorage.getItem('empId'));
    if (employeeId) {
      this.employeeService.getEmployeeById(employeeId).subscribe({
        next: (res) => {
          this.employee = res;
        },
        error: (err) => {
          console.error('Error fetching employee:', err);
        }
      });
    }
  }
  loadToday(): void {
 

    this.employeeService.getToday()
      .pipe(finalize(() => (this.loadingToday = false)))
      .subscribe({
        next: ({ birthdays, anniversaries }: any) => {
          this.birthday = birthdays ?? [];
          console.log(this.birthday)
          this.anniversary = anniversaries ?? [];
        },
        error: (err) => {
          console.error('getToday failed', err);
          // this.errorToday = "Couldn't load today's celebrants.";
          this.birthday = [];
          this.anniversary = [];
        },
      });
  }
  trackById(_i: number, item: { employeeId: number }) {
    return item.employeeId;
  }

  // Holidays
  loadHolidays(year: number) {

    const calendarId = 'en.indian#holiday@group.v.calendar.google.com';
    const apiKey = 'AIzaSyC10pxMOv55Jq8XkkDuJ_WAWG4AUUZVX9g';
    const today = new Date();
    const startDate = `${today.getFullYear()}-01-01`;
    const endDate = `${today.getFullYear()}-12-31`;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${startDate}T00:00:00Z&timeMax=${endDate}T23:59:59Z&singleEvents=true&orderBy=startTime`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        this.allHolidays = data.items.map((item: any) => ({
          name: item.summary,
          date: item.start.date
        }));

        // Find nearest holiday
        const today = new Date();
        const futureHolidays = this.allHolidays
          .map(h => ({ ...h, time: new Date(h.date).getTime() }))
          .filter(h => h.time >= today.getTime())
          .sort((a, b) => a.time - b.time);

        if (futureHolidays.length) {
          this.allHolidays = futureHolidays;
          this.updateHolidayList(); // only our new method
        }

      });
  }

  updateHolidayList() {
    const today = new Date();

    // Keep only upcoming holidays
    this.holidayDates = this.allHolidays
      .filter(h => new Date(h.date).getTime() >= today.getTime())
      .map(h => ({
        name: h.name,
        date: new Date(h.date)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (this.holidayDates.length === 0) {
      this.noHolidaysMessage = "No upcoming holidays!";
      this.currentIndex = 0;
    } else {
      this.noHolidaysMessage = "";
      this.currentIndex = 0; // start from nearest
      this.nearestHoliday = this.holidayDates[0];
    }
  }
  nextHoliday() {
    if (this.currentIndex < this.holidayDates.length - 1) {
      this.currentIndex++;
      this.nearestHoliday = this.holidayDates[this.currentIndex];
    }
  }

  prevHoliday() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.nearestHoliday = this.holidayDates[this.currentIndex];
    }
  }

  




  fetchDetails() {
    const employeeId = Number(localStorage.getItem('empId')); // make sure this is the numeric Employee.id
    if (!employeeId) return;

    this.employeeService.getEmployeeRequests(employeeId).subscribe({
      next: (res) => {
        this.leave = (res.leaves ?? []).map(r => {
          const isRange = !!(r.startDate && r.endDate);
          return {
            ...r,
            leaveType: r.leaveType.name,
            isRange,
            dates: isRange ? getDateRangeArray(r.startDate, r.endDate) : [toDDMMYYYY(r.startDate)],
            status: r.status
          };
        });

        this.wfh = (res.wfh ?? []).map(r => {
          const isRange = !!(r.startDate && r.endDate);
          return {
            ...r,
            isRange,
            dates: isRange ? getDateRangeArray(r.startDate, r.endDate) : [toDDMMYYYY(r.startDate)],
            status: r.status
          };
        });
        this.permission = (res.permissions ?? []).map(r => ({
          ...r,
          date: toDDMMYYYY(r.day),                    // permissions use single "day"
          status: r.status
        }));
      },
      error: (err) => console.error(err)
    });

    this.setWeek(new Date());
    // tiny helpers:
    function toDDMMYYYY(value: string): string {
      if (!value) return '-';
      const d = new Date(value);
      if (isNaN(d.getTime())) return '-';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    function rangeOrDate(start?: string, end?: string): string {
      if (start && end) return `${toDDMMYYYY(start)} — ${toDDMMYYYY(end)}`;
      if (start) return toDDMMYYYY(start);
      return '-';
    }
    function getDateRangeArray(start: string, end: string): string[] {
      const result: string[] = [];
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Loop until we reach end date
      let current = new Date(startDate);
      while (current <= endDate) {
        const dd = String(current.getDate()).padStart(2, '0');
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const yyyy = current.getFullYear();
        result.push(`${dd}-${mm}-${yyyy}`);
        current.setDate(current.getDate() + 1);
      }
      return result;
    }

  }



  // Attendance-card 

  generateWeekDays() {
    const startOfWeek = this.getMonday(new Date(this.selectedDate));
    this.weekDays = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);

      let status: 'present' | 'absent' | 'holiday' | 'none' = 'none';

      // Sunday is always holiday
      if (day.getDay() === 0) {
        status = 'holiday';
      } else {
        const record = this.attendanceRecords.find(r =>
          new Date(r.date).toDateString() === day.toDateString()
        );

        if (record) {
          status = record.status;
        } else if (day > this.today) {
          status = 'none'; // Future days stay empty
        } else {
          status = 'absent';
        }
      }

      this.weekDays.push({
        day: day.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        date: day,
        status
      });
    }
  }


  getMonday(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  goToPreviousDay() {
    const prev = new Date(this.selectedDate);
    prev.setDate(prev.getDate() - 1);
    this.selectedDate = prev;
    this.generateWeekDays();
  }

  goToNextDay() {
    if (!this.isToday(this.selectedDate)) {
      const next = new Date(this.selectedDate);
      next.setDate(next.getDate() + 1);
      this.selectedDate = next;
      this.generateWeekDays();
    }
  }

  isToday(date: Date): boolean {
    return date.toDateString() === this.today.toDateString();
  }

  weekData: {
    dayName: string;
    displayText: string;
    statusClass: string;
  }[] = [];


  // Working-Card

  setWeek(referenceDate: Date) {
    const start = this.getMonday(referenceDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    this.weekStart = start;
    this.weekEnd = end;

    this.attendanceData = [];

    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);

      const record = this.rawAttendance.find(r =>
        new Date(r.date).toDateString() === current.toDateString()
      );

      if (record) {
        if (record.status === 'Present' && record.login && record.logout) {
          const total = this.calculateTotalHours(record.login, record.logout);
          this.attendanceData.push({
            dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
            totalHours: total,
            status: 'Present'
          });
        } else {
          this.attendanceData.push({
            dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
            status: record.status
          });
        }
      } else {
        this.attendanceData.push({
          dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
          status: current.getDay() === 0 ? 'Day Off' : 'Leave'
        });
      }
    }
  }

  isCurrentWeek(): boolean {
    const today = new Date();
    return today >= this.weekStart && today <= this.weekEnd;
  }


  calculateTotalHours(login: string, logout: string) {
    const [loginHour, loginMin] = login.replace(/AM|PM/, '').trim().split(':').map(Number);
    const [logoutHour, logoutMin] = logout.replace(/AM|PM/, '').trim().split(':').map(Number);
    const loginDate = new Date(0, 0, 0, /PM/.test(login) && loginHour !== 12 ? loginHour + 12 : loginHour, loginMin);
    const logoutDate = new Date(0, 0, 0, /PM/.test(logout) && logoutHour !== 12 ? logoutHour + 12 : logoutHour, logoutMin);
    const diffMs = logoutDate.getTime() - loginDate.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    return `${hours.toString().padStart(2, '0')} hrs ${minutes.toString().padStart(2, '0')} mins`;
  }

  previousWeek() {
    const prevWeek = new Date(this.weekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    this.setWeek(prevWeek);
  }

  nextWeek() {
    const nextWeek = new Date(this.weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.setWeek(nextWeek);
  }
  openLeaveForm() {
    this.leaveViewMode = false;
    this.selectedLeaveForView = null; // no data for new form
    this.showLeaveDetailsPopup = true;
  }

  openPermissionForm() {
    this.permissionViewMode = false;
    this.selectedPermission = null;
    this.showPermissionPopup = true;
  }

  openWFHForm() {
    this.wfhViewMode = false;
    this.selectedWFH = null;
    this.showWFHPopup = true;
  }
  viewLeaveDetails(row: any) {
    this.leaveViewMode = true;
    this.selectedLeaveForView = row;
    this.showLeaveDetailsPopup = true;
  }

  viewPermissionDetails(row: any) {
    this.permissionViewMode = true;
    this.selectedPermission = row;
    this.showPermissionPopup = true;
  }

  viewWFHDetails(row: any) {
    this.wfhViewMode = true;
    this.selectedWFH = row;
    this.showWFHPopup = true;
  }

  closePopup() {
    this.showLeaveDetailsPopup = false;
    this.showPermissionPopup = false;
    this.showWFHPopup = false;
    this.fetchDetails();
  }
}



