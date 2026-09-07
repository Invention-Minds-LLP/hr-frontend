import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

export type ProbationRating = 'E' | 'M' | 'B';
export type ProbationOutcome = 'CONFIRM' | 'EXTEND' | 'TERMINATE' | 'DEPARTMENT_TRANSFER';
export type ProbationEvaluationStatus = 'PENDING_MANAGER' | 'PENDING_HR' | 'COMPLETED' | 'CANCELLED';

export interface ProbationCategory {
  code: string;
  label: string;
  criteria: string;
}

export interface ProbationFormMeta {
  categories: ProbationCategory[];
  ratings: { code: ProbationRating; label: string }[];
  extensionMonths: number;
}

export interface ManagerSubmission {
  ratings: Record<string, ProbationRating>;
  strongPoints: string;
  improvementPoints: string;
  recommendation: ProbationOutcome;
  managerComments?: string;
  employeeComments?: string;
}

@Injectable({ providedIn: 'root' })
export class ProbationService {
  private apiUrl = environment.apiUrl + '/probation';

  constructor(private http: HttpClient) {}

  /** The eight categories and the E/M/B legend, so the form never hardcodes them. */
  getFormMeta(): Observable<ProbationFormMeta> {
    return this.http.get<ProbationFormMeta>(`${this.apiUrl}/categories`);
  }

  /**
   * Without `admin.probation.manage` the server narrows this to the caller's own
   * assignments regardless of the filters passed.
   */
  listEvaluations(filters: {
    status?: ProbationEvaluationStatus | '';
    mine?: boolean;
    unassigned?: boolean;
    employeeId?: number;
  } = {}): Observable<any[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.mine) params = params.set('mine', '1');
    if (filters.unassigned) params = params.set('unassigned', '1');
    if (filters.employeeId) params = params.set('employeeId', filters.employeeId);
    return this.http.get<any[]>(`${this.apiUrl}/evaluations`, { params });
  }

  getEvaluation(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/evaluations/${id}`);
  }

  /** Employees whose probation closes within `days` and who have no open round. */
  listDue(days = 30): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/due`, { params: new HttpParams().set('days', days) });
  }

  getEmployeeHistory(employeeId: number): Observable<{ evaluations: any[]; records: any[] }> {
    return this.http.get<{ evaluations: any[]; records: any[] }>(
      `${this.apiUrl}/employee/${employeeId}/history`,
    );
  }

  submitManagerEvaluation(id: number, body: ManagerSubmission): Observable<any> {
    return this.http.post(`${this.apiUrl}/evaluations/${id}/manager-submit`, body);
  }

  submitHrDecision(id: number, decision: ProbationOutcome, hrComments: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/evaluations/${id}/hr-decision`, { decision, hrComments });
  }

  assignManager(id: number, managerId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/evaluations/${id}/manager`, { managerId });
  }

  /** HR's manual trigger — the daily cron does the same thing at 09:15. */
  generateDue(): Observable<{ opened: number; unassigned: number; skipped: number }> {
    return this.http.post<{ opened: number; unassigned: number; skipped: number }>(
      `${this.apiUrl}/generate`,
      {},
    );
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/evaluations/${id}/pdf`, { responseType: 'blob' });
  }
}
