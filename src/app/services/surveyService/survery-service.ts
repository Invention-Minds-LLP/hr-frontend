import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';
import { HttpParams } from '@angular/common/http';

export interface SurveyQuestion {
  id: number;
  section: string;
  questionText: string;
  orderNo: number;
}

export interface SurveyCycle {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  /** SCHEDULED | OPEN | CLOSED */
  status: string;
  exclusionDays: number;
  recurrenceMonths: number;
  assigned: number;
  submitted: number;
  pending: number;
  expired: number;
  completionPct: number;
}

export interface SurveySubmitPayload {
  employeeId: number;
  answers: { questionId: number; answer: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class SurveryService {
  private baseUrl = environment.apiUrl + '/survey';
  // private baseUrl = 'http://localhost:3002/api/survey';

  constructor(private http: HttpClient) {}

  getQuestions(): Observable<SurveyQuestion[]> {
    return this.http.get<SurveyQuestion[]>(`${this.baseUrl}/questions`);
  }

  submitSurvey(payload: SurveySubmitPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/submit`, payload);
  }

  getSurveyResults(surveyId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/results/${surveyId}`);
  }

  getAllSurveys(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/all`);
  }

  getDraftSurveys(employeeId: number): Observable<any[]> {
    const params = new HttpParams().set('employeeId', employeeId.toString());
    return this.http.get<any[]>(`${this.baseUrl}/drafts`, { params });
  }

  // ===== HR Analytics Dashboard =====
  private analyticsParams(filters?: any): HttpParams {
    let p = new HttpParams();
    if (!filters) return p;
    // A cycle is itself a date window, so the backend ignores from/to when it
    // is set — send only the cycle to keep the query string honest.
    if (filters.cycleId) {
      p = p.set('cycleId', String(filters.cycleId));
    } else {
      if (filters.from) p = p.set('from', filters.from);
      if (filters.to) p = p.set('to', filters.to);
    }
    if (filters.departmentId) p = p.set('departmentId', String(filters.departmentId));
    if (filters.departmentIds?.length) p = p.set('departmentIds', filters.departmentIds.join(','));
    if (filters.gender) p = p.set('gender', filters.gender);
    if (filters.designationId) p = p.set('designationId', String(filters.designationId));
    if (filters.sections?.length) p = p.set('sections', filters.sections.join(','));
    return p;
  }

  getAnalyticsSummary(filters?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/analytics/summary`, { params: this.analyticsParams(filters) });
  }
  getAnalyticsBySection(filters?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/analytics/by-section`, { params: this.analyticsParams(filters) });
  }
  getAnalyticsByQuestion(filters?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/analytics/by-question`, { params: this.analyticsParams(filters) });
  }
  getAnalyticsByDepartment(filters?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/analytics/by-department`, { params: this.analyticsParams(filters) });
  }
  getAnalyticsQuestionDrilldown(questionId: number, filters?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/analytics/question/${questionId}`, { params: this.analyticsParams(filters) });
  }
  getAnalyticsAtRisk(filters?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/analytics/at-risk`, { params: this.analyticsParams(filters) });
  }
  getAnalyticsDemographics(filters?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/analytics/demographics`, { params: this.analyticsParams(filters) });
  }
  getAnalyticsScatter(filters?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/analytics/scatter`, { params: this.analyticsParams(filters) });
  }
  getAnalyticsPending(filters?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/analytics/pending`, { params: this.analyticsParams(filters) });
  }
  sendPendingReminders(surveyIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/analytics/pending/remind`, { surveyIds });
  }

  // ===== Survey cycles =====
  getSurveyCycles(): Observable<SurveyCycle[]> {
    return this.http.get<SurveyCycle[]>(`${this.baseUrl}/cycles`);
  }
  getCycleExclusions(cycleId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/cycles/${cycleId}/exclusions`);
  }
}
