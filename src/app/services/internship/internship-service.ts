
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Internships,
  InternshipListResponse,
  CreateInternshipDto,
  UpdateInternshipDto,
  InternshipStatus,
  ConvertPayload
} from './internship-service.model';

@Injectable({ providedIn: 'root' })
export class InternshipService {
  // Change if your API is hosted elsewhere
  private base = 'http://localhost:3002/api/internships';

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
}
