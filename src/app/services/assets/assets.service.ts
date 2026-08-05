import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

const BASE = `${environment.apiUrl}/assets`;

export type AssetStatus =
  | 'AVAILABLE' | 'ALLOCATED' | 'IN_REPAIR' | 'LOST' | 'SCRAPPED' | 'RETIRED';

export type ReturnCondition = 'GOOD' | 'MINOR_DAMAGE' | 'MAJOR_DAMAGE' | 'LOST';

export interface Asset {
  id?: number;
  companyId?: number | null;
  assetTag: string;
  name: string;
  category: string;
  serialNumber?: string | null;
  make?: string | null;
  model?: string | null;
  description?: string | null;
  purchaseDate?: string | null;
  purchaseCost: number;
  warrantyEnd?: string | null;
  currentValue: number;
  status: AssetStatus;
  location?: string | null;
  remarks?: string | null;
  // Flattened from the open allocation by the list endpoint.
  currentHolder?: { id: number; firstName: string; lastName: string; employeeCode: string } | null;
  allocatedOn?: string | null;
  allocationId?: number | null;
  allocations?: AssetAllocation[];
}

export interface AssetAllocation {
  id: number;
  assetId: number;
  employeeId: number;
  allocatedOn: string;
  dueOn?: string | null;
  purpose?: string | null;
  returnedOn?: string | null;
  returnCondition?: ReturnCondition | null;
  recoveryAmount: number;
  recoveryWaived: boolean;
  status: 'ALLOCATED' | 'RETURNED' | 'PENDING_RETURN' | 'LOST';
  remarks?: string | null;
  acknowledgedAt?: string | null;
  asset?: Asset;
  employee?: any;
}

export interface AssetSummary {
  totalAssets: number;
  totalPurchaseCost: number;
  totalCurrentValue: number;
  overdueReturns: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number; purchaseCost: number }[];
}

export interface ExitAssetReport {
  employeeId: number;
  clear: boolean;
  outstandingCount: number;
  outstandingValue: number;
  recoveryDue: number;
  outstanding: {
    allocationId: number; assetId: number; assetTag: string; name: string;
    category: string; allocatedOn: string; value: number;
  }[];
  returned: {
    allocationId: number; assetTag: string; name: string; returnedOn: string;
    returnCondition: string; recoveryAmount: number; recoveryWaived: boolean;
  }[];
}

@Injectable({ providedIn: 'root' })
export class AssetsService {
  constructor(private http: HttpClient) {}

  getMeta(): Observable<{ categories: string[]; returnConditions: string[]; statuses: string[] }> {
    return this.http.get<any>(`${BASE}/meta`);
  }

  getSummary(): Observable<AssetSummary> {
    return this.http.get<AssetSummary>(`${BASE}/summary`);
  }

  // ── Register ────────────────────────────────────────────────────────────────
  list(params: { search?: string; status?: string; category?: string; page?: number; limit?: number } = {}):
    Observable<{ data: Asset[]; total: number; page: number; limit: number }> {
    let p = new HttpParams();
    if (params.search)   p = p.set('search', params.search);
    if (params.status)   p = p.set('status', params.status);
    if (params.category) p = p.set('category', params.category);
    if (params.page)     p = p.set('page', params.page);
    if (params.limit)    p = p.set('limit', params.limit);
    return this.http.get<any>(BASE, { params: p });
  }

  get(id: number): Observable<Asset> {
    return this.http.get<Asset>(`${BASE}/${id}`);
  }

  save(data: Partial<Asset>): Observable<Asset> {
    return data.id
      ? this.http.patch<Asset>(`${BASE}/${data.id}`, data)
      : this.http.post<Asset>(BASE, data);
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<any>(`${BASE}/${id}`);
  }

  // ── Allocation ──────────────────────────────────────────────────────────────
  allocate(assetId: number, body: { employeeId: number; dueOn?: string; purpose?: string; remarks?: string }):
    Observable<AssetAllocation> {
    return this.http.post<AssetAllocation>(`${BASE}/${assetId}/allocate`, body);
  }

  returnAsset(allocationId: number, body: {
    returnCondition: ReturnCondition; recoveryAmount?: number;
    recoveryWaived?: boolean; remarks?: string;
  }): Observable<AssetAllocation> {
    return this.http.post<AssetAllocation>(`${BASE}/allocations/${allocationId}/return`, body);
  }

  acknowledge(allocationId: number): Observable<AssetAllocation> {
    return this.http.patch<AssetAllocation>(`${BASE}/allocations/${allocationId}/acknowledge`, {});
  }

  // ── Views ───────────────────────────────────────────────────────────────────
  listMine(): Observable<AssetAllocation[]> {
    return this.http.get<AssetAllocation[]>(`${BASE}/my`);
  }

  listForEmployee(employeeId: number): Observable<AssetAllocation[]> {
    return this.http.get<AssetAllocation[]>(`${BASE}/employee/${employeeId}`);
  }

  /** What the employee still holds — drives the exit clearance decision. */
  getExitReport(employeeId: number): Observable<ExitAssetReport> {
    return this.http.get<ExitAssetReport>(`${BASE}/exit/${employeeId}`);
  }
}
