import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

const BASE = `${environment.apiUrl}/archive`;

/**
 * Archived records across every module that has archiving.
 *
 * Archiving keeps the row and takes it out of the working lists — it is not a
 * delete. Each module filters its own rows; this reads the central index behind
 * them so one screen can list and restore everything.
 */
export interface ArchiveRow {
  id: number;
  /** Module key, e.g. PERFORMANCE_SUMMARY. Pair with recordId to act on it. */
  module: string;
  moduleLabel: string;
  recordId: number;
  employeeId: number | null;
  /** Display text frozen when the record was archived. */
  label: string;
  reason: string | null;
  archivedAt: string;
  archivedBy: number | null;
  archivedByName: string | null;
  restoredAt: string | null;
  restoredBy: number | null;
  restoredByName: string | null;
  restored: boolean;
}

export interface ArchiveModuleOption {
  key: string;
  label: string;
  /** How many records of this module are currently archived. */
  count: number;
}

export interface ArchivePage {
  page: number;
  limit: number;
  total: number;
  rows: ArchiveRow[];
}

export interface ArchiveQuery {
  module?: string;
  employeeId?: number | null;
  from?: string;
  to?: string;
  q?: string;
  includeRestored?: boolean;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class ArchiveService {
  constructor(private http: HttpClient) {}

  /** Module names plus how many records each one currently has archived. */
  listModules(): Observable<ArchiveModuleOption[]> {
    return this.http.get<ArchiveModuleOption[]>(`${BASE}/modules`);
  }

  list(query: ArchiveQuery = {}): Observable<ArchivePage> {
    let params = new HttpParams();
    if (query.module) params = params.set('module', query.module);
    if (query.employeeId) params = params.set('employeeId', String(query.employeeId));
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    if (query.q) params = params.set('q', query.q);
    if (query.includeRestored) params = params.set('includeRestored', 'true');
    params = params.set('page', String(query.page ?? 1));
    params = params.set('limit', String(query.limit ?? 25));
    return this.http.get<ArchivePage>(BASE, { params });
  }

  /** Retire a record. The module's own list stops showing it immediately. */
  archive(module: string, recordId: number, reason?: string): Observable<any> {
    return this.http.post(BASE, { module, recordId, reason });
  }

  /** Bring a record back into its module's working list. */
  restore(module: string, recordId: number): Observable<any> {
    return this.http.post(`${BASE}/restore`, { module, recordId });
  }
}
