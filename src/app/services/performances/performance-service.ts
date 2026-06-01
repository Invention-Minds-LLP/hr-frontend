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

  createTemplate(payload: {
    departmentId: number;
    cycle: string;
    title: string;
    questions: Array<{ category: string; text: string; orderNo: number; weight?: number | null }>;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/template`, payload);
  }

  getTemplateDetail(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/template-detail/${id}`);
  }

  updateTemplate(id: number, payload: {
    title?: string;
    questions?: Array<{ category: string; text: string; orderNo: number; weight?: number | null }>;
  }): Observable<any> {
    return this.http.patch(`${this.baseUrl}/template/${id}`, payload);
  }

  deleteTemplate(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/template/${id}`);
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

  assignForm(payload: {
    employeeId?: number;
    employeeIds?: number[];
    departmentId: number;
    cycle: string;
    period: string;
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
