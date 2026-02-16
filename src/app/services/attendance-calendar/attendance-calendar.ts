import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

export interface CalendarEventData {
  title: string;
  start: string;
  end?: string;
  type: string;
}


@Injectable({
  providedIn: 'root'
})
export class AttendanceCalendar {
  private baseUrl = environment.apiUrl + '/attendance';
  // private baseUrl = 'http://localhost:3002/api/attendance-calendar';

  constructor(private http: HttpClient) { }

  getCalendarData(employeeId: number, month: string): Observable<CalendarEventData[]> {
    return this.http.get<CalendarEventData[]>(`${this.baseUrl}/${employeeId}?month=${month}`);
  }
  getWeeklyAttendance(employeeId: number, start: Date, end: Date): Observable<any[]> {
    const params = {
      employeeId: employeeId.toString(),
      start: start.toISOString(),
      end: end.toISOString()
    };
    return this.http.get<any[]>(this.baseUrl, { params });
  }
  // approveAttendance(attendanceId: number, decision: string, hrId: number, rejectReason?: string): Observable<any> {
  //   return this.http.post(`${this.baseUrl}/approve`, {
  //     attendanceId,
  //     decision,
  //     hrId,
  //     rejectReason
  //   });
  // }
  approveAttendance(
    attendanceId: number | null,
    decision: string,
    hrId: number,
    reason?: string,
    date?: Date,
    employeeId?: number
  ) {
    return this.http.post(`${this.baseUrl}/approve`, {
      attendanceId,
      decision,
      hrId,
      rejectReason: reason,
      date,
      employeeId
    });
  }
  getAttendance(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  getTodayAttendance() {
    return this.http.get<any[]>(`${this.baseUrl}/today`);
  }

getAttendanceHistory(date: string) {
  return this.http.get<any[]>(
    `${this.baseUrl}/history?date=${date}`
  );
}
getMonthlyRegister(month: string) {
  return this.http.get<any[]>(
    `${this.baseUrl}/register?month=${month}`
  );
}


}
