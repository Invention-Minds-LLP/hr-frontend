import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

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

  /** The signed-in employee's own comp-off claims. */
  getMyRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests/my`);
  }

  /** The signed-in manager's queue — claims from their reports awaiting stage one. */
  getManagerPending(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests/pending`);
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

  createRequest(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests`, data);
  }

  managerDecide(id: number, approve: boolean, note?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requests/${id}/manager-decide`, { approve, note });
  }

  hrDecide(id: number, approve: boolean, note?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requests/${id}/hr-decide`, { approve, note });
  }

  withdrawRequest(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/requests/${id}`);
  }
}
