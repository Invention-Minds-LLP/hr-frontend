
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';
import {
  Internships,
  InternshipListResponse,
  CreateInternshipDto,
  UpdateInternshipDto,
  InternshipStatus,
  ConvertPayload,
  InternshipEvaluation,
  CreateEvaluationDto,
  EvaluationListResponse,
  InternshipStipend,
  CreateStipendDto,
  UpdateStipendDto,
  StipendListResponse,
  InternshipAnalytics
} from './internship-service.model';

@Injectable({ providedIn: 'root' })
export class InternshipService {
  // Change if your API is hosted elsewhere
  private base = environment.apiUrl + '/internships';
  // private base = 'http://localhost:3002/api/internships';

  constructor(private http: HttpClient) {}

  list(params: {
    q?: string;
    status?: InternshipStatus | string;  // CSV allowed
    employeeId?: number;
    mentorId?: number;
    activeFrom?: string;        // <-- NEW
    activeTo?: string;          // <-- NEW  
    page?: number;
    pageSize?: number;
    order?: 'asc' | 'desc';
    departmentId?: number | null;
  } = {}): Observable<InternshipListResponse> {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    });
    return this.http.get<InternshipListResponse>(this.base, { params: p });
  }

  get(id: number): Observable<Internships> {
    return this.http.get<Internships>(`${this.base}/${id}`);
  }

  create(body: CreateInternshipDto): Observable<Internships> {
    return this.http.post<Internships>(this.base, body);
  }

  update(id: number, body: UpdateInternshipDto): Observable<Internships> {
    return this.http.patch<Internships>(`${this.base}/${id}`, body);
  }

  offer(id: number, payload: { startDate?: string }): Observable<Internships> {
    return this.http.post<Internships>(`${this.base}/${id}/offer`, payload || {});
  }

  activate(id: number, payload: { startDate?: string; employeeId?: number | null }): Observable<Internships> {
    return this.http.post<Internships>(`${this.base}/${id}/activate`, payload || {});
  }

  extend(id: number, payload: { endDate: string }): Observable<Internships> {
    return this.http.post<Internships>(`${this.base}/${id}/extend`, payload);
  }

  complete(id: number, payload: { endDate?: string }): Observable<Internships> {
    return this.http.post<Internships>(`${this.base}/${id}/complete`, payload || {});
  }

  drop(id: number, payload: { reason?: string }): Observable<Internships> {
    return this.http.post<Internships>(`${this.base}/${id}/drop`, payload || {});
  }

  convert(id: number, payload: ConvertPayload): Observable<Internships> {
    return this.http.post<Internships>(`${this.base}/${id}/convert`, payload || {});
  }

  // ── Evaluations (periodic mentor/HR performance reviews) ──────────────────
  listEvaluations(id: number): Observable<EvaluationListResponse> {
    return this.http.get<EvaluationListResponse>(`${this.base}/${id}/evaluations`);
  }

  createEvaluation(id: number, body: CreateEvaluationDto): Observable<InternshipEvaluation> {
    return this.http.post<InternshipEvaluation>(`${this.base}/${id}/evaluations`, body || {});
  }

  updateEvaluation(id: number, evalId: number, body: CreateEvaluationDto): Observable<InternshipEvaluation> {
    return this.http.patch<InternshipEvaluation>(`${this.base}/${id}/evaluations/${evalId}`, body || {});
  }

  deleteEvaluation(id: number, evalId: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}/evaluations/${evalId}`);
  }

  // ── Stipends (standalone disbursement tracking, not tied to payroll) ───────
  listStipends(id: number): Observable<StipendListResponse> {
    return this.http.get<StipendListResponse>(`${this.base}/${id}/stipends`);
  }

  createStipend(id: number, body: CreateStipendDto): Observable<InternshipStipend> {
    return this.http.post<InternshipStipend>(`${this.base}/${id}/stipends`, body || {});
  }

  updateStipend(id: number, stipendId: number, body: UpdateStipendDto): Observable<InternshipStipend> {
    return this.http.patch<InternshipStipend>(`${this.base}/${id}/stipends/${stipendId}`, body || {});
  }

  deleteStipend(id: number, stipendId: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}/stipends/${stipendId}`);
  }

  generateStipendSchedule(id: number, body: { amount?: number } = {}): Observable<{ created: number; monthsInRange: number }> {
    return this.http.post<{ created: number; monthsInRange: number }>(`${this.base}/${id}/stipends/generate`, body);
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  analytics(): Observable<InternshipAnalytics> {
    return this.http.get<InternshipAnalytics>(`${this.base}/analytics`);
  }
}
