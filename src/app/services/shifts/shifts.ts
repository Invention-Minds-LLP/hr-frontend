import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class Shifts {
  private apiUrl = environment.apiUrl + '/shifts';
  // private apiUrl = 'http://localhost:3002/api/shifts';

  constructor(private http: HttpClient) { }

  /* ==========================
     SHIFT TEMPLATE METHODS
     ========================== */

  // Create Shift Template
  createShiftTemplate(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/templates`, data);
  }

  // Get All Shift Templates
  getShiftTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/templates`);
  }

  // Get Single Shift Template by ID
  getShiftTemplateById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/templates/${id}`);
  }

  // Update Shift Template
  updateShiftTemplate(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/templates/${id}`, data);
  }

  // Delete Shift Template
  deleteShiftTemplate(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/templates/${id}`);
  }

  /* ==========================
     SHIFT ASSIGNMENT METHODS
     ========================== */

  // Assign Shift to Employee
  assignShift(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/assignments`, data);
  }

  // Get All Shift Assignments
  getShiftAssignments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/assignments`);
  }

  // Get Assignments by Employee
  getAssignmentsByEmployee(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/assignments/employee/${employeeId}`);
  }

  getEmployeeWeeklyShiftsForMonth(employeeId: number, month: number, year: number) {
  return this.http.get<{ mode: string | null; weeks: any[] }>(
    `${this.apiUrl}/weekly-month`,
    {
      params: {
        employeeId,
        month,
        year
      }
    }
  );
}

  // Update Shift Assignment (acknowledge or modify)
  updateShiftAssignment(id: number, data: Partial<any>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/assignments/${id}`, data);
  }

  // Delete Shift Assignment
  deleteShiftAssignment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/assignments/${id}`);
  }

  // shifts.service.ts
  getRotationPatterns() {
    return this.http.get<any[]>(`${this.apiUrl}/rotation-patterns`);
  }
  assignRotational(body: { employeeId: number; patternId: number; startDate: string }) {
    return this.http.post(`${this.apiUrl}/assign-rotational`, body);
  }
  getEmployeeShifts(params?: any) {
    return this.http.get<any[]>(`${this.apiUrl}/employee-shifts`, { params });
  }

  updateEmployeeShift(assignmentId: number, shiftId: number) {
    return this.http.put(`${this.apiUrl}/employee-shifts/${assignmentId}`, {
      shiftId
    });
  }
  assignFixedShift(body: { employeeId: number; shiftId: number; startDate?: string }) {
    return this.http.post(`${this.apiUrl}/assign-fixed`, body);
  }
  createRotationPattern(body: any) {
    return this.http.post<any>(`${this.apiUrl}/rotation-patterns`, body);
  }

  addRotationItemsBulk(patternId: number, items: any[]) {
    return this.http.post(
      `${this.apiUrl}/rotation-patterns/${patternId}/items/bulk`,
      { items }
    );
  }
  getExecutiveShifts(departmentId: number) {
    return this.http.get<any[]>(
      `${this.apiUrl}/manager/shift-templates`,
      { params: { departmentId } }
    );
  }


  // 🔁 Manager rotation patterns
  getManagerPatterns() {
    return this.http.get<any[]>(`${this.apiUrl}/manager/rotation-patterns`);
  }

  getMyEmployees() {
    return this.http.get<any[]>(`${this.apiUrl}/employees`);
  }
  // Shift approvals
  requestShiftChange(body: {
    employeeId: number;
    mode: 'FIXED' | 'ROTATIONAL';
    shiftId?: number;
    patternId?: number;
    startDate: string;
  }) {
    return this.http.post(`${this.apiUrl}/request`, body);
  }

  // approveShiftChange(id: number, body: { role: 'RM' | 'HR'; decision: 'APPROVED' | 'REJECTED' }) {
  //   return this.http.post(`${this.apiUrl}/approve/${id}`, body);
  // }

  approveShiftChange(
  id: number,
  body: {
    role: 'RM' | 'HR';
    decision: 'APPROVED' | 'REJECTED';
    reason?: string;
  }
) {
  return this.http.post(`${this.apiUrl}/approve/${id}`, body);
}


  getApprovalsInbox() {
    return this.http.get<any[]>(`${this.apiUrl}/approvals/inbox`);
  }

  getMyShiftRequests() {
    return this.http.get<any[]>(`${this.apiUrl}/approvals/mine`);
  }

  getEmployeeShiftRequests(employeeId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/approvals/employee/${employeeId}`);
  }
requestMonthlyShift(payload: any) {
  return this.http.post(`${this.apiUrl}/monthly-request`, payload);
}

/* ── Monthly-shift edit workflow ──────────────────────────────────────── */
getMonthlyRequestEditability(approvalId: number) {
  return this.http.get<{
    editable: boolean;
    mode: 'INFLIGHT' | 'POSTEDIT' | null;
    canRequestEdit: boolean;
    monthLocked: boolean;
    editStatus: string;
    status: string;
    reason?: string;
  }>(`${this.apiUrl}/monthly-request/${approvalId}/editability`);
}

editMonthlyRequest(approvalId: number, payload: any) {
  return this.http.put(`${this.apiUrl}/monthly-request/${approvalId}`, payload);
}

requestShiftEdit(approvalId: number, reason?: string) {
  return this.http.post(`${this.apiUrl}/monthly-request/${approvalId}/edit-request`, { reason });
}

decideShiftEditRequest(approvalId: number, decision: 'APPROVED' | 'REJECTED', reason?: string) {
  return this.http.post(`${this.apiUrl}/monthly-request/${approvalId}/edit-request/decide`, { decision, reason });
}

/* ── HR month lock (org-wide) ─────────────────────────────────────────── */
getShiftMonthLock(month: number, year: number) {
  return this.http.get<{ locked: boolean; lock: any }>(`${this.apiUrl}/month-lock`, { params: { month, year } as any });
}

closeShiftMonth(month: number, year: number) {
  return this.http.post(`${this.apiUrl}/month-lock`, { month, year });
}

reopenShiftMonth(month: number, year: number) {
  return this.http.delete(`${this.apiUrl}/month-lock`, { body: { month, year } });
}
  getMonthlyShiftForEmployee(payload: {
    employeeId: number;
    month: number;
    year: number;
  }) {
    return this.http.post<{
      isMonthAssigned: boolean;
      approvalId?: number;
      status?: string;
      editStatus?: string;
      requestedBy?: number;
      weekShifts?: { [weekIndex: number]: number };
      dayOverrides?: { [iso: string]: number }; // per-day overrides (date -> shiftId)
        weekOffConfig?: {
    weeks: Record<number, number>; // weekIndex -> dayOfWeek (0–6)
  };
    }>(
      `${this.apiUrl}/monthly/status`,
      payload
    );
  }
  // ✅ Get daily shifts for an employee within a date range
getDailyShiftsForRange(params: {
  employeeId: number;
  from: string;
  to: string;
}): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.apiUrl}/daily-range`,
    { params }
  );
}
getApprovedWeekOffs(payload: {
  employeeId: number;
  month: number;
  year: number;
}) {
  return this.http.get<{
    source: 'MONTHLY_SHIFT' | 'SUNDAY_DEFAULT';
    weekOffDates: string[];
  }>(`${this.apiUrl}/weekoffs`, {
    params: payload as any
  });
}
getEmployeeDailyShiftsForRange(employeeId: number, from: string, to: string) {
  return this.http.get<any[]>(
    `${this.apiUrl}/employee-daily-shifts-range`,
    {
      params: {
        employeeId,
        from,
        to
      }
    }
  );
}

/* ── HR monthly shift + attendance report ─────────────────────────────── */
getShiftAttendanceReport(month: number, year: number) {
  return this.http.get<any>(`${this.apiUrl}/attendance-report`, {
    params: { month, year } as any
  });
}

exportShiftAttendanceReport(month: number, year: number) {
  return this.http.get(`${this.apiUrl}/attendance-report/export`, {
    params: { month, year } as any,
    responseType: 'blob'
  });
}

/* ── HR shift adherence report (allotted vs actual shift) ──────────────── */
getShiftAdherenceReport(month: number, year: number) {
  return this.http.get<any>(`${this.apiUrl}/adherence-report`, {
    params: { month, year } as any
  });
}

exportShiftAdherenceReport(month: number, year: number) {
  return this.http.get(`${this.apiUrl}/adherence-report/export`, {
    params: { month, year } as any,
    responseType: 'blob'
  });
}
}
