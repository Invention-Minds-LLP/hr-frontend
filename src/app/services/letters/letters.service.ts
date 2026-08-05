import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

const BASE = `${environment.apiUrl}/letters`;

export type LetterCategory =
  | 'OFFER' | 'CONFIRMATION' | 'EXPERIENCE' | 'RELIEVING' | 'APPRECIATION'
  | 'WARNING' | 'INCREMENT' | 'TRANSFER' | 'CUSTOM';

export interface LetterTemplate {
  id?: number;
  companyId?: number | null;
  name: string;
  category: LetterCategory;
  subject: string;
  bodyHtml: string;
  headerHtml?: string | null;
  footerHtml?: string | null;
  includeSignature: boolean;
  isActive: boolean;
  createdAt?: string;
  preview?: string;
  _count?: { issued: number };
}

export interface LetterIssued {
  id: number;
  templateId?: number | null;
  templateName?: string | null;
  employeeId: number;
  subject: string;
  renderedHtml: string;
  issuedAt: string;
  emailedAt?: string | null;
  status: 'ISSUED' | 'EMAILED' | 'REVOKED';
  remarks?: string | null;
  employee?: any;
  template?: { id: number; name: string; category: string };
}

export interface LetterToken {
  token: string;
  label: string;
  group: string;
  example: string;
}

export interface LetterPreview {
  subject: string;
  bodyHtml: string;
  headerHtml?: string | null;
  footerHtml?: string | null;
  plainText: string;
  unknownTokens: string[];
}

@Injectable({ providedIn: 'root' })
export class LettersService {
  constructor(private http: HttpClient) {}

  getTokens(): Observable<{ tokens: LetterToken[]; categories: string[]; note: string }> {
    return this.http.get<any>(`${BASE}/tokens`);
  }

  // ── Templates ───────────────────────────────────────────────────────────────
  listTemplates(category?: string, includeInactive = false): Observable<LetterTemplate[]> {
    let p = new HttpParams();
    if (category) p = p.set('category', category);
    if (includeInactive) p = p.set('includeInactive', 'true');
    return this.http.get<LetterTemplate[]>(`${BASE}/templates`, { params: p });
  }

  getTemplate(id: number): Observable<LetterTemplate> {
    return this.http.get<LetterTemplate>(`${BASE}/templates/${id}`);
  }

  saveTemplate(data: Partial<LetterTemplate>): Observable<LetterTemplate> {
    return data.id
      ? this.http.patch<LetterTemplate>(`${BASE}/templates/${data.id}`, data)
      : this.http.post<LetterTemplate>(`${BASE}/templates`, data);
  }

  deleteTemplate(id: number): Observable<{ message: string }> {
    return this.http.delete<any>(`${BASE}/templates/${id}`);
  }

  // ── Render & issue ──────────────────────────────────────────────────────────
  // Pass templateId for a saved template, or bodyHtml to preview unsaved edits.
  preview(body: {
    employeeId?: number; templateId?: number; subject?: string;
    bodyHtml?: string; headerHtml?: string | null; footerHtml?: string | null;
    extra?: Record<string, any>;
  }): Observable<LetterPreview> {
    return this.http.post<LetterPreview>(`${BASE}/preview`, body);
  }

  issue(body: {
    templateId: number; employeeIds: number[]; sendEmail?: boolean;
    remarks?: string; extra?: Record<string, any>;
  }): Observable<{ issued: number; failed: { employeeId: number; reason: string }[]; letters: LetterIssued[] }> {
    return this.http.post<any>(`${BASE}/issue`, body);
  }

  // ── Issued history ──────────────────────────────────────────────────────────
  listIssued(params: { employeeId?: number; templateId?: number; category?: string; page?: number; limit?: number } = {}):
    Observable<{ data: LetterIssued[]; total: number; page: number; limit: number }> {
    let p = new HttpParams();
    if (params.employeeId) p = p.set('employeeId', params.employeeId);
    if (params.templateId) p = p.set('templateId', params.templateId);
    if (params.category)   p = p.set('category', params.category);
    if (params.page)       p = p.set('page', params.page);
    if (params.limit)      p = p.set('limit', params.limit);
    return this.http.get<any>(`${BASE}/issued`, { params: p });
  }

  listMine(): Observable<LetterIssued[]> {
    return this.http.get<LetterIssued[]>(`${BASE}/my`);
  }

  downloadIssued(id: number): Observable<Blob> {
    return this.http.get(`${BASE}/issued/${id}/pdf`, { responseType: 'blob' });
  }

  revoke(id: number, reason?: string): Observable<LetterIssued> {
    return this.http.patch<LetterIssued>(`${BASE}/issued/${id}/revoke`, { reason });
  }
}
