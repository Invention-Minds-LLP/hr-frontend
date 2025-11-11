import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarModule, DateAdapter, CalendarEvent } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { AttendanceCalendar } from '../../services/attendance-calendar/attendance-calendar';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-attendance-calendars',
  imports: [CommonModule,
    CalendarModule
  ],
  templateUrl: './attendance-calendars.html',
  styleUrl: './attendance-calendars.css'
})
export class AttendanceCalendars {
  viewDate: Date = new Date();
  events: CalendarEvent[] = [];
  employeeId = 1; // example; replace with logged-in user’s ID

  constructor(private service: AttendanceCalendar) { }

  ngOnInit(): void {
    this.loadCalendar();
  }

  loadCalendar(): void {
    const month = this.viewDate.toISOString().slice(0, 7); // YYYY-MM
    this.service.getCalendarData(this.employeeId, month).subscribe(data => {
      this.events = data.map(item => ({
        title: item.title,
        start: new Date(item.start),
        end: item.end ? new Date(item.end) : new Date(item.start),
        color: this.getColor(item.type)
      }));
    });
  }

  getColor(type: string) {
    switch (type) {
      case 'attendance': return { primary: '#4caf50', secondary: '#c8e6c9' };
      case 'leave': return { primary: '#f44336', secondary: '#ffcdd2' };
      case 'permission': return { primary: '#ff9800', secondary: '#ffe0b2' };
      default: return { primary: '#9e9e9e', secondary: '#eeeeee' };
    }
  }
}
