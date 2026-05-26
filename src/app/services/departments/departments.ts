import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

export interface Department {
  id?: number;
  name: string;
  // HR-ops planning + appraisal-cycle master fields (management dashboard #18/#19/#20)
  otBudgetHoursPerMonth?: number;
  minDailyStrength?: number;
  appraisalCycleBasis?: string;      // 'DOJ' | 'CALENDAR'
  appraisalPeriodMonths?: number;    // 6 | 12
  appraisalCalendarMonth?: number | null; // 1-12 when basis = CALENDAR
}

@Injectable({
  providedIn: 'root'
})
export class Departments {
  private apiUrl = environment.apiUrl + '/departments';
  // private apiUrl = 'http://localhost:3002/api/departments';

  constructor(private http: HttpClient) {}

  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(this.apiUrl);
  }

  getDepartmentById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.apiUrl}/${id}`);
  }

  createDepartment(department: Department): Observable<Department> {
    return this.http.post<Department>(this.apiUrl, department);
  }

  updateDepartment(id: number, department: Department): Observable<Department> {
    return this.http.put<Department>(`${this.apiUrl}/${id}`, department);
  }

  deleteDepartment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
