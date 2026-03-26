import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({ providedIn: 'root' })
export class ForcePresentService {
  private baseUrl = environment.apiUrl + '/force-present';

  constructor(private http: HttpClient) {}

  markForcePresent(payload: {
    employeeId: number;
    date: string;
    reason: string;
    createCompOff: boolean;
  }): Observable<any> {
    return this.http.post(this.baseUrl, payload);
  }

  getList(page = 1, limit = 20, employeeId?: number): Observable<any> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);
    if (employeeId) params = params.set('employeeId', employeeId);
    return this.http.get<any>(this.baseUrl, { params });
  }

  getApprovedLeavesOnDate(employeeId: number, date: string): Observable<any[]> {
    const params = new HttpParams()
      .set('employeeId', employeeId)
      .set('date', date);
    return this.http.get<any[]>(`${this.baseUrl}/preview`, { params });
  }
}
