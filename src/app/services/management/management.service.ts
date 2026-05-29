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
  /** Shift-wise attendance breakdown for the management dashboard.
   *  Lives on the /dashboard route, not /management — kept here so the
   *  dashboard component imports a single service for all its tiles. */
  getAttendanceByShift(opts: { date?: string; compareDays?: number; drilldown?: boolean } = {})
    : Observable<any> {
    const dashboardBase = environment.apiUrl + '/dashboard';
    const qp: string[] = [];
    if (opts.date)        qp.push(`date=${encodeURIComponent(opts.date)}`);
    if (opts.compareDays) qp.push(`compareDays=${opts.compareDays}`);
    if (opts.drilldown)   qp.push(`drilldown=1`);
    const qs = qp.length ? `?${qp.join('&')}` : '';
    return this.http.get(`${dashboardBase}/attendance/by-shift${qs}`);
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
  getRecruitmentOps(): Observable<any> {
    return this.http.get(`${this.base}/recruitment-ops`);
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
  getDeptAttendanceToday(): Observable<any> {
    return this.http.get(`${this.base}/dept-attendance-today`);
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
  getOtEligibility(month?: string): Observable<any> {
    const q = month ? `?month=${month}` : '';
    return this.http.get(`${this.base}/ot-eligibility${q}`);
  }
  getLeaveByTypeWeekly(weeks = 8): Observable<any> {
    return this.http.get(`${this.base}/leave-by-type-weekly?weeks=${weeks}`);
  }
  getLeaveAbuse(month?: string, min = 5): Observable<any> {
    const q = month ? `?month=${month}&min=${min}` : `?min=${min}`;
    return this.http.get(`${this.base}/leave-abuse${q}`);
  }
  getWeeklyPerfStatus(weeks = 6): Observable<any> {
    return this.http.get(`${this.base}/weekly-perf-status?weeks=${weeks}`);
  }
  getIncidentsAnalytics(months = 6): Observable<any> {
    return this.http.get(`${this.base}/incidents-analytics?months=${months}`);
  }
  getLateArrivals(days = 30): Observable<any> {
    return this.http.get(`${this.base}/late-arrivals?days=${days}`);
  }
  getPunctuality(weeks = 4): Observable<any> {
    return this.http.get(`${this.base}/punctuality?weeks=${weeks}`);
  }
  getWorkedHours(week?: string): Observable<any> {
    const q = week ? `?week=${week}` : '';
    return this.http.get(`${this.base}/worked-hours${q}`);
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
  getPayrollOverview(month?: string): Observable<any> {
    const q = month ? `?month=${month}` : '';
    return this.http.get(`${this.base}/payroll-overview${q}`);
  }
  getPayrollTrend(): Observable<any> {
    return this.http.get(`${this.base}/payroll-trend`);
  }
  getLoanOverview(): Observable<any> {
    return this.http.get(`${this.base}/loan-overview`);
  }
  getIncentiveOverview(): Observable<any> {
    return this.http.get(`${this.base}/incentive-overview`);
  }
  getPayrollReadiness(): Observable<any> {
    return this.http.get(`${this.base}/payroll-readiness`);
  }
  getDeptPlanning(month?: string): Observable<any> {
    const q = month ? `?month=${month}` : '';
    return this.http.get(`${this.base}/dept-planning${q}`);
  }
  setDeptPlanning(payload: {
    deptId: number; otBudgetHoursPerMonth: number; minDailyStrength: number;
    appraisalCycleBasis?: string; appraisalPeriodMonths?: number; appraisalCalendarMonth?: number | null;
  }): Observable<any> {
    return this.http.put(`${this.base}/dept-planning`, payload);
  }
  getAppraisalScores(): Observable<any> {
    return this.http.get(`${this.base}/appraisal-scores`);
  }
  getReliabilityScores(months = 6): Observable<any> {
    return this.http.get(`${this.base}/reliability-scores?months=${months}`);
  }
  getPipMonitor(): Observable<any> {
    return this.http.get(`${this.base}/pip-monitor`);
  }
  getOtVsHire(month?: string): Observable<any> {
    const q = month ? `?month=${month}` : '';
    return this.http.get(`${this.base}/ot-vs-hire${q}`);
  }
  getSalaryIncrements(months = 12): Observable<any> {
    return this.http.get(`${this.base}/salary-increments?months=${months}`);
  }
  getAppraisalEligibility(month?: string): Observable<any> {
    const q = month ? `?month=${month}` : '';
    return this.http.get(`${this.base}/appraisal-eligibility${q}`);
  }
  getProbationOverview(): Observable<any> {
    return this.http.get(`${this.base}/probation-overview`);
  }
}
