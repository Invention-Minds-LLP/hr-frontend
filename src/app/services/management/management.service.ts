import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({ providedIn: 'root' })
export class ManagementService {
  private base = environment.apiUrl + '/management';
  constructor(private http: HttpClient) {}

  getPulse(): Observable<any> {
    return this.http.get(`${this.base}/pulse`);
  }
  getAttention(): Observable<any> {
    return this.http.get(`${this.base}/attention`);
  }
  getWorkforce(): Observable<any> {
    return this.http.get(`${this.base}/workforce`);
  }
  getAttendanceSummary(days = 7): Observable<any> {
    return this.http.get(`${this.base}/attendance-summary?days=${days}`);
  }
  getLeaveCalendar(month?: string): Observable<any> {
    const q = month ? `?month=${month}` : '';
    return this.http.get(`${this.base}/leave-calendar${q}`);
  }
  getPerformanceRadar(): Observable<any> {
    return this.http.get(`${this.base}/performance-radar`);
  }
  getActivePIPs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/pip-active`);
  }
  getAttritionTrend(): Observable<any> {
    return this.http.get(`${this.base}/attrition-trend`);
  }
  getRecruitmentFunnel(): Observable<any> {
    return this.http.get(`${this.base}/recruitment-funnel`);
  }
  getTrainingByDept(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/training-by-dept`);
  }
  getActionItems(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/action-items`);
  }
  getKpiDetail(type: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/kpi-detail?type=${type}`);
  }
  getDeptSnapshot(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/dept-snapshot`);
  }
  getWeeklyTrend(): Observable<any> {
    return this.http.get(`${this.base}/weekly-trend`);
  }
  getPerformanceDistribution(): Observable<any> {
    return this.http.get(`${this.base}/performance-distribution`);
  }
  getDeptRisk(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/dept-risk`);
  }
  getOtAnalysis(month?: string): Observable<any> {
    const q = month ? `?month=${month}` : '';
    return this.http.get(`${this.base}/ot-analysis${q}`);
  }
  getLateArrivals(days = 30): Observable<any> {
    return this.http.get(`${this.base}/late-arrivals?days=${days}`);
  }
  getLeaveUtilization(): Observable<any> {
    return this.http.get(`${this.base}/leave-utilization`);
  }
  getAbsenteeism(days = 30): Observable<any> {
    return this.http.get(`${this.base}/absenteeism?days=${days}`);
  }
  getWorkforceInsights(): Observable<any> {
    return this.http.get(`${this.base}/workforce-insights`);
  }
  getMobileLoginActivity(days = 14): Observable<any> {
    return this.http.get(`${this.base}/mobile-login-activity?days=${days}`);
  }
  getQualifications(): Observable<any> {
    return this.http.get(`${this.base}/qualifications`);
  }
  getElInsights(): Observable<any> {
    return this.http.get(`${this.base}/el-insights`);
  }
  getTrainingInsights(): Observable<any> {
    return this.http.get(`${this.base}/training-insights`);
  }
  getTrainingCalendar(month?: string): Observable<any> {
    const q = month ? `?month=${month}` : '';
    return this.http.get(`${this.base}/training-calendar${q}`);
  }
}
