import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

/** The manager's queue: hours still to sanction, and work still to confirm. */
export interface OtPendingResponse {
  awaitingApproval: any[];
  awaitingAcknowledgement: any[];
  counts: { awaitingApproval: number; awaitingAcknowledgement: number };
}

/**
 * The employee's own view. Eligibility and the weekly allowance travel with the
 * requests so the UI never has to reconstruct a rule the server enforces.
 */
export interface MyOvertimeResponse {
  overtimeEnabled: boolean;
  hasReportingManager: boolean;
  maxMinutesPerDay: number;
  weeklyCapMinutes: number;
  week: {
    start: string;
    end: string;
    /** The rotational off-day inside this week, or the general-shift Sunday. */
    weekOffDate: string | null;
    usedMinutes: number;
    remainingMinutes: number;
  };
  requests: any[];
}

/**
 * Employee-raised overtime. Distinct from the biometric/HR overtime on the
 * dashboard service: this flow is manager approval of the HOURS followed by a
 * manager acknowledgement that the WORK landed, and only the second step makes
 * the overtime payable.
 */
@Injectable({ providedIn: 'root' })
export class OvertimeService {
  private apiUrl = environment.apiUrl + '/overtime';
  constructor(private http: HttpClient) {}

  /**
   * The signed-in employee's own requests, plus eligibility and this week's
   * allowance. `week` is any date inside the week to report on; omit for the
   * current one.
   */
  getMyRequests(week?: string): Observable<MyOvertimeResponse> {
    const url = `${this.apiUrl}/requests/my`;
    return this.http.get<MyOvertimeResponse>(week ? `${url}?week=${week}` : url);
  }

  /** The signed-in manager's queue. */
  getPending(): Observable<OtPendingResponse> {
    return this.http.get<OtPendingResponse>(`${this.apiUrl}/requests/pending`);
  }

  createRequest(data: { date: string; expectedMinutes: number; taskDescription: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests`, data);
  }

  /** HR's queue — manager-approved and work-confirmed, awaiting final sign-off. */
  getHrPending(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests/hr-pending`);
  }

  decide(id: number, approve: boolean, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requests/${id}/decide`, { approve, reason });
  }

  /** Stage two. Approving here is what makes the overtime payable. */
  hrDecide(id: number, approve: boolean, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requests/${id}/hr-decide`, { approve, reason });
  }

  acknowledge(id: number, completed: boolean, actualMinutes?: number, note?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requests/${id}/acknowledge`, { completed, actualMinutes, note });
  }

  withdrawRequest(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/requests/${id}`);
  }
}
