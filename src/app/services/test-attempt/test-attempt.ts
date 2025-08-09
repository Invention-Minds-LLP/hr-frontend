import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TestAttempt {
  private apiUrl = 'http://localhost:3002/api/test-attempts';

  constructor(private http: HttpClient) {}

  // Fetch test + questions for the given assignment
  getDetails(assignedTestId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${assignedTestId}`);
  }

  // Optional: get all assigned tests for an employee
  getForEmployee(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/employee/${employeeId}`);
  }
  submit(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/submit`, payload);
  }
}
