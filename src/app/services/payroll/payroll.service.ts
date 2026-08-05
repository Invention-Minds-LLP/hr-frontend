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
  lta?: number;
  mobileInternet?: number;
  mealFuel?: number;
  pfApplicable: boolean;
  esiApplicable: boolean;
  ptApplicable: boolean;
  tdsMonthly: number;
  effectiveFrom?: string;
  employee?: any;
}

export interface PayrollRun {
  id: number;
  // Legal entity the run belongs to. Omitted on create → the default company.
  companyId?: number | null;
  month: number;
  year: number;
  status: 'DRAFT' | 'PUBLISHED';
  notes?: string;
  processedBy: number;
  // Month-end freeze. A locked run cannot be deleted, re-imported, or have
  // arrears pushed into it.
  lockedAt?: string | null;
  lockedBy?: number | null;
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
  // Phase 1 statutory additions. LWF is a deduction; the rest are employer cost
  // and are deliberately NOT part of totalDeductions or netPay.
  lwfEmployee?: number;
  lwfEmployer?: number;
  pfAdminCharges?: number;
  edliCharges?: number;
  gratuityProvision?: number;
  bonusProvision?: number;
  leaveEncashProvision?: number;
  // How `tds` was arrived at: AUTO = projected by the tax engine for the
  // remaining months of the FY, MANUAL = SalaryStructure.tdsMonthly.
  tdsMode?: 'AUTO' | 'MANUAL';
  taxRegime?: 'OLD' | 'NEW' | null;
  variableIncentive?: number;
  salaryRevisionArrear?: number;
  otherAddition?: number;
  petrolReimb?: number;
  driverReimb?: number;
  advanceRecovery?: number;
  otherDeduction?: number;
  totalDeductions: number;
  netPay: number;
  remarks?: string;
  employee?: any;
  payrollRun?: any;
}

/** One row of the working-sheet import preview. */
export interface ImportRowChange {
  employeeCode: string;
  employeeId: number | null;
  payslipId: number | null;
  changes: Record<string, { from: any; to: any }>;
  errors: string[];
}

export interface ImportReport {
  runId: number;
  templateId: string;
  sheetName: string;
  totalRows: number;
  matchedRows: number;
  changedRows: number;
  unmatchedCodes: string[];
  rows: ImportRowChange[];
  columnsRead: string[];
  ignoredColumns: string[];
}

export interface ArrearMonthDetail {
  month: number;
  year: number;
  payslipId: number;
  workingDays: number;
  lopDays: number;
  paidGross: number;
  revisedGross: number;
  grossDiff: number;
  pfDiff: number;
  esiDiff: number;
}

export interface ArrearComputation {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
  grossArrear: number;
  pfArrear: number;
  esiArrear: number;
  totalArrear: number;
  months: ArrearMonthDetail[];
  skippedMonths: { month: number; year: number; reason: string }[];
}

export interface ArrearPreview {
  count: number;
  totalArrear: number;
  totalGross: number;
  results: ArrearComputation[];
}

export interface SalaryArrear {
  id: number;
  employeeId: number;
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
  grossArrear: number;
  pfArrear: number;
  esiArrear: number;
  totalArrear: number;
  status: 'PENDING' | 'APPLIED' | 'CANCELLED';
  appliedPayslipId?: number | null;
  appliedAt?: string | null;
  reason?: string | null;
  createdAt: string;
  employee?: any;
}


// ── Salary structure templates ───────────────────────────────────────────────

export interface TemplateComponent {
  id?: number;
  key: string;
  label: string;
  percentage: number;
  isFixed: boolean;
  fixedAmount: number;
  isBalancing: boolean;
  orderNo?: number;
}

export interface SalaryTemplate {
  id?: number;
  companyId?: number | null;
  name: string;
  code?: string | null;
  description?: string | null;
  basis?: string;
  isActive: boolean;
  departmentId?: number | null;
  designationId?: number | null;
  roleId?: number | null;
  branchId?: number | null;
  employmentType?: string | null;
  pfApplicable: boolean;
  esiApplicable: boolean;
  ptApplicable: boolean;
  components: TemplateComponent[];
  department?: { name: string };
  designation?: { name: string };
  _count?: { assignments: number };
}

export interface TemplateValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalPercentage: number;
  totalFixed: number;
}

export type TemplateInputMode = 'GROSS' | 'CTC' | 'NET';

export interface TemplatePreview {
  inputMode: TemplateInputMode;
  inputAmount: number;
  components: Record<string, number>;
  monthlyGross: number;
  monthlyCtc: number;
  monthlyNet: number;
  annualGross: number;
  annualCtc: number;
  employerPf: number;
  deductions: { pf: number; esi: number; pt: number; lwf: number; tds: number; total: number };
  netSolve?: {
    monthlyGross: number; achievedNet: number; requestedNet: number;
    variance: number; exact: boolean; note?: string;
  };
}

