import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Entitles {
  private baseUrl = 'http://localhost:3002/api/entitle'; // Adjust if needed

  constructor(private http: HttpClient) {}

  getAllEntitlementPolicies(): Observable<any> {
    return this.http.get(`${this.baseUrl}`);
  }

  getEntitlementPolicyByYear(year: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${year}`);
  }

  getEmployeeUsageSummary(): Observable<any> {
    return this.http.get(`${this.baseUrl}/employee-usage-summary`);
  }

  getEmployeeRequests(employeeId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${employeeId}/requests`);
  }
}
