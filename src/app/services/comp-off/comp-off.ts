import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

/** The manager's two queues: approve the claim, then confirm the day was worked. */
export interface CompOffPendingResponse {
  awaitingApproval: any[];
  awaitingConfirmation: any[];
  counts: { awaitingApproval: number; awaitingConfirmation: number };
}

/**
 * The employee's own claims, with the month's entitlement. The allowance comes
 * from the server because credits HR granted directly count toward it, and the
 * client never sees those.
 */
export interface MyCompOffResponse {
  maxPerMonth: number;
  month: { start: string; end: string; used: number; remaining: number };
  requests: any[];
}

@Injectable({ providedIn: 'root' })
export class CompOffService {
  private apiUrl = environment.apiUrl + '/comp-off';
  constructor(private http: HttpClient) {}

  getCredits(params?: any): Observable<any[]> {
    let p = new HttpParams();
    if (params?.employeeId) p = p.set('employeeId', params.employeeId);
    if (params?.status) p = p.set('status', params.status);
    return this.http.get<any[]>(this.apiUrl, { params: p });
  }

  create(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // ── Requests (manager → HR approval flow) ────────────────────────────────

  /**
   * The signed-in employee's own comp-off claims, plus this month's allowance.
   * `month` is any date inside the month to report on; omit for the current one.
   */
  getMyRequests(month?: string): Observable<MyCompOffResponse> {
    const url = `${this.apiUrl}/requests/my`;
    return this.http.get<MyCompOffResponse>(month ? `${url}?month=${month}` : url);
  }

  /**
   * The signed-in manager's queue, split by the question each row asks: may the
   * claim stand, and was the day actually worked.
   */
  getManagerPending(): Observable<CompOffPendingResponse> {
    return this.http.get<CompOffPendingResponse>(`${this.apiUrl}/requests/pending`);
  }

  /** HR's queue — manager-approved claims awaiting the credit. */
  getHrPending(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests/hr-pending`);
  }

  /** All requests, for the HR register. */
  getRequests(params?: any): Observable<any[]> {
    let p = new HttpParams();
    if (params?.status) p = p.set('status', params.status);
    if (params?.employeeId) p = p.set('employeeId', params.employeeId);
    return this.http.get<any[]>(`${this.apiUrl}/requests`, { params: p });
  }

  /** HR raising a claim on someone else's behalf. */
  createRequest(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests`, data);
  }

  /** The signed-in employee claiming their own comp-off. */
  createMyRequest(data: { workDate: string; reason: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/mine`, data);
  }

  managerDecide(id: number, approve: boolean, note?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requests/${id}/manager-decide`, { approve, note });
  }

  /** Stage two — confirms the day was worked, and on what basis. */
  confirm(id: number, worked: boolean, workedMinutes?: number, note?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requests/${id}/confirm`, { worked, workedMinutes, note });
  }

  hrDecide(id: number, approve: boolean, note?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requests/${id}/hr-decide`, { approve, note });
  }

  withdrawRequest(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/requests/${id}`);
  }
}