export interface EligibleEmployee {
  id: number;
  employeeCode: string;
  name: string;
  department: string | null;
  designation: string | null;
  branch: string | null;
  role: string | null;
  employmentType: string | null;
  hasStructure: boolean;
  currentGross: number | null;
}

export interface AssignResult {
  dryRun: boolean;
  templateName: string;
  inputMode: TemplateInputMode;
  applied: number;
  skippedCount: number;
  skipped: { employeeId: number; reason: string }[];
  inexactNetCount: number;
  warnings: string[];
  results: Array<{
    employeeId: number; inputAmount: number; monthlyGross: number;
    monthlyCtc: number; monthlyNet: number; previousGross: number;
    components: Record<string, number>;
    netVariance: number; netExact: boolean; netNote?: string;
  }>;
}

// ── Attendance calendar ──────────────────────────────────────────────────────

export interface CalendarDay {
  date: string;
  day: number;
  weekday: string;
  isWeekend: boolean;
  status: string | null;
  checkIn: string | null;
  checkOut: string | null;
  workedMinutes: number | null;
  shiftName: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  lateMinutes: number;
  lateApproved: boolean;
  lateApprovalNote: string | null;
  earlyMinutes: number;
  otMinutes: number;
  otStatus: string | null;
  otApproved: boolean;
  leaveType: string | null;
  leaveStatus: string | null;
  isHalfDay: boolean;
  leaveIsLop: boolean;
  holidayName: string | null;
  payTreatment: 'PAID' | 'LOP' | 'HALF' | 'NOT_APPLICABLE';
  isForcedPresent: boolean;
  isPunchCorrected: boolean;
  isOverridden: boolean;
  source: string | null;
  remarks: string | null;
}

export interface CalendarSummary {
  totalDays: number; workingDays: number; presentDays: number; weekOffDays: number;
  holidayDays: number; leaveDays: number; paidLeaveDays: number; lopDays: number;
  halfDays: number; wfhDays: number; compOffDays: number; absentDays: number;
  lateCount: number; lateMinutesTotal: number; lateApprovedCount: number; lateUnapprovedCount: number;
  earlyCount: number; earlyMinutesTotal: number;
  otMinutesTotal: number; otApprovedMinutes: number; otPendingMinutes: number;
  forcedPresentCount: number; punchCorrectedCount: number; overriddenCount: number; missingPunchCount: number;
}

export interface EmployeeCalendar {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  department: string | null;
  designation: string | null;
  month: number;
  year: number;
  days: CalendarDay[];
  summary: CalendarSummary;
  exceptions: string[];
}

export interface LoanIncentivePreview {
  employeeId: number;
  loanRecovery: number;
  incentivePayout: number;
  loans: Array<{
    loanId: number; loanType: string; emiAmount: number; recoverAmount: number;
    outstandingBefore: number; outstandingAfter: number; isFinalInstalment: boolean; note?: string;
  }>;
  incentives: Array<{ incentiveId: number; type: string; amount: number; description: string | null; effectiveDate: string }>;
  notes: string[];
}

export interface PayslipCalendarResponse {
  runId: number;
  payslip: Payslip | null;
  calendar: EmployeeCalendar;
  adjustments: LoanIncentivePreview;
  reconciliation: {
    payslipWorkingDays: number; payslipPresentDays: number; payslipLopDays: number;
    calendarWorkingDays: number; calendarPresentDays: number; calendarLopDays: number;
    lopMatches: boolean; otPaidHours: number; otApprovedHours: number;
  } | null;
}

export interface RunExceptions {
  runId: number; month: number; year: number; status: string;
  employeeCount: number; totalExceptions: number; employeesWithIssues: number;
  rows: Array<{
    employeeId: number; employeeCode: string; name: string; department: string | null;
    netPay: number; lopDays: number; summary: CalendarSummary;
    issues: string[]; issueCount: number;
  }>;
}

export interface RunAdjustments {
  runId: number; status: string; settled: boolean;
  totalRecovery: number; totalIncentive: number; employeeCount: number;
  rows: Array<{
    employeeId: number; employeeCode: string; name: string; payslipId: number;
    loanRecovery: number; incentivePayout: number;
    loans: LoanIncentivePreview['loans'];
    incentives: LoanIncentivePreview['incentives'];
    notes: string[];
  }>;
}


// ── Payroll dispatch to Finance ──────────────────────────────────────────────

export interface PayrollDispatchRow {
  id: number;
  payrollRunId: number;
  recipients: string;
  ccList?: string | null;
  subject: string;
  note?: string | null;
  templates: string;
  mode: string;
  fileNames?: string | null;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployerCost: number;
  status: 'SENT' | 'FAILED';
  error?: string | null;
  sentAt: string;
}

