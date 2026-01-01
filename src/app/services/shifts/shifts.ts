import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class Shifts {
  private apiUrl = environment.apiUrl + '/shifts';
  // private apiUrl = 'http://localhost:3002/api/shifts';

  constructor(private http: HttpClient) { }

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

  // shifts.service.ts
  getRotationPatterns() {
    return this.http.get<any[]>(`${this.apiUrl}/rotation-patterns`);
  }
  assignRotational(body: { employeeId: number; patternId: number; startDate: string }) {
    return this.http.post(`${this.apiUrl}/assign-rotational`, body);
  }
  getEmployeeShifts(params?: any) {
    return this.http.get<any[]>(`${this.apiUrl}/employee-shifts`, { params });
  }

  updateEmployeeShift(assignmentId: number, shiftId: number) {
    return this.http.put(`${this.apiUrl}/employee-shifts/${assignmentId}`, {
      shiftId
    });
  }
  assignFixedShift(body: { employeeId: number; shiftId: number; startDate?: string }) {
    return this.http.post(`${this.apiUrl}/assign-fixed`, body);
  }
createRotationPattern(body: any) {
  return this.http.post<any>(`${this.apiUrl}/rotation-patterns`, body);
}

addRotationItemsBulk(patternId: number, items: any[]) {
  return this.http.post(
    `${this.apiUrl}/rotation-patterns/${patternId}/items/bulk`,
    { items }
  );
}
  getExecutiveShifts() {
    return this.http.get<any[]>(`${this.apiUrl}/manager/shift-templates`);
  }

  // 🔁 Manager rotation patterns
  getManagerPatterns() {
    return this.http.get<any[]>(`${this.apiUrl}/manager/rotation-patterns`);
  }

 getMyEmployees() {
    return this.http.get<any[]>(`${this.apiUrl}/employees`);
  }
}
