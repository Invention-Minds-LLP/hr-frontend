import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

/** One line a department ticks off when somebody leaves. */
export interface ClearanceTemplateItem {
  id?: number;
  departmentId?: number;
  label: string;
  orderNo?: number | null;
}

export interface Department {
  id?: number;
  name: string;
  /** In the organisation-wide clearance list, used by departments with no mapping. */
  isDefaultClearance?: boolean;
  /** When somebody from THIS department leaves, these departments must clear them. */
  clearanceDepartments?: { id: number; name: string }[];
  clearanceDepartmentIds?: number[];
  /** This department's own clearance checklist. */
  clearanceTemplateItems?: ClearanceTemplateItem[];
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

  /** The clearance checklist configured for a department. */
  getClearanceItems(departmentId: number): Observable<ClearanceTemplateItem[]> {
    return this.http.get<ClearanceTemplateItem[]>(`${this.apiUrl}/${departmentId}/clearance-items`);
  }

  /** Replaces the whole checklist, in the order given. */
  saveClearanceItems(departmentId: number, items: ClearanceTemplateItem[]): Observable<ClearanceTemplateItem[]> {
    return this.http.put<ClearanceTemplateItem[]>(`${this.apiUrl}/${departmentId}/clearance-items`, { items });
  }

  deleteDepartment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