export interface DispatchPreview {
  runId: number;
  month: number;
  year: number;
  status: string;
  monthLabel: string;
  company: { id: number; name: string; financeEmails?: string | null } | null;
  defaultRecipients: string;
  templates: { id: string; label: string; modes: string[] }[];
  totals: {
    employeeCount: number; totalGross: number; totalDeductions: number;
    totalNet: number; totalEmployerCost: number; totalPf: number;
    totalEsi: number; totalPt: number; totalTds: number;
    totalLoanRecovery: number; totalIncentive: number;
  };
  blockers: string[];
  warnings: string[];
  previousDispatches: PayrollDispatchRow[];
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

  createPayrollRun(data: { month: number; year: number; notes?: string; companyId?: number }): Observable<PayrollRun> {
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

  // ── Month-end freeze ───────────────────────────────────────────────────────
  lockPayrollRun(id: number): Observable<PayrollRun> {
    return this.http.patch<PayrollRun>(`${BASE}/runs/${id}/lock`, {});
  }

  unlockPayrollRun(id: number): Observable<PayrollRun> {
    return this.http.patch<PayrollRun>(`${BASE}/runs/${id}/unlock`, {});
  }

  // ── Payslip distribution ───────────────────────────────────────────────────
  downloadPayslipPdf(payslipId: number, protect = false): Observable<Blob> {
    const p = new HttpParams().set('protect', String(protect));
    return this.http.get(`${BASE}/payslips/${payslipId}/pdf`, { params: p, responseType: 'blob' });
  }

  emailPayslips(runId: number, opts: { protect?: boolean; employeeIds?: number[] } = {}):
    Observable<{ runId: number; requested: number; sent: number; failed: { employeeId: number; reason: string }[] }> {
    return this.http.post<any>(`${BASE}/runs/${runId}/email-payslips`, opts);
  }

  // ── Working-sheet import ───────────────────────────────────────────────────
  // Two-step: preview reports what would change, import commits it.
  previewSheetImport(runId: number, file: File, templateId?: string): Observable<ImportReport> {
    const form = new FormData();
    form.append('file', file);
    let p = new HttpParams();
    if (templateId) p = p.set('template', templateId);
    return this.http.post<ImportReport>(`${BASE}/runs/${runId}/import/preview`, form, { params: p });
  }

  applySheetImport(runId: number, file: File, templateId?: string, force = false):
    Observable<{ message: string; updated: number; skipped: number; unmatchedCodes: string[] }> {
    const form = new FormData();
    form.append('file', file);
    let p = new HttpParams().set('force', String(force));
    if (templateId) p = p.set('template', templateId);
    return this.http.post<any>(`${BASE}/runs/${runId}/import`, form, { params: p });
  }

  // ── Arrears ────────────────────────────────────────────────────────────────
  previewArrears(employeeId?: number): Observable<ArrearPreview> {
    let p = new HttpParams();
    if (employeeId) p = p.set('employeeId', employeeId);
    return this.http.get<ArrearPreview>(`${BASE}/arrears/preview`, { params: p });
  }

  generateArrears(employeeIds?: number[], reason?: string): Observable<{ created: number; arrears: SalaryArrear[] }> {
    return this.http.post<any>(`${BASE}/arrears/generate`, { employeeIds, reason });
  }

  listArrears(status?: string): Observable<SalaryArrear[]> {
    let p = new HttpParams();
    if (status) p = p.set('status', status);
    return this.http.get<SalaryArrear[]>(`${BASE}/arrears`, { params: p });
  }

  applyArrears(payrollRunId: number, arrearIds?: number[]):
    Observable<{ runId: number; applied: number; skipped: { arrearId: number; reason: string }[] }> {
    return this.http.post<any>(`${BASE}/arrears/apply`, { payrollRunId, arrearIds });
  }

  cancelArrear(id: number): Observable<SalaryArrear> {
    return this.http.patch<SalaryArrear>(`${BASE}/arrears/${id}/cancel`, {});
  }

  // Available payroll sheet formats (working sheet, salary register, …).
  listSheetTemplates(): Observable<{ id: string; label: string; modes: ('template' | 'snapshot')[] }[]> {
    return this.http.get<any>(`${BASE}/sheet-templates`);
  }

  // Payroll sheet export (styled .xlsx). templateId picks the org format; mode:
  // 'template' = blank input cells + live formulas; 'snapshot' = values baked in.
  // The backend coerces mode to what the chosen template supports.
  downloadWorkingSheet(id: number, templateId: string, mode: 'template' | 'snapshot' = 'template'): Observable<Blob> {
    const p = new HttpParams().set('mode', mode).set('template', templateId);
    return this.http.get(`${BASE}/runs/${id}/working-sheet.xlsx`, { params: p, responseType: 'blob' });
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
  // ── Salary structure templates ─────────────────────────────────────────────
  getTemplateMeta(): Observable<any> {
    return this.http.get<any>(`${BASE}/templates/meta`);
  }

  listSalaryTemplates(params: { departmentId?: number; designationId?: number; includeInactive?: boolean } = {}):
    Observable<SalaryTemplate[]> {
    let p = new HttpParams();
    if (params.departmentId)  p = p.set('departmentId', params.departmentId);
    if (params.designationId) p = p.set('designationId', params.designationId);
    if (params.includeInactive) p = p.set('includeInactive', 'true');
    return this.http.get<SalaryTemplate[]>(`${BASE}/templates`, { params: p });
  }

  getSalaryTemplate(id: number): Observable<SalaryTemplate> {
    return this.http.get<SalaryTemplate>(`${BASE}/templates/${id}`);
  }

  saveSalaryTemplate(data: Partial<SalaryTemplate>): Observable<SalaryTemplate & { validation: TemplateValidation }> {
    return data.id
      ? this.http.patch<any>(`${BASE}/templates/${data.id}`, data)
      : this.http.post<any>(`${BASE}/templates`, data);
  }

  deleteSalaryTemplate(id: number): Observable<{ message: string }> {
    return this.http.delete<any>(`${BASE}/templates/${id}`);
  }

  /** Live 100%-check for the builder, without saving. */
  validateSalaryTemplate(components: TemplateComponent[]): Observable<TemplateValidation> {
    return this.http.post<TemplateValidation>(`${BASE}/templates/validate`, { components });
  }

  previewSalaryTemplate(body: {
    templateId?: number; components?: TemplateComponent[];
    inputMode: TemplateInputMode; inputAmount: number;
    pfApplicable?: boolean; esiApplicable?: boolean; ptApplicable?: boolean;
  }): Observable<TemplatePreview> {
    return this.http.post<TemplatePreview>(`${BASE}/templates/preview`, body);
  }

  listEligibleEmployees(filters: {
    departmentId?: number; designationId?: number; roleId?: number; branchId?: number;
    employmentType?: string; search?: string; onlyWithoutStructure?: boolean;
  } = {}): Observable<{ total: number; data: EligibleEmployee[] }> {
    let p = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    });
    return this.http.get<any>(`${BASE}/templates/eligible`, { params: p });
  }

