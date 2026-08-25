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

  /**
   * Archived rows are excluded unless HR asks for them — retired periods hold
   * real history, so they are hidden rather than deleted. The flag is ignored
   * server-side for anyone who is not HR.
   */
  getSummaries(includeArchived = false): Observable<any[]> {
    const params = includeArchived ? new HttpParams().set('includeArchived', 'true') : undefined;
    return this.http.get<any[]>(`${this.baseUrl}/summaries`, { params });
  }

  /** HR retires a period (or restores it) without deleting anything. */
  setSummaryArchived(summaryId: number, archived: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/summary/${summaryId}/archive`, { archived });
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

  /**
   * HR's combined view of one period: every reviewer's score per criterion,
   * plus the employee's own self-appraisal. The two halves answer different
   * question sets, so they are returned separately rather than merged.
   */
  getReviewDetail(summaryId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/summary/${summaryId}/review-detail`);
  }

  // ── HR sign-off + edit requests ──────────────────────────────────────────
  // Reviewers edit freely until HR marks a period reviewed; after that a change
  // needs an approved request, and the approval is consumed by the edit.

  /** HR marks a period's review complete, or reopens it. */
  setHrReviewed(summaryId: number, reviewed: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/summary/${summaryId}/review`, { reviewed });
  }

  /** A reviewer asks HR to reopen a period they can no longer edit. */
  requestEdit(summaryId: number, reason: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/summary/${summaryId}/edit-request`, { reason });
  }

  /** HR's queue. `status` is PENDING by default, or ALL. */
  listEditRequests(status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL' = 'PENDING'): Observable<any[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<any[]>(`${this.baseUrl}/edit-requests`, { params });
  }

  decideEditRequest(id: number, approve: boolean, rejectionReason?: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/edit-requests/${id}`, { approve, rejectionReason });
  }

  // ── Self-appraisal (Dept Performance Indicator) ──────────────────────────
  // Separate tables from the managerial self-appraisal, same question master.

  /** Cycles this employee may self-appraise for — those with an assigned indicator. */
  getSelfAppraisalCycles(employeeId?: number): Observable<{
    employeeId: number;
    employeeType: string | null;
    /** One entry per assigned (cycle, period) — the employee self-assesses at
     *  every milestone, as the reviewers score at every milestone. */
    cycles: Array<{
      cycle: string;
      period: string;
      periodLabel: string;
      milestoneDate: string | null;
      /** False until the milestone is reached; the row can't be filled yet. */
      open: boolean;
      submitted: boolean;
      submittedAt: string | null;
      started: boolean;
      lastSaved: string | null;
    }>;
    /** Managerial appraisals this person also has — their self-appraisal for
     *  those lives in the managerial module, not here. */
    managerialAppraisals: Array<{ id: number; cycle: string; status: string; submitted: boolean }>;
    hasBoth: boolean;
  }> {
    let params = new HttpParams();
    if (employeeId) params = params.set('employeeId', String(employeeId));
    return this.http.get<any>(`${this.baseUrl}/self-appraisal/cycles`, { params });
  }

  /** Questionnaire for this employee plus anything already saved. */
  getSelfAppraisal(cycle: string, period: string, employeeId?: number): Observable<{
    employee: any;
    cycle: string;
    period: string;
    periodLabel: string;
    questions: Array<{ id: number; text: string; section: string | null; category: string | null }>;
    selfAppraisal: any | null;
    answers: Array<{ questionId: number; rating: number | null; comments: string | null }>;
    canEdit: boolean;
    readOnly: boolean;
  }> {
    let params = new HttpParams().set('cycle', cycle).set('period', period);
    if (employeeId) params = params.set('employeeId', String(employeeId));
    return this.http.get<any>(`${this.baseUrl}/self-appraisal`, { params });
  }

  saveSelfAppraisal(payload: {
    employeeId?: number;
    cycle: string;
    period: string;
    answers: Array<{ questionId: number; rating: number | null; comments: string }>;
    achievements?: string;
    goalsObjective?: string;
    challenges?: string;
    trainingNeeds?: string;
    isDraft: boolean;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/self-appraisal`, payload);
  }

  /** HR only — clears submittedAt so the employee can edit again. */
  reopenSelfAppraisal(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/self-appraisal/${id}/reopen`, {});
  }

  // Retro-fit a template onto a summary row that was created before
  // templateId became required. Backend refuses if responses exist.
  assignSummaryTemplate(summaryId: number, templateId: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/summary/${summaryId}/template`, { templateId });
  }
}
