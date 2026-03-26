import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({ providedIn: 'root' })
export class HrCorrectionsService {
  private base = environment.apiUrl + '/hr-corrections';

  constructor(private http: HttpClient) {}

  // ── Punch Correction ────────────────────────────────────────────────────

  correctPunch(payload: {
    employeeId: number;
    date: string;
    correctedIn?: string;
    correctedOut?: string;
    reason: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/punch`, payload);
  }

  getPunchList(page = 1, limit = 20, employeeId?: number): Observable<any> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (employeeId) params = params.set('employeeId', employeeId);
    return this.http.get<any>(`${this.base}/punch`, { params });
  }

  // ── Leave Balance Adjustment ─────────────────────────────────────────────

  adjustLeaveBalance(payload: {
    employeeId: number;
    leaveTypeId: number;
    year: number;
    adjustType: 'CREDIT' | 'DEBIT';
    days: number;
    reason: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/leave-balance`, payload);
  }

  getBalanceAdjustmentList(page = 1, limit = 20, employeeId?: number): Observable<any> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (employeeId) params = params.set('employeeId', employeeId);
    return this.http.get<any>(`${this.base}/leave-balance`, { params });
  }

  // ── Attendance Override ──────────────────────────────────────────────────

  overrideAttendance(payload: {
    employeeId: number;
    date: string;
    newStatus: string;
    reason: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/attendance-override`, payload);
  }

  getAttendanceOverrideList(page = 1, limit = 20, employeeId?: number): Observable<any> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (employeeId) params = params.set('employeeId', employeeId);
    return this.http.get<any>(`${this.base}/attendance-override`, { params });
  }

  // ── Permission Override ──────────────────────────────────────────────────

  grantPermission(payload: {
    employeeId: number;
    day: string;
    permissionType: string;
    timing: string;
    startTime?: string;
    endTime?: string;
    reason: string;
    deductBalance: boolean;
  }): Observable<any> {
    return this.http.post(`${this.base}/permission`, payload);
  }

  getPermissionOverrideList(page = 1, limit = 20, employeeId?: number): Observable<any> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (employeeId) params = params.set('employeeId', employeeId);
    return this.http.get<any>(`${this.base}/permission`, { params });
  }

  // ── Comp-Off Manual Grant ────────────────────────────────────────────────

  grantCompOff(payload: {
    employeeId: number;
    workDate: string;
    expiryDate?: string;
    reason: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/comp-off`, payload);
  }

  getCompOffGrantList(page = 1, limit = 20, employeeId?: number): Observable<any> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (employeeId) params = params.set('employeeId', employeeId);
    return this.http.get<any>(`${this.base}/comp-off`, { params });
  }

  // ── OT Manual Entry ──────────────────────────────────────────────────────

  manualOTEntry(payload: {
    employeeId: number;
    date: string;
    hours: number;
    scheduledEndTime?: string;
    reason: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/ot`, payload);
  }

  getOTManualEntryList(page = 1, limit = 20, employeeId?: number): Observable<any> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (employeeId) params = params.set('employeeId', employeeId);
    return this.http.get<any>(`${this.base}/ot`, { params });
  }

  // ── Week-off / Holiday Override ──────────────────────────────────────────

  weekOffHolidayOverride(payload: {
    employeeId: number;
    date: string;
    overrideType: 'GRANT_WEEK_OFF' | 'GRANT_HOLIDAY' | 'MARK_WORKING';
    reason: string;
    autoCompOff?: boolean;
  }): Observable<any> {
    return this.http.post(`${this.base}/weekoff-holiday`, payload);
  }

  getWeekOffHolidayOverrideList(page = 1, limit = 20, employeeId?: number): Observable<any> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (employeeId) params = params.set('employeeId', employeeId);
    return this.http.get<any>(`${this.base}/weekoff-holiday`, { params });
  }

  // ── Appraisal Override ───────────────────────────────────────────────────

  searchAppraisals(employeeId: number): Observable<any[]> {
    const params = new HttpParams().set('employeeId', employeeId);
    return this.http.get<any[]>(`${this.base}/appraisals/search`, { params });
  }

  appraisalOverride(payload: {
    appraisalFormId: number;
    overallScore?: number;
    finalDecision?: string;
    status?: string;
    finalComments?: string;
    reason: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/appraisals/override`, payload);
  }

  getAppraisalOverrideList(page = 1, limit = 20, employeeId?: number): Observable<any> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (employeeId) params = params.set('employeeId', employeeId);
    return this.http.get<any>(`${this.base}/appraisals/override`, { params });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getLeaveTypes(): Observable<{ id: number; name: string }[]> {
    return this.http.get<{ id: number; name: string }[]>(`${this.base}/leave-types`);
  }
}
