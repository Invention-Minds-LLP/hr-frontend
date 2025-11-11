// src/app/services/recruiting.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';


/** If you have environments: import from environments and set baseUrl = environment.apiBase */
const baseUrl = environment.apiUrl + '/recruiting';
// const baseUrl = 'http://localhost:3002/api/recruiting';

/* ---------- Shared types (mirror Prisma enums) ---------- */
export type JobStatus = 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'DRAFT';
export type ApplicationStatuses =
  | 'APPLIED' | 'SCREENING' | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED' | 'INTERVIEWED'
  | 'OFFERED' | 'OFFER_ACCEPTED' | 'OFFER_DECLINED'
  | 'REJECTED' | 'WITHDRAWN' | 'HIRED' | 'NO_SHOW';
export type OfferStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'SIGNED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED';
export type JoinOutcome = 'JOINED' | 'NO_SHOW' | 'DEFERRED';
export type RejectReason = 'SALARY' | 'ROLE_MISMATCH' | 'LOCATION' | 'EXPERIENCE' | 'CULTURE' | 'OTHER';

export interface Job {
  id: number; title: string; departmentId: number; location?: string | null; departmentName?: string;
  headcount: number; status: JobStatus; createdAt: string; updatedAt: string;
}
export interface Candidate { id: number; name: string; email: string; phone?: string | null; source?: string | null; resumeUrl?: string | null; }
export interface Offer {
  id: number; applicationId: number; status: OfferStatus;
  sentAt?: string | null; viewedAt?: string | null; signedAt?: string | null;
  declinedAt?: string | null; declineReason?: string | null;
  proposedJoinAt?: string | null; joinOutcome?: JoinOutcome | null; noShowReason?: string | null;
}
export interface Interview {
  id: number; applicationId: number; stage: string;
  startTime: string; endTime: string; panelUserIds?: string | null;
  feedbackUrl?: string | null; feedbackDue?: string | null; feedbackAt?: string | null; result?: string | null;
}
export interface Application {
  id: number; jobId: number; candidateId: number; status: ApplicationStatuses;
  currentStage?: string | null; rejectReason?: RejectReason | null;
  expectedCtc?: number | null; noticeDays?: number | null; salaryNote?: string | null;
  createdAt: string; updatedAt: string;
  candidate?: Candidate; job?: Job; offer?: Offer | null; interviews?: Interview[];
}
export interface Paged<T> { total: number; rows: T[]; }
export interface PipelineStats {
  jobsOpen: number; applied: number; shortlisted: number;
  interviewing: number; offered: number; accepted: number; hired: number;
}
// recruiting.service.ts
export interface CandidateAssignedTest {
  id: number;
  applicationId: number;
  candidateId: number;
  testId: number;
  assignedBy: number;
  assignedAt: string;
  testDate?: string | null;
  deadlineDate?: string | null;
  status: 'NotStarted' | 'InProgress' | 'Completed' | 'Cancelled' | string;
  attempts: number;
  startedAt?: string | null;
  completedAt?: string | null;
  score?: number | null;
  response?: string | null;
  test?: { id: number; name: string; duration?: number | null; passingPercent?: number | null; randomization?: string | null };
  // manual review fields
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  reviewDecision?: 'PASS' | 'FAIL' | null;
  reviewNote?: string | null;
  canStart?: boolean;
}

export interface EvalTestLite {
  id: number;
  name: string;
  duration?: number | null;
  passingPercent?: number | null;
  randomization?: string | null;
  maxAttempts?: number | null; // (not always returned here)
}

export interface AssignedTestDetail {
  assignedId: number;
  testId: number;
  name: string;
  duration?: number | null;
  maxAttempts?: number | null;
  passingPercent?: number | null;
  questions: {
    id: number;
    text: string;
    type: 'MCQ' | 'Descriptive' | string;
    weight?: number | null;
    options: { id: number; text: string }[];
  }[];
}

export interface SubmitResponse {
  ok: true;
  score: number;
}

@Injectable({ providedIn: 'root' })
export class Recuriting {
  private http = inject(HttpClient);

