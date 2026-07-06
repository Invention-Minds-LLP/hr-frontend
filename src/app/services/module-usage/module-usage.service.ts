import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

export interface ModuleUsageUser {
  id: number;
  name: string;
  code: string;
  department: string | null;
}

export interface ModuleUsageModule {
  key: string;
  label: string;
  eligibleCount: number;
  activeCount: number;
  inactiveCount: number;
  adoptionPct: number;
  activeUsers: ModuleUsageUser[];
  inactiveUsers: ModuleUsageUser[];
}

export interface ModuleUsageSummary {
  from: string;
  to: string;
  totalEligible: number;
  modules: ModuleUsageModule[];
}

@Injectable({ providedIn: 'root' })
export class ModuleUsageService {
  private base = environment.apiUrl + '/module-usage';

  constructor(private http: HttpClient) {}

  /** from/to as YYYY-MM-DD; omit for the backend default (last 30 days). */
  getSummary(from?: string, to?: string): Observable<ModuleUsageSummary> {
    const qp: string[] = [];
    if (from) qp.push(`from=${encodeURIComponent(from)}`);
    if (to) qp.push(`to=${encodeURIComponent(to)}`);
    const qs = qp.length ? `?${qp.join('&')}` : '';
    return this.http.get<ModuleUsageSummary>(`${this.base}/summary${qs}`);
  }
}
