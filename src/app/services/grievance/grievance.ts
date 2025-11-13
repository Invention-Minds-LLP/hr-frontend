import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Grievance {
  private baseUrl = environment.apiUrl + '/grievances';
  // private baseUrl = 'http://localhost:3002/api/grievances'; // 👈 correct base URL

  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, data);
  }
  addComment(grievanceId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${grievanceId}/comment`, data);
  }

  updateStatus(grievanceId: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${grievanceId}/status`, { status });
  }
  createAcknowledgement(data: {
    employeeId: number;
    grievanceId?: number;
    poshCaseId?: number;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/acknowledge`, data);
  }

  // ✅ Get all acknowledgements for employee
  getByEmployee(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/acknowledge/${employeeId}`);
  }

  // ✅ Check if already acknowledged
  checkAcknowledgement(employeeId: number, grievanceId?: number, poshCaseId?: number): Observable<{ acknowledged: boolean }> {
    let params = new HttpParams().set('employeeId', employeeId);
    if (grievanceId) params = params.set('grievanceId', grievanceId);
    if (poshCaseId) params = params.set('poshCaseId', poshCaseId);
    return this.http.get<{ acknowledged: boolean }>(`${this.baseUrl}/acknowledge`, { params });
  }
  getUnacknowledged(employeeId: number): Observable<{ grievances: any[]; poshCases: any[] }> {
    return this.http.get<{ grievances: any[]; poshCases: any[] }>(`${this.baseUrl}/get-unacknowledged/${employeeId}`);
  }
}
