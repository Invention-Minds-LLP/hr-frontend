import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class TestAttempt {
  private apiUrl = environment.apiUrl + '/test-attempts';
  // private apiUrl = 'http://localhost:3002/api/test-attempts';

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
  submitWithFiles(formData: FormData) {
    return this.http.post(`${this.apiUrl}/submit-files`, formData);
  }
  
  startAttempt(assignedTestId: number) {
    return this.http.post<{ attemptId: number }>(
      `${this.apiUrl}/${assignedTestId}/start`, {}
    );
  }
  saveReview(attemptId: number, scores: any[], finalScore: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${attemptId}/review`, {
      scores,
      finalScore
    });
  }
  evaluateAttempt(attemptId: number, evaluations: any[]) {
    return this.http.post<any>(`${this.apiUrl}/evaluate`, {
      attemptId,
      evaluations
    });
  }
  
}
