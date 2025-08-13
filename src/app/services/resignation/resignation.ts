import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class Resignation {
  private apiUrl = 'http://localhost:3002/api/resignations';

  constructor(private http: HttpClient) {}

  create(body: {
    employeeId: number;
    reason: string;
    additionalNotes?: string;
    noticePeriodDays?: number;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, body);
  }

  list(params: { scope: 'mine'|'manager'|'all'; employeeId?: number; managerId?: number; status?: string }): Observable<any[]> {
    let httpParams = new HttpParams().set('scope', params.scope);
    if (params.employeeId) httpParams = httpParams.set('employeeId', params.employeeId);
    if (params.managerId)  httpParams = httpParams.set('managerId', params.managerId);
    if (params.status)     httpParams = httpParams.set('status', params.status);
    return this.http.get<any[]>(this.apiUrl, { params: httpParams });
  }

  get(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  withdraw(id: number, employeeId: number, reason?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/withdraw`, { employeeId, reason });
  }

  managerApprove(id: number, payload: { note?: string; overrideLastWorkingDay?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/manager-approve`, payload);
  }
  managerReject(id: number, payload: { note?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/manager-reject`, payload);
  }

  hrApprove(id: number, payload: { note?: string; actualLastWorkingDay?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/hr-approve`, payload);
  }
  hrReject(id: number, payload: { note?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/hr-reject`, payload);
  }
  hrCancel(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/cancel`, {});
  }

  addTasks(id: number, tasks: Array<{ title: string; description?: string; assigneeId?: number; dueDate?: string }>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/handover-tasks`, { tasks });
  }
  updateTask(id: number, taskId: number, status: 'OPEN'|'IN_PROGRESS'|'DONE'): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/handover-tasks/${taskId}`, { status });
  }

  upsertClearance(id: number, payload: { type: 'IT'|'FINANCE'|'HR'|'ADMIN'|'SECURITY'|'OTHER'; decision: 'PENDING'|'APPROVED'|'REJECTED'; note?: string; verifierId?: number }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/clearance`, payload);
  }

  scheduleExitInterview(id: number, payload: { scheduledAt?: string; interviewerId?: number; notes?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/exit-interview`, payload);
  }

  setFinalSettlement(id: number, payload: { status: 'DUE'|'PROCESSING'|'PAID'; note?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/final-settlement`, payload);
  }

  markCompleted(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/complete`, {});
  }
}
