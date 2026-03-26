import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

const BASE = `${environment.apiUrl}/payroll`;

export interface SalaryStructure {
  id?: number;
  employeeId: number;
  basic: number;
  hra: number;
  medicalAllowance: number;
  travelAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  pfApplicable: boolean;
  esiApplicable: boolean;
  ptApplicable: boolean;
  tdsMonthly: number;
  effectiveFrom?: string;
  employee?: any;
}

export interface PayrollRun {
  id: number;
  month: number;
  year: number;
  status: 'DRAFT' | 'PUBLISHED';
  notes?: string;
  processedBy: number;
  createdAt: string;
  payslips?: Payslip[];
  _count?: { payslips: number };
}

export interface Payslip {
  id: number;
  employeeId: number;
  payrollRunId: number;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  lopDays: number;
  overtimeHours: number;
  overtimePay: number;
  basic: number;
  hra: number;
  medicalAllowance: number;
  travelAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  grossEarnings: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  tds: number;
  totalDeductions: number;
  netPay: number;
  remarks?: string;
  employee?: any;
  payrollRun?: any;
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  constructor(private http: HttpClient) {}

  // ── Salary Structures ──────────────────────────────────────────────────────
  listSalaryStructures(params: { search?: string; page?: number; limit?: number } = {}): Observable<{ data: SalaryStructure[]; total: number }> {
    let p = new HttpParams();
    if (params.search) p = p.set('search', params.search);
    if (params.page)   p = p.set('page', params.page);
    if (params.limit)  p = p.set('limit', params.limit);
    return this.http.get<any>(`${BASE}/salary-structures`, { params: p });
  }

  getEmployeeSalaryStructure(employeeId: number): Observable<SalaryStructure> {
    return this.http.get<SalaryStructure>(`${BASE}/salary-structures/${employeeId}`);
  }

  upsertSalaryStructure(data: Partial<SalaryStructure>): Observable<SalaryStructure> {
    return this.http.post<SalaryStructure>(`${BASE}/salary-structures`, data);
  }

  // ── Payroll Runs ───────────────────────────────────────────────────────────
  listPayrollRuns(): Observable<PayrollRun[]> {
    return this.http.get<PayrollRun[]>(`${BASE}/runs`);
  }

  createPayrollRun(data: { month: number; year: number; notes?: string }): Observable<PayrollRun> {
    return this.http.post<PayrollRun>(`${BASE}/runs`, data);
  }

  getPayrollRun(id: number): Observable<PayrollRun> {
    return this.http.get<PayrollRun>(`${BASE}/runs/${id}`);
  }

  publishPayrollRun(id: number): Observable<PayrollRun> {
    return this.http.patch<PayrollRun>(`${BASE}/runs/${id}/publish`, {});
  }

  deletePayrollRun(id: number): Observable<any> {
    return this.http.delete(`${BASE}/runs/${id}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  getPayrollSummary(month: number, year: number): Observable<any> {
    const p = new HttpParams().set('month', month).set('year', year);
    return this.http.get<any>(`${BASE}/summary`, { params: p });
  }

  // ── Payslips ───────────────────────────────────────────────────────────────
  listPayslips(params: { month?: number; year?: number; employeeId?: number; page?: number; limit?: number } = {}): Observable<{ data: Payslip[]; total: number }> {
    let p = new HttpParams();
    if (params.month)      p = p.set('month', params.month);
    if (params.year)       p = p.set('year', params.year);
    if (params.employeeId) p = p.set('employeeId', params.employeeId);
    if (params.page)       p = p.set('page', params.page);
    if (params.limit)      p = p.set('limit', params.limit);
    return this.http.get<any>(`${BASE}/payslips`, { params: p });
  }

  getMyPayslips(): Observable<Payslip[]> {
    return this.http.get<Payslip[]>(`${BASE}/payslips/my`);
  }

  getPayslip(id: number): Observable<Payslip> {
    return this.http.get<Payslip>(`${BASE}/payslips/${id}`);
  }

  updateRemarks(id: number, remarks: string): Observable<Payslip> {
    return this.http.patch<Payslip>(`${BASE}/payslips/${id}/remarks`, { remarks });
  }
}
