import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

/**
 * Manager / HOD dashboard feed.
 *
 * Every endpoint is scoped server-side to the caller's own direct reports —
 * there is no employeeId to pass, and passing one would not widen anything.
 */
@Injectable({ providedIn: 'root' })
export class ManagerService {
  private base = environment.apiUrl + '/manager';
  constructor(private http: HttpClient) {}

  getTeam(): Observable<any> {
    return this.http.get(`${this.base}/team`);
  }
  getTeamSnapshot(): Observable<any> {
    return this.http.get(`${this.base}/team-snapshot`);
  }
  /** Section 1. `period` drives both the tiles and the day strip. */
  getTeamComposition(period: 'current' | 'next' | 'month' = 'current'): Observable<any> {
    return this.http.get(`${this.base}/team-composition?period=${period}`);
  }
  getAttendanceToday(): Observable<any> {
    return this.http.get(`${this.base}/attendance-today`);
  }
  getAttendanceWeekly(weeks = 4): Observable<any> {
    return this.http.get(`${this.base}/attendance-weekly?weeks=${weeks}`);
  }
  getPendingApprovals(): Observable<any> {
    return this.http.get(`${this.base}/pending-approvals`);
  }
  /** Section 2 ticker — unread notifications plus circulars in force. */
  getAlerts(): Observable<any> {
    return this.http.get(`${this.base}/alerts`);
  }
  getPerformanceTrend(weeks = 8): Observable<any> {
    return this.http.get(`${this.base}/performance-trend?weeks=${weeks}`);
  }
  /** Defaults to the current Mon–Sun week when no range is given. */
  getRoster(from?: string, to?: string): Observable<any> {
    const qp: string[] = [];
    if (from) qp.push(`from=${encodeURIComponent(from)}`);
    if (to) qp.push(`to=${encodeURIComponent(to)}`);
    const qs = qp.length ? `?${qp.join('&')}` : '';
    return this.http.get(`${this.base}/roster${qs}`);
  }
}
