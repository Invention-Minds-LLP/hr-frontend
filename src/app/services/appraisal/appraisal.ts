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
}
