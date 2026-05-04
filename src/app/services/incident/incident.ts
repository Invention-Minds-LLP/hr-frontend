import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({ providedIn: 'root' })
export class Incident {
  constructor(private http: HttpClient) {}
  private baseUrl = environment.apiUrl + '/incidents';

  /* ─── Categories (admin) ─────────────────────────── */
  listCategories(includeInactive = false): Observable<any[]> {
    const params = includeInactive ? new HttpParams().set('includeInactive', 'true') : undefined;
    return this.http.get<any[]>(`${this.baseUrl}/categories`, params ? { params } : {});
  }
  upsertCategory(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/categories`, payload);
  }

  /* ─── Incidents — primary CRUD ───────────────────── */
  /**
   * Create a new incident (logged-in flow).
   * Body shape: { title, description, categoryId, severity?, location?,
   *               incidentDate?, employeeId?, isAnonymous?, confidentiality?,
   *               attachments?: [{fileName,fileUrl}], witnesses?: [...] }
   */
  createIncident(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}`, payload);
  }

  /** Paginated list with optional filters. */
  listIncidents(params: {
    status?: string; severity?: string; categoryId?: number;
    assignedTo?: number; employeeId?: number;
    q?: string; from?: string; to?: string;
    page?: number; pageSize?: number;
  } = {}): Observable<{ total: number; rows: any[] }> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    }
    return this.http.get<{ total: number; rows: any[] }>(`${this.baseUrl}`, { params: p });
  }

  getIncident(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }
  updateIncident(id: number, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}`, body);
  }

  /* ─── Comments / Witnesses / Attachments ─────────── */
  addComment(incidentId: number, body: string, isInternal = false): Observable<any> {
    return this.http.post(`${this.baseUrl}/${incidentId}/comments`, { body, isInternal });
  }
  addWitness(incidentId: number, body: {
    witnessEmpId?: number; witnessName?: string;
    contactInfo?: string;  statement?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/${incidentId}/witnesses`, body);
  }
  addAttachment(incidentId: number, body: { fileName: string; fileUrl: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/${incidentId}/attachments`, body);
  }
  deleteAttachment(attachmentId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/attachments/${attachmentId}`);
  }

  /* ─── Phase 2 — CAPA ─────────────────────────────── */
  listCAPA(incidentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${incidentId}/capa`);
  }
  createCAPA(incidentId: number, body: {
    type?: 'CORRECTIVE' | 'PREVENTIVE'; description: string;
    ownerId?: number; dueDate?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/${incidentId}/capa`, body);
  }
  updateCAPA(capaId: number, body: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/capa/${capaId}`, body);
  }
  deleteCAPA(capaId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/capa/${capaId}`);
  }

  /* ─── Phase 2 — RCA (5-Why or Fishbone) ──────────── */
  getRCA(incidentId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${incidentId}/rca`);
  }
  saveRCA(incidentId: number, body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/${incidentId}/rca`, body);
  }

  /* ─── Phase 2 — Linked incidents ─────────────────── */
  getLinks(incidentId: number): Observable<{ parent: any; children: any[] }> {
    return this.http.get<any>(`${this.baseUrl}/${incidentId}/links`);
  }
  linkIncident(childId: number, parentIncidentId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${childId}/link`, { parentIncidentId });
  }
  unlinkIncident(childId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${childId}/link`);
  }

  /* ─── Phase 3 — Dashboard ────────────────────────── */
  getDashboard(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard`);
  }

  /* ─── Subject self-view (redacted) ───────────────── */
  /** List incidents where I'm the named subject (OPEN cases hidden). */
  listMyIncidents(): Observable<{ total: number; rows: any[] }> {
    return this.http.get<{ total: number; rows: any[] }>(`${this.baseUrl}/mine`);
  }
  /** Redacted detail — no reporter, no witnesses, no attachments, no internal comments. */
  getMyIncident(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/mine/${id}`);
  }
  /** Subject posts their statement onto the case (always non-internal). */
  addMyComment(id: number, body: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/mine/${id}/comments`, { body });
  }

  /* ─── Phase 4 — Public anonymous endpoints ───────── */
  publicCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/public/categories`);
  }
  publicReport(payload: any): Observable<{
    ok: true; message: string; trackingToken: string; caseReference: string;
  }> {
    return this.http.post<any>(`${this.baseUrl}/public/report`, payload);
  }
  publicTrack(token: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/public/track/${encodeURIComponent(token)}`);
  }

  /* ─── Legacy (kept so existing UI doesn't break) ─── */
  /** @deprecated — prefer `listIncidents()` */
  getAllIncidents(): Observable<any> {
    return this.http.get(`${this.baseUrl}`);
  }
  getIncidentsByReporter(reporterId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/reported-by/${reporterId}`);
  }
  getIncidentsByEmployee(employeeId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/employee/${employeeId}`);
  }
}
