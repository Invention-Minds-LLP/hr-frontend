import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({ providedIn: 'root' })
export class WeeklyRatingService {
  private apiUrl = environment.apiUrl + '/weekly-rating';
  constructor(private http: HttpClient) {}

  // Questions
  getQuestions(designationId?: number): Observable<any[]> {
    let params = new HttpParams();
    if (designationId) params = params.set('designationId', designationId);
    return this.http.get<any[]>(`${this.apiUrl}/questions`, { params });
  }
  getQuestionsForEmployee(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/questions/employee/${employeeId}`);
  }
  createQuestion(text: string, designationId: number, createdBy?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/questions`, { text, designationId, createdBy });
  }
  toggleQuestion(id: number, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/questions/${id}/toggle`, { isActive });
  }
  deleteQuestion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/questions/${id}`);
  }
  seedDefaults(): Observable<any> {
    return this.http.post(`${this.apiUrl}/questions/seed`, {});
  }

  // Ratings
  getMyRatings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my`);
  }
  getTeam(managerId: number, weekStartDate?: string): Observable<any[]> {
    let params = new HttpParams().set('managerId', managerId);
    if (weekStartDate) params = params.set('weekStartDate', weekStartDate);
    return this.http.get<any[]>(`${this.apiUrl}/team`, { params });
  }
  submitRating(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/rate`, data);
  }
  getRatingDetail(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
  getAllRatings(params?: any): Observable<any[]> {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
    return this.http.get<any[]>(`${this.apiUrl}/all`, { params: p });
  }
  deleteRating(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
