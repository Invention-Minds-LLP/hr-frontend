// src/app/services/dashboard-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';


// ---- TYPES (match your API)
export type ListKey =
  | 'unmarked' | 'approvals' | 'probation' | 'docs' |  'offersPendingSignature' | 'clearances'
  | 'leaves' | 'wfh' | 'permissions' | 'late' | 'ot' | 'joiners' | 'birthdays' | 'anniversaries'| 'annAck' | 'annAckPending';


export interface List {
  title: string;
  cols: string[];
  rows: string[][];
  actions?: string[];
}

export interface LateInfo { count: number; medianMins: number; }
export interface OtYesterday { hours: number; cost?: string;count?:number }

export type PeopleRow = [label: string, value: string, cls?: 'good' | 'warn' | 'danger'];
export type MetricRow  = [label: string, value: string, cls?: 'good' | 'warn' | 'danger'];

export interface AttentionItem {
  label: string;
  count: number;
  severity: 'danger' | 'warn' | 'good';
  modal: ListKey | string;
}

export interface PipelineItem { name: string; value: number; }

export interface TodayBlock {
  leaves: number;
  wfh: number;
  permissions: number;
  late: LateInfo;
  otYesterday: OtYesterday;
  newJoiners: number;
  birthdays: number;
  anniversaries: number;
  announcementsAck: number; // 0..1
}
export interface AnnouncementStat {
  id: number;
  title: string;
  ackCount: number;
  audienceCount: number;
  ackRate: number;     // 0..1
  ackPercent: number;  // 0..100
}

export interface DashboardResponse {
  today: TodayBlock;
  announcements:AnnouncementStat[];
  latestAnnouncement:AnnouncementStat | null; // null if no announcements
  attention: AttentionItem[];
  pipeline: PipelineItem[];
  peopleOps: PeopleRow[];
  learnPerf: MetricRow[];
  secAccess: MetricRow[];
  lists: Record<ListKey, List>;
}

export interface RecruitingExtras {
  salaryRejects: number;
  yetToReceiveOffer: { id: number; candidate: { name: string }; job: { title: string } }[];
  noShows: { application: { candidate: { name: string }, job: { title: string } }, noShowReason?: string }[];
}

@Injectable({ providedIn: 'root' })
export class Dashboard {
  // Change if you host API elsewhere
  private baseUrl = 'http://localhost:3002/api/dashboard';

  constructor(private http: HttpClient) {}

  // getDashboard(filters?: { location?: string; department?: string }): Observable<DashboardResponse> {
  //   let params = new HttpParams();
  //   if (filters?.location)   params = params.set('location', filters.location);
  //   if (filters?.department) params = params.set('department', filters.department);
  //   console.log(this.baseUrl)
  //   return this.http.get<DashboardResponse>(`${this.baseUrl}`, { params });
  // }
  getDashboard(filters?: {
    location?: string | null;
    department?: string | null;
    branchId?: number | null;
    departmentId?: number | null;
  }): Observable<DashboardResponse> {
    let params = new HttpParams();

    if (filters?.location)     params = params.set('location', filters.location);
    if (filters?.department)   params = params.set('department', filters.department);
    if (filters?.branchId != null)     params = params.set('branchId', String(filters.branchId));
    if (filters?.departmentId != null) params = params.set('departmentId', String(filters.departmentId));

    return this.http.get<DashboardResponse>(this.baseUrl, { params });
  }


  getList(arg: ListKey | { key: string; [k: string]: string }): Observable<List> {
    let params = new HttpParams();
    if (typeof arg === 'string') {
      params = params.set('key', arg);
    } else {
      for (const [k, v] of Object.entries(arg)) {
        params = params.set(k, String(v));
      }
    }
    return this.http.get<List>(`${this.baseUrl}/list`, { params });
  }
  getRecruiting(): Observable<RecruitingExtras> {
    return this.http.get<RecruitingExtras>(`${this.baseUrl}/recruiting`);
  }

  createBackfillFromResignation(resignationId: number) {
    return this.http.post<{ ok: boolean; jobId?: number; note?: string }>(
      `${this.baseUrl}/recruiting/backfill-from-resignation`,
      { resignationId }
    );
  }
}
