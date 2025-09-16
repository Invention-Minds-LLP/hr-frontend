import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Leaves {
  private apiUrl = 'http://192.168.1.15:3002/api/leaves'; // adjust base url

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

  updateLeaveStatus(
    id: number,
    status: string,
    userId: number,
    role: 'MANAGER' | 'HR',
    declineReason?: string
  ): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status, declineReason, userId, role });
  }
  

  getDashboard(employeeId: number, date = new Date()): Observable<any> {
    const d = date.toISOString().slice(0, 10);
    return this.http.get<any>(`${this.apiUrl}/${employeeId}/dashboard?date=${d}`);
  }

  getWhoIsOnLeaveToday(date = new Date()) {
    const d = date.toISOString().slice(0, 10);
    return this.http.get<{today: any[]; thisWeek: any[]; nextMonth: any[]}>(`${this.apiUrl}/leave-today?date=${d}`);
  }
  
}
