import { Component, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { AutoComplete } from 'primeng/autocomplete';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';

interface individual {
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}


interface AttendanceDay {
  dayName: string;
  totalHours?: string;
  status?: 'Leave' | 'Day Off' | 'Present' | 'Empty';
}


@Component({
  selector: 'app-individual',
  imports: [TableModule, CommonModule, ButtonModule],
  templateUrl: './individual.html',
  styleUrl: './individual.css'
})
export class Individual {

  leave: individual[] = [

    { date: '03-08-2025', status: 'Approved' },
    { date: '03-08-2025', status: 'Rejected' },
    { date: '03-08-2025', status: 'Approved' },
    { date: '03-08-2025', status: 'Pending' },
    { date: '03-08-2025', status: 'Rejected' },
  ]
  permission: individual[] = [

    { date: '03-08-2025', status: 'Approved' },
    { date: '03-08-2025', status: 'Rejected' },
    { date: '03-08-2025', status: 'Approved' },
    { date: '03-08-2025', status: 'Pending' },
    { date: '03-08-2025', status: 'Rejected' },
  ]
  wfh: individual[] = [

    { date: '03-08-2025', status: 'Approved' },
    { date: '03-08-2025', status: 'Rejected' },
    { date: '03-08-2025', status: 'Approved' },
    { date: '03-08-2025', status: 'Pending' },
    { date: '03-08-2025', status: 'Rejected' },
  ]


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

  ngOnInit() {
    this.generateWeekDays();
    this.setWeek(new Date());
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
}



