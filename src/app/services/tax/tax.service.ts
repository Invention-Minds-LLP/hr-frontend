import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

const BASE = `${environment.apiUrl}/tax`;

export type Regime = 'OLD' | 'NEW';

export interface TaxProfile {
  id?: number;
  employeeId: number;
  companyId?: number | null;
  financialYear: string;
  regime: Regime;
  regimeLocked: boolean;
  autoComputeTds: boolean;
  rentPaidAnnual: number;
  metroCity: boolean;
  landlordPan?: string | null;
  previousEmployerIncome: number;
  previousEmployerTds: number;
  previousEmployerPf: number;
  otherIncome: number;
  housePropertyLoss: number;
}

export interface DeclarationItem {
  id?: number;
  declarationId?: number;
  section: string;
  category: string;
  description?: string | null;
  declaredAmount: number;
  approvedAmount: number;
  proofUrl?: string | null;
  proofStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  remarks?: string | null;
}

export interface TaxDeclaration {
  id?: number;
  employeeId: number;
  financialYear: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED';
  submittedAt?: string | null;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  remarks?: string | null;
  totalDeclared: number;
  totalApproved: number;
  items: DeclarationItem[];
  employee?: any;
}

export interface TaxBreakdown {
  regime: Regime;
  financialYear: string;
  grossSalary: number;
  previousEmployerIncome: number;
  otherIncome: number;
  hraExemption: number;
  professionalTaxDeduction: number;
  standardDeduction: number;
  housePropertyLoss: number;
  chapterViaDeductions: number;
  chapterViaBreakup: Record<string, number>;
  taxableIncome: number;
  taxBeforeRebate: number;
  rebate87A: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  totalTaxLiability: number;
  previousEmployerTds: number;
  netTaxPayable: number;
}

export interface RegimeComparison {
  old: TaxBreakdown;
  new: TaxBreakdown;
  recommended: Regime;
  saving: number;
}

export interface TaxProjection {
  financialYear: string;
  regime: Regime;
  autoComputeTds: boolean;
  tdsDeductedSoFar: number;
  breakdown: TaxBreakdown;
  comparison: RegimeComparison;
  sectionCaps: Record<string, number>;
}

export interface DeclarationSection {
  section: string;
  label: string;
  cap: number | null;
  categories: string[];
}

export interface Form16Record {
  id: number;
  employeeId: number;
  financialYear: string;
  regime: Regime;
  grossSalary: number;
  taxableIncome: number;
  totalTaxPayable: number;
  tdsDeducted: number;
  balanceTax: number;
  generatedAt: string;
  emailedAt?: string | null;
  employee?: any;
}

@Injectable({ providedIn: 'root' })
export class TaxService {
  constructor(private http: HttpClient) {}

  /** Current Indian financial year label, e.g. "2026-27". April–March. */
  currentFinancialYear(): string {
    const now = new Date();
    const start = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
  }

  /** Last N financial years, newest first — for the FY selector. */
  financialYearOptions(count = 4): string[] {
    const current = this.currentFinancialYear();
    const start = Number(current.slice(0, 4));
    return Array.from({ length: count }, (_, i) => {
      const s = start - i;
      return `${s}-${String((s + 1) % 100).padStart(2, '0')}`;
    });
  }

  // ── Reference data ──────────────────────────────────────────────────────────
  getSections(): Observable<{ sections: DeclarationSection[]; note: string }> {
    return this.http.get<any>(`${BASE}/sections`);
  }

  // ── Profile ─────────────────────────────────────────────────────────────────
  // Omitting employeeId acts on the logged-in user; passing one is the HR view.
  getProfile(financialYear: string, employeeId?: number): Observable<TaxProfile> {
    const p = new HttpParams().set('financialYear', financialYear);
    const url = employeeId ? `${BASE}/profile/${employeeId}` : `${BASE}/profile`;
    return this.http.get<TaxProfile>(url, { params: p });
  }

  updateProfile(data: Partial<TaxProfile> & { financialYear: string }, employeeId?: number): Observable<TaxProfile> {
    const url = employeeId ? `${BASE}/profile/${employeeId}` : `${BASE}/profile`;
    return this.http.patch<TaxProfile>(url, data);
  }

  // ── Declarations ────────────────────────────────────────────────────────────
  getDeclaration(financialYear: string, employeeId?: number): Observable<TaxDeclaration> {
    let p = new HttpParams().set('financialYear', financialYear);
    if (employeeId) p = p.set('employeeId', employeeId);
    return this.http.get<TaxDeclaration>(`${BASE}/declaration`, { params: p });
  }

  saveDeclaration(financialYear: string, items: Partial<DeclarationItem>[]): Observable<TaxDeclaration> {
    return this.http.post<TaxDeclaration>(`${BASE}/declaration`, { financialYear, items });
  }

  submitDeclaration(financialYear: string): Observable<TaxDeclaration> {
    return this.http.post<TaxDeclaration>(`${BASE}/declaration/submit`, { financialYear });
  }

  listDeclarations(params: { financialYear: string; status?: string; page?: number; limit?: number }):
    Observable<{ data: TaxDeclaration[]; total: number; page: number; limit: number }> {
    let p = new HttpParams().set('financialYear', params.financialYear);
    if (params.status) p = p.set('status', params.status);
    if (params.page)   p = p.set('page', params.page);
    if (params.limit)  p = p.set('limit', params.limit);
    return this.http.get<any>(`${BASE}/declarations`, { params: p });
  }

  reviewDeclaration(
    id: number,
    body: { items: { id: number; approvedAmount: number; proofStatus?: string; remarks?: string }[]; remarks?: string; status?: string },
  ): Observable<TaxDeclaration> {
    return this.http.patch<TaxDeclaration>(`${BASE}/declarations/${id}/review`, body);
  }

  // ── Projection ──────────────────────────────────────────────────────────────
  getProjection(employeeId?: number, month?: number, year?: number): Observable<TaxProjection> {
    let p = new HttpParams();
    if (month) p = p.set('month', month);
    if (year)  p = p.set('year', year);
    const url = employeeId ? `${BASE}/projection/${employeeId}` : `${BASE}/projection`;
    return this.http.get<TaxProjection>(url, { params: p });
  }

  getComparison(employeeId?: number): Observable<RegimeComparison & { financialYear: string; currentRegime: Regime; annualGrossSalary: number; tdsDeductedSoFar: number }> {
    const url = employeeId ? `${BASE}/comparison/${employeeId}` : `${BASE}/comparison`;
    return this.http.get<any>(url);
  }

  // ── Form 16 ─────────────────────────────────────────────────────────────────
  listForm16(financialYear: string): Observable<Form16Record[]> {
    const p = new HttpParams().set('financialYear', financialYear);
    return this.http.get<Form16Record[]>(`${BASE}/form16`, { params: p });
  }

  downloadForm16(financialYear: string, employeeId?: number): Observable<Blob> {
    const p = new HttpParams().set('financialYear', financialYear);
    const url = employeeId ? `${BASE}/form16/download/${employeeId}` : `${BASE}/form16/download`;
    return this.http.get(url, { params: p, responseType: 'blob' });
  }

  emailForm16(financialYear: string, employeeIds?: number[]):
    Observable<{ financialYear: string; requested: number; sent: number; failed: { employeeId: number; reason: string }[] }> {
    return this.http.post<any>(`${BASE}/form16/email`, { financialYear, employeeIds });
  }
}
