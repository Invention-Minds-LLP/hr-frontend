import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

export type CommitteeType = 'POSH' | 'GRIEVANCE';
export type CommitteeRole =
  | 'PRESIDING_OFFICER' | 'CHAIR' | 'MEMBER' | 'EXTERNAL_MEMBER' | 'SECRETARY';

@Injectable({ providedIn: 'root' })
export class Committee {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/committees';

  list(opts: { type?: CommitteeType; active?: boolean } = {}): Observable<any[]> {
    let p = new HttpParams();
    if (opts.type)              p = p.set('type', opts.type);
    if (opts.active !== undefined) p = p.set('active', String(opts.active));
    return this.http.get<any[]>(this.base, { params: p });
  }
  get(id: number): Observable<any> { return this.http.get(`${this.base}/${id}`); }
  create(payload: {
    type: CommitteeType; name: string; scope?: string;
    termStart: string; termEnd: string; notes?: string;
  }): Observable<any> { return this.http.post(this.base, payload); }
  update(id: number, payload: any): Observable<any> {
    return this.http.patch(`${this.base}/${id}`, payload);
  }

  addMember(committeeId: number, payload: {
    employeeId?: number; externalName?: string; externalEmail?: string;
    externalPhone?: string; externalOrg?: string; role: CommitteeRole;
  }): Observable<any> {
    return this.http.post(`${this.base}/${committeeId}/members`, payload);
  }
  updateMember(memberId: number, payload: {
    role?: CommitteeRole; externalName?: string; externalEmail?: string;
    externalPhone?: string; externalOrg?: string;
  }): Observable<any> {
    return this.http.patch(`${this.base}/members/${memberId}`, payload);
  }
  removeMember(memberId: number): Observable<any> {
    return this.http.delete(`${this.base}/members/${memberId}`);
  }

  /** POSH ICC compliance check — returns { compliant, errors, warnings, stats }. */
  poshCompliance(id: number): Observable<any> {
    return this.http.get(`${this.base}/${id}/posh-compliance`);
  }
}
