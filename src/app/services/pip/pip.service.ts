import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({ providedIn: 'root' })
export class PipService {
  private apiUrl = environment.apiUrl + '/pip';
  constructor(private http: HttpClient) {}

  // ── Templates ──────────────────────────────────────────────────────────────
  getTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/templates`);
  }
  createTemplate(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/templates`, data);
  }
  updateTemplate(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/templates/${id}`, data);
  }
  deleteTemplate(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/templates/${id}`);
  }
  seedDefaultTemplates(): Observable<any> {
    return this.http.post(`${this.apiUrl}/templates/seed`, {});
  }

  // ── Monitoring ─────────────────────────────────────────────────────────────
  getUnderperformers(month?: string): Observable<any[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<any[]>(`${this.apiUrl}/underperformers`, { params });
  }

  // ── Email ──────────────────────────────────────────────────────────────────
  previewEmail(templateId: number, employeeId: number, triggerScore?: number, pipId?: number): Observable<{ subject: string; body: string }> {
    let params = new HttpParams()
      .set('templateId', templateId)
      .set('employeeId', employeeId);
    if (triggerScore !== undefined) params = params.set('triggerScore', triggerScore);
    if (pipId) params = params.set('pipId', pipId);
    return this.http.get<{ subject: string; body: string }>(`${this.apiUrl}/preview-email`, { params });
  }
  sendWarning(data: { employees: { employeeId: number; triggerScore: number }[]; templateId: number; triggerMonth: string; sentBy: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-warning`, data);
  }

  // ── PIP Lifecycle ──────────────────────────────────────────────────────────
  initiatePIP(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/initiate`, data);
  }
  getPIPList(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) Object.keys(filters).forEach(k => { if (filters[k]) params = params.set(k, filters[k]); });
    return this.http.get<any[]>(`${this.apiUrl}/list`, { params });
  }
  getPIPDetail(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
  addWeeklyReview(pipId: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${pipId}/weekly-review`, data);
  }
  closePIP(pipId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${pipId}/close`, data);
  }
  extendPIP(pipId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${pipId}/extend`, data);
  }
  terminatePIP(pipId: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${pipId}/terminate`, data);
  }

  // ── Email Logs ─────────────────────────────────────────────────────────────
  getEmailLogs(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) Object.keys(filters).forEach(k => { if (filters[k]) params = params.set(k, filters[k]); });
    return this.http.get<any[]>(`${this.apiUrl}/email-logs`, { params });
  }

  // ── PIP Responses ──────────────────────────────────────────────────────────
  getEmployeePIPHistory(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/employee/${employeeId}/history`);
  }
  getPIPResponses(pipId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${pipId}/responses`);
  }
  logManualResponse(pipId: number, data: { employeeId: number; responseText: string; method?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${pipId}/log-response`, data);
  }
  acknowledgeResponse(responseId: number, acknowledgedBy: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/responses/${responseId}/acknowledge`, { acknowledgedBy });
  }

  // ── Public (no auth) ───────────────────────────────────────────────────────
  /** Used by pip-response-form — hits the public /api/pip-respond/:token route */
  respondViaToken(token: string, responseText: string): Observable<any> {
    const baseUrl = environment.apiUrl.replace('/api', '');
    return this.http.post(`${baseUrl}/api/pip-respond/${token}`, { responseText });
  }
}