  /* -------- Jobs -------- */
  createJob(body: Partial<Job> & { title: string; departmentId: number; createdBy: number }): Observable<Job> {
    return this.http.post<Job>(`${baseUrl}/jobs`, body);
  }

  listJobs(params: { status?: JobStatus; dept?: number; q?: string; page?: number; pageSize?: number } = {}): Observable<Paged<Job>> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    return this.http.get<Paged<Job>>(`${baseUrl}/jobs`, { params: p });
  }

  changeJobStatus(id: number, status: JobStatus) {
    return this.http.patch<Job>(`${baseUrl}/jobs/${id}/status`, { status });
  }

  /* -------- Candidates & Applications -------- */
  createCandidate(body: Omit<Candidate, 'id'>) {
    return this.http.post<Candidate>(`${baseUrl}/candidates`, body);
  }

  createApplication(data: FormData) {
    return this.http.post<Application>(`${baseUrl}/applications`, data);
  }

  listApplications(params: { jobId?: number; status?: ApplicationStatuses; q?: string; page?: number; pageSize?: number } = {}) {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    return this.http.get<Paged<Application>>(`${baseUrl}/applications`, { params: p });
  }

  moveApplication(
    id: number,
    to: ApplicationStatuses,
    extra?: { rejectReason?: RejectReason; currentStage?: string }
  ) {
    return this.http.patch<Application>(
      `${baseUrl}/applications/${id}/status`,
      { to, ...(extra ?? {}) } // ✅ safe spread
    );
  }

  /* -------- Interviews -------- */
  scheduleInterview(applicationId: number, body: { stage: string; startTime: string; endTime: string; panelUserIds?: string; feedbackDue?: string }) {
    return this.http.post<Interview>(`${baseUrl}/applications/${applicationId}/interviews`, body);
  }
  recordInterviewFeedback(id: number, body: { result: string; feedbackUrl?: string; feedbackAt?: string }) {
    return this.http.patch<Interview>(`${baseUrl}/interviews/${id}/feedback`, body);
  }

  /* -------- Offers -------- */
  createOffer(applicationId: number) {
    return this.http.post<Offer>(`${baseUrl}/applications/${applicationId}/offer`, {});
  }
  sendOffer(id: number, proposedJoinAt?: string) {
    return this.http.post<Offer>(`${baseUrl}/offers/${id}/send`, { proposedJoinAt });
  }
  markOfferViewed(id: number) { return this.http.post<Offer>(`${baseUrl}/offers/${id}/view`, {}); }
  markOfferSigned(id: number) { return this.http.post<Offer>(`${baseUrl}/offers/${id}/sign`, {}); }
  declineOffer(id: number, reason?: string) { return this.http.post<Offer>(`${baseUrl}/offers/${id}/decline`, { reason }); }
  withdrawOffer(id: number) { return this.http.post<Offer>(`${baseUrl}/offers/${id}/withdraw`, {}); }
  expireOffer(id: number) { return this.http.post<Offer>(`${baseUrl}/offers/${id}/expire`, {}); }
  scheduleJoin(id: number, proposedJoinAt: string) {
    return this.http.patch<Offer>(`${baseUrl}/offers/${id}/schedule-join`, { proposedJoinAt });
  }
  markJoined(id: number) { return this.http.post<Offer>(`${baseUrl}/offers/${id}/mark-joined`, {}); }
  markNoShow(id: number, reason?: string) { return this.http.post<Offer>(`${baseUrl}/offers/${id}/mark-no-show`, { reason }); }

  /* -------- Pipeline -------- */
  pipelineStats() {
    return this.http.get<PipelineStats>(`${baseUrl}/pipeline-stats`);
  }
  // catalog
  listPublishedTests() {
    return this.http.get<EvalTestLite[]>(`${baseUrl}/tests`);
  }

  // assign
  assignTestToApplication(applicationId: number, body: { testId: number; testDate?: string; deadlineDate?: string; }) {
    return this.http.post<{ assigned: CandidateAssignedTest }>(`${baseUrl}/applications/${applicationId}/tests/assign`, body);
  }

  // list app tests
  listApplicationTests(applicationId: number) {
    return this.http.get<CandidateAssignedTest[]>(`${baseUrl}/applications/${applicationId}/tests`);
  }

  // start/submit
  startCandidateTest(applicationId: number, assignedId: number) {
    return this.http.post<CandidateAssignedTest>(`${baseUrl}/applications/${applicationId}/tests/${assignedId}/start`, {});
  }
  submitCandidateTest(applicationId: number, assignedId: number, body: { score?: number; response?: string }) {
    return this.http.post<CandidateAssignedTest>(`${baseUrl}/applications/${applicationId}/tests/${assignedId}/submit`, body);
  }
  // recruiting.service.ts
  reviewCandidateTest(applicationId: number, assignedId: number, body: { decision: 'PASS' | 'FAIL'; note?: string }) {
    return this.http.post<{ ok: true }>(`${baseUrl}/applications/${applicationId}/tests/${assignedId}/review`, body);
  }
  getApplicationSummary(appId: number) {
    return this.http.get(`${baseUrl}/applications/${appId}/summary`);
  }
  

  // listApplicationTests(applicationId: number) {
  //   return this.http.get<CandidateAssignedTest[]>(`${baseUrl}/applications/${applicationId}/tests`);
  // }
  /** List all tests assigned to a candidate (for “My Tests” page) */
  getCandidateAssignedTests(candidateId: number): Observable<CandidateAssignedTest[]> {
    return this.http.get<CandidateAssignedTest[]>(`${baseUrl}/candidate/${candidateId}/tests`);
  }

  /** Get a specific assigned test with questions (safe: no correct answers) */
  getAssignedTestDetail(assignedId: number): Observable<AssignedTestDetail> {
    return this.http.get<AssignedTestDetail>(`${baseUrl}/candidate/tests/${assignedId}`);
  }

  startAssignedTest(appId: number, assignedId: number) {
    return this.http.post(`${baseUrl}/applications/${appId}/tests/${assignedId}/start`, {});
  }


  /** Submit answers for an assigned test */
  submitAssignedTest(assignedId: number, answers: { questionId: number; answer: any }[]): Observable<SubmitResponse> {
    return this.http.post<SubmitResponse>(`${baseUrl}/candidate/tests/${assignedId}/submit`, { answers });
  }

  // /** HR: record PASS/FAIL review (does NOT change application status) */
  // reviewCandidateTest(applicationId: number, assignedId: number, body: { decision: 'PASS' | 'FAIL'; note?: string }): Observable<{ ok: true }> {
  //   return this.http.post<{ ok: true }>(`${baseUrl}/applications/${applicationId}/tests/${assignedId}/review`, body);
  // }

  /** HR: view queue of completed tests pending review (optional filters) */
  getTestReviewQueue(params?: { jobId?: number }): Observable<CandidateAssignedTest[]> {
    let p = new HttpParams();
    if (params?.jobId) p = p.set('jobId', String(params.jobId));
    return this.http.get<CandidateAssignedTest[]>(`${baseUrl}/tests/review-queue`, { params: p });
  }
  upsertFeedback(interviewId: number, dto: any): Observable<any> {
    return this.http.post(`${baseUrl}/interview/${interviewId}/feedback`, dto);
  }

  /** POST /api/interviews/:id/hr-review */
  saveHrReview(interviewId: number, dto: any): Observable<any> {
    return this.http.post(`${baseUrl}/interview/${interviewId}/hr-review`, dto);
  }

  /** GET /api/interviews/:id/summary */
  getSummary(interviewId: number): Observable<any> {
    return this.http.get<any>(`${baseUrl}/interview/${interviewId}/summary`);
  }

  getAllInterview(): Observable<any> {
    return this.http.get<any>(`${baseUrl}/interview`);
  }
  getPanelInterview(employeeId: any): Observable<any>{
    return this.http.get<any>(`${baseUrl}/panel/${employeeId}`);
  }
}
