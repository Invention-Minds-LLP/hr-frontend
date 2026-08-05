import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

const BASE = `${environment.apiUrl}/companies`;
const PAYROLL = `${environment.apiUrl}/payroll`;

export interface Company {
  id: number;
  name: string;
  legalName?: string | null;
  isDefault: boolean;
  isActive: boolean;
  pan?: string | null;
  tan?: string | null;
  gstin?: string | null;
  cin?: string | null;
  pfEstablishmentCode?: string | null;
  esiEmployerCode?: string | null;
  ptRegistrationNumber?: string | null;
  lwfRegistrationNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  signatoryName?: string | null;
  signatoryDesignation?: string | null;
  signatoryPlace?: string | null;
  logoUrl?: string | null;
  _count?: { employees: number; payrollRuns: number };
  statutoryConfigs?: StatutoryConfig[];
}

export interface PtSlab {
  upTo: number | null;
  amount: number;
  februaryAmount?: number;
}

export interface StatutoryConfig {
  id?: number;
  companyId?: number;
  effectiveFrom: string;
  notes?: string | null;

  pfEnabled: boolean;
  pfEmployeeRate: number;
  pfEmployerRate: number;
  pfWageCeiling: number;
  pfCapAtCeiling: boolean;
  pfAdminChargeRate: number;
  edliRate: number;
  epsRate: number;

  esiEnabled: boolean;
  esiEmployeeRate: number;
  esiEmployerRate: number;
  esiWageLimit: number;

  ptEnabled: boolean;
  ptState?: string | null;
  ptSlabs?: PtSlab[] | null;

  lwfEnabled: boolean;
  lwfState?: string | null;
  lwfEmployeeAmount: number;
  lwfEmployerAmount: number;
  lwfFrequency: 'MONTHLY' | 'HALF_YEARLY' | 'YEARLY';
  lwfDeductionMonths?: number[] | null;

  gratuityEnabled: boolean;
  gratuityRate: number;
  gratuityMinYears: number;

  bonusEnabled: boolean;
  bonusRate: number;
  bonusEligibilityWage: number;
  bonusCalculationCap: number;

  leaveEncashEnabled: boolean;
  leaveEncashDaysYear: number;
}

export interface StatutorySummary {
  companyId: number;
  month: number;
  year: number;
  payslipCount: number;
  pf: { employee: number; employer: number; adminCharges: number; edli: number };
  esi: { employee: number; employer: number };
  pt: { total: number };
  lwf: { employee: number; employer: number };
  tds: { total: number };
  provisions: { gratuity: number; bonus: number; leaveEncashment: number };
}

export interface StatutoryFiling {
  id: number;
  companyId: number;
  type: 'PF_ECR' | 'ESI' | 'PT' | 'LWF';
  month: number;
  year: number;
  employeeCount: number;
  totalEmployee: number;
  totalEmployer: number;
  totalAmount: number;
  status: 'GENERATED' | 'FILED';
  generatedAt: string;
  filedAt?: string | null;
  reference?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CompanyService {
  constructor(private http: HttpClient) {}

  // ── Companies ───────────────────────────────────────────────────────────────
  list(): Observable<{ data: Company[]; unassignedEmployees: number }> {
    return this.http.get<any>(BASE);
  }

  get(id: number): Observable<Company> {
    return this.http.get<Company>(`${BASE}/${id}`);
  }

  create(data: Partial<Company>): Observable<Company> {
    return this.http.post<Company>(BASE, data);
  }

  update(id: number, data: Partial<Company>): Observable<Company> {
    return this.http.patch<Company>(`${BASE}/${id}`, data);
  }

  setDefault(id: number): Observable<any> {
    return this.http.patch(`${BASE}/${id}/default`, {});
  }

  assignEmployees(id: number, employeeIds: number[]): Observable<{ companyId: number; updated: number }> {
    return this.http.post<any>(`${BASE}/${id}/employees`, { employeeIds });
  }

  backfill(): Observable<any> {
    return this.http.post(`${BASE}/backfill`, {});
  }

  // ── Statutory config ────────────────────────────────────────────────────────
  listStatutoryConfigs(companyId: number): Observable<StatutoryConfig[]> {
    return this.http.get<StatutoryConfig[]>(`${BASE}/${companyId}/statutory`);
  }

  upsertStatutoryConfig(companyId: number, data: Partial<StatutoryConfig>): Observable<StatutoryConfig> {
    return this.http.post<StatutoryConfig>(`${BASE}/${companyId}/statutory`, data);
  }

  deleteStatutoryConfig(companyId: number, configId: number): Observable<any> {
    return this.http.delete(`${BASE}/${companyId}/statutory/${configId}`);
  }

  // ── Statutory returns (live under /api/payroll) ─────────────────────────────
  getStatutorySummary(month: number, year: number, companyId?: number): Observable<StatutorySummary> {
    let p = new HttpParams().set('month', month).set('year', year);
    if (companyId) p = p.set('companyId', companyId);
    return this.http.get<StatutorySummary>(`${PAYROLL}/statutory/summary`, { params: p });
  }

  downloadStatutoryFile(
    type: 'PF_ECR' | 'ESI' | 'PT' | 'LWF', month: number, year: number, companyId?: number,
  ): Observable<Blob> {
    let p = new HttpParams().set('month', month).set('year', year);
    if (companyId) p = p.set('companyId', companyId);
    return this.http.get(`${PAYROLL}/statutory/${type}`, { params: p, responseType: 'blob' });
  }

  listFilings(year?: number, companyId?: number): Observable<StatutoryFiling[]> {
    let p = new HttpParams();
    if (year) p = p.set('year', year);
    if (companyId) p = p.set('companyId', companyId);
    return this.http.get<StatutoryFiling[]>(`${PAYROLL}/statutory/filings`, { params: p });
  }

  markFiled(id: number, reference: string): Observable<StatutoryFiling> {
    return this.http.patch<StatutoryFiling>(`${PAYROLL}/statutory/filings/${id}/filed`, { reference });
  }
}
