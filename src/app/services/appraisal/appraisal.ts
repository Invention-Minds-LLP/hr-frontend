import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';


@Injectable({
  providedIn: 'root'
})
export class Appraisal {

  constructor(private http: HttpClient){}

  private apiUrl= environment.apiUrl + '/appraisals'

  // apiUrl:string = 'http://localhost:3002/api/appraisals'

  bulkCreateAppraisals(payload: any) {
    return this.http.post(`${this.apiUrl}/bulk-create`, payload);
  }
  getAllAppraisals(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
  saveManagerReview(data: any) {
    return this.http.post(`${this.apiUrl}/manager-review`, data);
  }

  // V2: Enhanced flow
  getAppraisalDetail(id: number, viewerRole: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/detail/${id}?viewerRole=${viewerRole}`);
  }

  hrVerifyAppraisal(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/hr-verify`, data);
  }

  reassignManager(id: number, body: { newManagerId: number; reason?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/reassign-manager`, body);
  }

  // ── Review Questions (master pool for In-charge / Manager / Management) ──
  listReviewQuestions(params?: { level?: 'INCHARGE' | 'MANAGER' | 'MANAGEMENT'; includeInactive?: boolean; appraisalId?: number }): Observable<any[]> {
    const q: any = {};
    if (params?.level) q.level = params.level;
    if (params?.includeInactive) q.includeInactive = 'true';
    if (params?.appraisalId) q.appraisalId = String(params.appraisalId);
    return this.http.get<any[]>(`${this.apiUrl}/review-questions`, { params: q });
  }
  createReviewQuestion(body: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/review-questions`, body);
  }
  updateReviewQuestion(id: number, body: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/review-questions/${id}`, body);
  }
  toggleReviewQuestion(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/review-questions/${id}/toggle`, {});
  }
  deleteReviewQuestion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/review-questions/${id}`);
  }
  seedReviewQuestions(): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/seed-review-questions`, {});
  }

  submitInchargeAppraisal(id: number, body: { answers: any[]; isDraft?: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/incharge-appraisal`, body);
  }

  submitSelfAppraisal(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/self-appraisal`, data);
  }

  submitManagerAppraisalV2(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/manager-appraisal`, data);
  }

  submitManagementAppraisal(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/management-appraisal`, data);
  }

  hrReviewAppraisal(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/hr-review`, data);
  }

  requestEdit(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/edit-request`, data);
  }

  respondEditRequest(requestId: number, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/edit-request/${requestId}`, data);
  }

  getEditHistory(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/edit-history`);
  }

  // Self-appraisal questions
  getSelfQuestions(appraisalId?: number): Observable<any[]> {
    const params = appraisalId ? `?appraisalId=${appraisalId}` : '';
    return this.http.get<any[]>(`${this.apiUrl}/self-questions${params}`);
  }

  createSelfQuestion(text: string, category?: string, section?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/self-questions`, { text, category, section });
  }

  toggleSelfQuestion(id: number, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/self-questions/${id}/toggle`, { isActive });
  }

  getEmployeeInsights(appraisalId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${appraisalId}/insights`);
  }

  // Appraisal pauses (maternity, long medical leave, sabbatical). One pause
  // covers BOTH managerial appraisal and dept performance clocks.
  listEmployeePauses(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/employees/${employeeId}/pauses`);
  }

  getActivePause(employeeId: number): Observable<{ active: any | null }> {
    return this.http.get<{ active: any | null }>(`${this.apiUrl}/employees/${employeeId}/pauses/active`);
  }

  startPause(employeeId: number, body: { startDate: string; endDate?: string | null; reason: string; createdBy: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/employees/${employeeId}/pauses`, body);
  }

  updatePause(pauseId: number, body: { startDate?: string; endDate?: string | null; reason?: string; endedBy?: number }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/pauses/${pauseId}`, body);
  }

  deletePause(pauseId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/pauses/${pauseId}`);
  }
}
