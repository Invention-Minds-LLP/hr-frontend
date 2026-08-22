import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private baseUrl = environment.apiUrl + '/performance';

  constructor(private http: HttpClient) {}

  getTemplate(departmentId: number, cycle: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/template/${departmentId}/?cycle=${cycle}`);
  }

  listTemplates(departmentId: number, cycle?: string): Observable<any[]> {
    let params = new HttpParams().set('departmentId', String(departmentId));
    if (cycle) params = params.set('cycle', cycle);
    return this.http.get<any[]>(`${this.baseUrl}/templates`, { params });
  }

  // No `cycle` — templates are per-department question sets, valid for every
  // cycle. The backend stamps its TEMPLATE_CYCLE_ANY constant on new rows.
  createTemplate(payload: {
    departmentId: number;
    title: string;
    questions: Array<{ category: string; section?: string | null; text: string; orderNo: number; weight?: number | null }>;
    scoreBands?: Array<{ label: string; minPercent: number }>;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/template`, payload);
  }

  /**
   * The printed sheet. `tenure` spans every cycle — the five columns of the
   * paper form; `cycle` covers just the one.
   */
  downloadSheet(employeeId: number, scope: 'cycle' | 'tenure', cycle?: string): Observable<Blob> {
    let params = new HttpParams().set('scope', scope);
    if (scope === 'cycle' && cycle) params = params.set('cycle', cycle);
    return this.http.get(`${this.baseUrl}/export/${employeeId}`, { params, responseType: 'blob' });
  }

  getTemplateDetail(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/template-detail/${id}`);
  }

  updateTemplate(id: number, payload: {
    title?: string;
    questions?: Array<{ category: string; section?: string | null; text: string; orderNo: number; weight?: number | null }>;
    scoreBands?: Array<{ label: string; minPercent: number }>;
  }): Observable<any> {
    return this.http.patch(`${this.baseUrl}/template/${id}`, payload);
  }

  deleteTemplate(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/template/${id}`);
  }

  /**
   * Copy a template's questions, groupings, weights and score bands into a new
   * one — optionally under a different department. The copy has no responses,
   * so it is editable even when the original is locked.
   */
  cloneTemplate(id: number, payload: { departmentId?: number; title?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/template/${id}/clone`, payload);
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

  getEmployeeForm(employeeId: number, departmentId: number, cycle: string, templateId?: number): Observable<any> {
    let params = new HttpParams().set('cycle', cycle);
    if (templateId) params = params.set('templateId', String(templateId));
    return this.http.get(`${this.baseUrl}/form/${employeeId}/${departmentId}`, { params });
  }

  submitFullForm(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/full-form`, payload);
  }

  getSummaries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/summaries`);
  }

  /**
   * Cycles derived from the employee's DOJ + their department's configured
   * basis. FIRST_YEAR carries all four probation milestones in one cycle;
   * RECURRING carries a single annual review per cycle.
   */
  getEmployeeCycles(employeeId: number): Observable<{
    employeeId: number;
    dateOfJoining: string;
    pausedDays: number;
    /** Used when a row's stored cycle matches no plan below. */
    fallbackMilestones: Record<string, string>;
    department: { id: number; name: string; basis: string; periodMonths: number; calendarMonth: number | null } | null;
    plans: Array<{
      track: 'FIRST_YEAR' | 'RECURRING';
      cycle: string;
      startDate: string;
      endDate: string;
      /** `label` is what to display — recurring reviews all store YEAR_1, so a
       *  second-year review carries label "2nd Year". Never show `period`. */
      periods: Array<{ period: string; milestoneDate: string; reached: boolean; label: string }>;
    }>;
  }> {
    const params = new HttpParams().set('employeeId', String(employeeId));
    return this.http.get<any>(`${this.baseUrl}/cycles`, { params });
  }

  // The cycle is derived server-side from each employee's DOJ — it is never
  // sent from here. FIRST_YEAR creates all four rows in one call.
  assignForm(payload: {
    employeeId?: number;
    employeeIds?: number[];
    track: 'FIRST_YEAR' | 'RECURRING';
    cycle?: string;
    templateId: number;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/assign`, payload);
  }

  // Retro-fit a template onto a summary row that was created before
  // templateId became required. Backend refuses if responses exist.
  assignSummaryTemplate(summaryId: number, templateId: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/summary/${summaryId}/template`, { templateId });
  }
}
