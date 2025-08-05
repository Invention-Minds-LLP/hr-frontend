import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Shifts {
  private apiUrl = 'http://localhost:3002/api/shifts';

  constructor(private http: HttpClient) {}

  /* ==========================
     SHIFT TEMPLATE METHODS
     ========================== */

  // Create Shift Template
  createShiftTemplate(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/templates`, data);
  }

  // Get All Shift Templates
  getShiftTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/templates`);
  }

  // Get Single Shift Template by ID
  getShiftTemplateById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/templates/${id}`);
  }

  // Update Shift Template
  updateShiftTemplate(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/templates/${id}`, data);
  }

  // Delete Shift Template
  deleteShiftTemplate(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/templates/${id}`);
  }

  /* ==========================
     SHIFT ASSIGNMENT METHODS
     ========================== */

  // Assign Shift to Employee
  assignShift(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/assignments`, data);
  }

  // Get All Shift Assignments
  getShiftAssignments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/assignments`);
  }

  // Get Assignments by Employee
  getAssignmentsByEmployee(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/assignments/employee/${employeeId}`);
  }

  // Update Shift Assignment (acknowledge or modify)
  updateShiftAssignment(id: number, data: Partial<any>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/assignments/${id}`, data);
  }

  // Delete Shift Assignment
  deleteShiftAssignment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/assignments/${id}`);
  }
}
