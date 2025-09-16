import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private baseUrl = "http://localhost:3002/api/performance";

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
}
