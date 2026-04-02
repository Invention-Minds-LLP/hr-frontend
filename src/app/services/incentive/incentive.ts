import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({ providedIn: 'root' })
export class IncentiveService {
  private apiUrl = environment.apiUrl + '/incentives';
  constructor(private http: HttpClient) {}

  getAll(params?: any): Observable<any[]> {
    let p = new HttpParams();
    if (params?.employeeId) p = p.set('employeeId', params.employeeId);
    if (params?.status) p = p.set('status', params.status);
    if (params?.type) p = p.set('type', params.type);
    if (params?.source) p = p.set('source', params.source);
    return this.http.get<any[]>(this.apiUrl, { params: p });
  }

  getTeamIncentives(managerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/team`, { params: { managerId } });
  }

  create(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  request(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/request`, data);
  }

  update(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
