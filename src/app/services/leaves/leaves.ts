import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class Leaves {
  private apiUrl = environment.apiUrl + '/leaves';
  // private apiUrl = 'http://localhost:3002/api/leaves'; // adjust base url

  constructor(private http: HttpClient) {}

  createLeave(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getLeaves(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
  getLeaveTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/types`);
  }

  // Create a new leave type
  createLeaveType(name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/types`, { name });
  }

  // updateLeaveStatus(id: number, status: string, userId: number, declineReason?: string): Observable<any> {
  //   return this.http.patch(`${this.apiUrl}/${id}/status`, { status, declineReason, userId });
  // }

  // updateLeaveStatus(
  //   id: number,
  //   status: string,
  //   userId: number,
  //   role: 'MANAGER' | 'HR',
  //   declineReason?: string
  // ): Observable<any> {
  //   return this.http.patch(`${this.apiUrl}/${id}/status`, { status, declineReason, userId, role });
  // }
  
  updateLeaveStatus(
    id: number,
    status: string,
    userId: number,
    role: 'REPORTING_MANAGER' | 'HR_MANAGER' | 'MANAGEMENT',
    declineReason?: string
  ) {
    return this.http.patch(`${this.apiUrl}/${id}/status`, {
      status,
      declineReason,
      userId,
      role
    });
  }
  
  getDashboard(employeeId: number, date = new Date()): Observable<any> {
    const d = date.toISOString().slice(0, 10);
    return this.http.get<any>(`${this.apiUrl}/${employeeId}/dashboard?date=${d}`);
  }

  getWhoIsOnLeaveToday(date = new Date()) {
    const d = date.toISOString().slice(0, 10);
    return this.http.get<{today: any[]; thisWeek: any[]; nextMonth: any[]}>(`${this.apiUrl}/leave-today?date=${d}`);
  }
  
  getBlockedDates(employeeId: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/blocked/${employeeId}`);
  }
  getLeaveBalance(employeeId: number, year: number) {
    return this.http.get(`${this.apiUrl}/balance/${employeeId}?year=${year}`);
  }
  updateLeaveType(
    leaveId: number,
    newLeaveTypeId: number
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-leave-type/${leaveId}`, {
      newLeaveTypeId
    });
  }
}