  assignSalaryTemplate(body: {
    templateId: number; inputMode: TemplateInputMode;
    assignments: { employeeId: number; amount: number }[];
    dryRun?: boolean; overwrite?: boolean; effectiveFrom?: string;
  }): Observable<AssignResult> {
    return this.http.post<AssignResult>(`${BASE}/templates/assign`, body);
  }

  getAssignmentHistory(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/templates/assignments/${employeeId}`);
  }

  // ── Approval calendar ──────────────────────────────────────────────────────
  getPayslipCalendar(runId: number, employeeId: number): Observable<PayslipCalendarResponse> {
    return this.http.get<PayslipCalendarResponse>(`${BASE}/runs/${runId}/calendar/${employeeId}`);
  }

  getEmployeeCalendar(employeeId: number, month: number, year: number): Observable<EmployeeCalendar> {
    const p = new HttpParams().set('month', month).set('year', year);
    return this.http.get<EmployeeCalendar>(`${BASE}/calendar/${employeeId}`, { params: p });
  }

  getRunExceptions(runId: number): Observable<RunExceptions> {
    return this.http.get<RunExceptions>(`${BASE}/runs/${runId}/exceptions`);
  }

  getRunAdjustments(runId: number): Observable<RunAdjustments> {
    return this.http.get<RunAdjustments>(`${BASE}/runs/${runId}/adjustments`);
  }
  // ── Dispatch the workbook to Finance ───────────────────────────────────────
  getDispatchPreview(runId: number): Observable<DispatchPreview> {
    return this.http.get<DispatchPreview>(`${BASE}/runs/${runId}/dispatch-preview`);
  }

  dispatchPayrollSheet(runId: number, body: {
    to: string; cc?: string; templates?: string[];
    mode?: 'template' | 'snapshot'; note?: string;
    subject?: string; acknowledgeDraft?: boolean;
  }): Observable<{ message: string; dispatch: PayrollDispatchRow; attachments: string[]; wasDraft: boolean }> {
    return this.http.post<any>(`${BASE}/runs/${runId}/dispatch`, body);
  }

  listDispatches(runId: number): Observable<PayrollDispatchRow[]> {
    return this.http.get<PayrollDispatchRow[]>(`${BASE}/runs/${runId}/dispatches`);
  }
}
