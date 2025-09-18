import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private baseUrl = "http://192.168.1.17:3002/api/performance";

  constructor(private http: HttpClient) {}

  getTemplate(departmentId: number, cycle: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/template/${departmentId}/?cycle=${cycle}`);
  }

  submitResponses(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/responses`, payload);
  }

  submitSummary(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/summary`, payload);
  }

  submitFinalReview(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/final-review`, payload);
  }
  getEmployeeForm(employeeId: number, departmentId: number, cycle: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/form/${employeeId}/${departmentId}/?cycle=${cycle}`);
  }
  submitFullForm(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/full-form`, payload);
  }
  getSummaries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/summaries`);
  }
  assignForm(payload: { 
    employeeId?: number; 
    employeeIds?: number[]; 
    departmentId: number; 
    cycle: string; 
    period: string 
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/assign`, payload);
  }
  

}
