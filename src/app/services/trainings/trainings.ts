import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class Trainings {
  private baseUrl = environment.apiUrl + '/trainings';
  // baseUrl:any = 'http://localhost:3002/api/trainings';
  constructor(private http: HttpClient) {}

// ===============================
  // HR & COMMON
  // ===============================

  /** Get all trainings (HR view) */
  getAllTrainings(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  /** Create new training */
  createTraining(data: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, data);
  }

  /** Assign employees to a training */
  assignEmployees(data: any) {
    return this.http.post( `${this.baseUrl}/assign`, data);
  }

  /**
   * Returns the list of employees the logged-in user is allowed to assign training to.
   * Backend enforces scope: HR=all, Reporting Manager=own reports,
   * Nursing Incharge / Nursing Educator=Nursing dept only. 403 if not allowed at all.
   */
  getAssignableEmployees(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/assignable-employees`);
  }
  

  /** Assign tests to a training */
  assignTests(trainingId: number, testIds: number[]): Observable<any> {
    // you can create a dedicated route later, but for now reuse /assign if needed
    const payload = {
      trainingId,
      testIds,
      assignedBy: Number(localStorage.getItem('userId')) || 1
    };
    return this.http.post(`${this.baseUrl}/assign-tests`, payload);
  }

  /** Get summarized feedback for HR/Admin */
  getFeedbackSummary(trainingId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/feedback/summary/${trainingId}`);
  }

  // ===============================
  // EMPLOYEE
  // ===============================

  /** Get trainings assigned to an employee */
  getTrainingsByEmployee(employeeId: string | number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}?employeeId=${employeeId}`);
  }

  /** Mark a training as completed by employee */
  markCompleted(trainingId: number, employeeId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/complete`, { trainingId, employeeId });
  }

  /** Submit feedback after training */
  submitFeedback(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/feedback`, data);
  }
  updateTraining(id: number, data: any) {
    return this.http.put(`${this.baseUrl}/${id}`, data);
  }

  /** Manually change training status: DRAFT | ACTIVE | COMPLETED | CANCELLED */
  updateTrainingStatus(id: number, status: string) {
    return this.http.patch(`${this.baseUrl}/${id}/status`, { status });
  }

  getTrainingAttendance(trainingId: number) {
    return this.http.get(`${this.baseUrl}/attendance/${trainingId}`);
  }
  
  bulkMarkTrainingAttendance(trainingId: number, data: any) {
    return this.http.post(`${this.baseUrl}/attendance/bulk/${trainingId}`, data);
  }
  
  getAssignedEmployees(trainingId: number) {
    return this.http.get(`${this.baseUrl}/${trainingId}/employees`);
  }
  
  
}
