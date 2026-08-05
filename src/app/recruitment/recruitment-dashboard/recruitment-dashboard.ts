// src/app/pages/recruiting-dashboard/recruiting-dashboard.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  Recuriting, Job, Application, ApplicationStatuses, JobStatus, Offer
} from '../../services/recruiting/recuriting';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobCreate } from "../job-create/job-create";
import { ApplicationCreate } from "../application-create/application-create";
import { ApplicationStatus } from "../application-status/application-status";
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { Interview } from '../interview/interview';
import { CandidateEvalForm } from '../../candidate-eval-form/candidate-eval-form';
import { RequisitionList } from "../requisition-list/requisition-list";
import { Tooltip, TooltipModule } from "primeng/tooltip";
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { DialogModule } from 'primeng/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { resolveFileUrl } from '../../pipes/file-url.pipe';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { ButtonModule } from 'primeng/button';



@Component({
  selector: 'app-recruitment-dashboard',
  imports: [CommonModule, FormsModule, JobCreate, ApplicationCreate, ApplicationStatus,
    ToastModule, SelectModule, Interview, CandidateEvalForm, DialogModule,
    RequisitionList, TooltipModule, SkeletonModule, TableModule, ModuleGuide, ButtonModule],
  templateUrl: './recruitment-dashboard.html',
  styleUrl: './recruitment-dashboard.css',
  providers: [MessageService]
})
export class RecruitmentDashboard implements OnInit {
  private api = inject(Recuriting);
  private messages = inject(MessageService);

  private fmtDate(d: any): string {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '-';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}-${dt.getFullYear()}`;
  }
  selectedInterview = signal<any | null>(null);
  applicationRows: any[] = [];
  resumeDialogOpen = false;
  resumeUrl: SafeResourceUrl | null = null;




  // top stats
  stats = signal<{ [k: string]: number }>({});

  // jobs
  jobs: Job[] = [];
  totalJobs = 0;
  page = 1; pageSize = 10;
  selectedJob?: Job;
  skeletonRows = Array(5);

  // applications for the selected job
  apps: Application[] = [];
  totalApps = 0;
  appPage = 1; appPageSize = 20;

  loading = false;
  updatingJobId: number | null = null;

  deptId = Number(localStorage.getItem('deptId')) || 0;
  roleId = Number(localStorage.getItem('roleId')) || 0;
  modalOpen = false;
  selectedList: any = null;
  selectedListKey: string = '';
  selectedRows: any[] = [];

  // ── Insights data (recruiter-dashboard endpoint) ─────────
  recruiterDash: any = null;
  loadingDash = false;

  // ── Recruiter insights (separate endpoint, more action-driven data) ──
  insights: any = null;
  loadingInsights = false;

  // ── Today's interviews ───────────────────────────────────
  todaysInterviews: any[] = [];
  loadingTodays = false;

  // ── New-application dialog state ─────────────────────────
  newAppDialogOpen = false;


  // Allowed transitions (tweak if you want to disallow reopening CLOSED, etc.)
  private jobMoves: Record<JobStatus, JobStatus[]> = {
    OPEN: ['ON_HOLD', 'CLOSED', 'DRAFT'],
    ON_HOLD: ['OPEN', 'CLOSED', 'DRAFT'],
    DRAFT: ['OPEN', 'ON_HOLD', 'CLOSED'],
    CLOSED: ['OPEN', 'ON_HOLD', 'DRAFT'], // or [] if you do NOT allow reopen
  };

  constructor(private sanitizer: DomSanitizer,) { }

  getJobStatusColors(status: JobStatus) {
    const statusIndexMap: Record<JobStatus, number> = {
      OPEN: 2,
      ON_HOLD: 1,
      DRAFT: 3,
      CLOSED: 4,
    };

    const baseHue = (statusIndexMap[status] * 60) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }


  jobStatusOptionsFor(j: Job) {
    const nexts = this.jobMoves[j.status as JobStatus] || [];
    // include current (disabled) + allowed targets
    const opts: { label: string; value: JobStatus; disabled?: boolean }[] = [
      { label: j.status, value: j.status as JobStatus, disabled: true },
      ...nexts.map(s => ({ label: s, value: s })),
    ];
    return opts;
  }

  onJobStatusChange(j: Job, to: JobStatus) {
    console.log(to, j.status)
    if (!to || to === j.status) return;


    const prev = j.status;
    this.updatingJobId = j.id;
    // optimistic UI
    j.status = to;

    this.api.changeJobStatus(j.id, to).subscribe({
      next: (updated) => {
        j.status = updated.status as JobStatus;
        this.messages.add({ severity: 'success', summary: 'Job updated', detail: `Status → ${updated.status}` });
      },
      error: (e) => {
        j.status = prev; // rollback
        this.messages.add({
          severity: 'error',
          summary: 'Update failed',
          detail: e?.error?.error || 'Could not change job status',
        });
      },
      complete: () => (this.updatingJobId = null),
    });
  }


  ngOnInit() {
    this.loadStats();
    this.loadJobs();
    this.loadRecruiterDashboard();
    this.loadTodaysInterviews();
    this.loadInsights();
  }

  /** Big consolidated analytics endpoint — feeds Daily Ops / Compliance /
   *  Strategy / Reporting sections in one shot. */
  loadInsights() {
    this.loadingInsights = true;
    this.api.recruiterInsights().subscribe({
      next: (d) => { this.insights = d; this.loadingInsights = false; },
      error: () => { this.loadingInsights = false; },
    });
  }

  /** Format month key (YYYY-MM) into a friendly label like "Apr 26". */
  fmtMonth(monthKey: string): string {
    if (!monthKey) return '';
    const [y, m] = monthKey.split('-').map(Number);
    if (!y || !m) return monthKey;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[m - 1]} ${String(y).slice(2)}`;
  }

  /** Day-of-week label for the heatmap. */
  dayLabel(idx: number): string {
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][idx] ?? '';
  }

  /** Friendly label for an audit-log action (kept lower-case → Title Case). */
  formatAction(action: string | null | undefined): string {
    if (!action) return 'Updated';
    return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** Demand vs supply: ratio class so the bar coloring reads at a glance. */
  demandStatus(d: { openSeats: number; applicationsLast30d: number }): 'good' | 'warn' | 'danger' {
    if (d.openSeats === 0) return 'good';
    const ratio = d.applicationsLast30d / d.openSeats;
    if (ratio >= 5) return 'good';
    if (ratio >= 2) return 'warn';
    return 'danger';
  }

  /** Heatmap cell intensity 0..3 — used to pick a CSS class for the cell. */
  heatLevel(count: number, max: number): number {
    if (!count || !max) return 0;
    const ratio = count / max;
    if (ratio >= 0.66) return 3;
    if (ratio >= 0.33) return 2;
    return 1;
  }
  heatMax(): number {
    const heatmap: number[][] = this.insights?.interviewHeatmap?.counts ?? [];
    let m = 0;
    for (const row of heatmap) for (const v of row) if (v > m) m = v;
    return m;
  }

  loadStats() {
    this.api.pipelineStats().subscribe(s => this.stats.set(s as any));
  }

  /** Funnel drop-off %, time-to-hire, source effectiveness, etc. */
  loadRecruiterDashboard() {
    this.loadingDash = true;
    this.api.recruiterDashboard().subscribe({
      next: (d) => { this.recruiterDash = d; this.loadingDash = false; },
      error: () => { this.loadingDash = false; },
    });
  }

  /** Pulls all upcoming interviews then filters down to today client-side.
   *  Avoids adding a new backend endpoint just for this widget. */
  loadTodaysInterviews() {
    this.loadingTodays = true;
    this.api.getAllInterview(1, 100).subscribe({
      next: (res: any) => {
        // Defensive: the endpoint may return an array, a { rows } envelope, or
        // (on some error/permission responses) a plain object — only ever filter an array.
        const rows: any[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.rows)
            ? res.rows
            : [];
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);
        this.todaysInterviews = rows
          .filter((i) => {
            if (!i.startTime) return false;
            const t = new Date(i.startTime).getTime();
            return t >= todayStart.getTime() && t <= todayEnd.getTime();
          })
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        this.loadingTodays = false;
      },
      error: () => { this.loadingTodays = false; },
    });
  }

  /** Convert percentage between two pipeline stages (e.g. Applied → Shortlisted). */
  conversionPct(fromKey: string, toKey: string): number | null {
    const from = this.stats()[fromKey] || 0;
    const to   = this.stats()[toKey] || 0;
    if (!from) return null;
    return Math.round((to / from) * 100);
  }

  /** Days since the job was created — for the "ageing" insight. */
  daysOpen(j: Job): number {
    if (!(j as any).createdAt) return 0;
    const created = new Date((j as any).createdAt).getTime();
    return Math.max(0, Math.floor((Date.now() - created) / 86400000));
  }

  /** Returns up to N OPEN jobs sorted oldest-first — the ones most likely
   *  needing recruiter attention. */
  ageingJobs(limit = 5) {
    return (this.jobs || [])
      .filter((j) => j.status === 'OPEN' && (j as any).createdAt)
      .map((j) => ({ ...j, daysOpen: this.daysOpen(j) }))
      .sort((a, b) => b.daysOpen - a.daysOpen)
      .slice(0, limit);
  }

  /** New-application dialog open / close. */
  openNewAppDialog()  { this.newAppDialogOpen = true; }
  closeNewAppDialog() {
    this.newAppDialogOpen = false;
    // Refresh stats after creating an application so the funnel updates.
    this.loadStats();
  }

  loadJobs() {
    this.loading = true;
    this.api.listJobs({ page: this.page, pageSize: this.pageSize }).subscribe({
      next: (res: any) => {
        this.jobs = Array.isArray(res?.rows) ? res.rows : Array.isArray(res) ? res : [];
        this.totalJobs = res?.total ?? this.jobs.length;
        setTimeout(() => {
          this.loading = false
        }, 2000)
      },
      complete: () => this.loading = false,
    });
  }

  openJob(j: Job) {
    this.selectedJob = j;
    this.appPage = 1;
    this.loadApps();
  }

  loadApps() {
    if (!this.selectedJob) return;
    this.api.listApplications({ jobId: this.selectedJob.id, page: this.appPage, pageSize: this.appPageSize })
      .subscribe(res => { this.apps = res.rows; this.totalApps = res.total; });
  }

  // --- Actions (Application) ---
  moveApp(app: Application, to: ApplicationStatuses) {
    this.api.moveApplication(app.id, to).subscribe(() => this.loadApps());
  }

  scheduleInterview(app: Application) {
    const start = prompt('Interview start (ISO e.g. 2025-08-22T10:00:00Z)');
    const end = prompt('Interview end (ISO e.g. 2025-08-22T11:00:00Z)');
    const stage = prompt('Stage (e.g., Tech1)') || 'Screen';
    if (!start || !end) return;
    this.api.scheduleInterview(app.id, { startTime: start, endTime: end, stage }).subscribe(() => this.loadApps());
  }

  // --- Offers ---
  ensureOffer(app: Application, cb: (o: Offer) => void) {
    if (app.offer) return cb(app.offer);
    this.api.createOffer(app.id).subscribe(of => cb(of));
  }

  sendOffer(app: Application) {
    this.ensureOffer(app, of => {
      const join = prompt('Proposed join date (ISO)?') || undefined;
      this.api.sendOffer(of.id, { proposedJoinAt: join }).subscribe(() => this.loadApps());
    });
  }
  signOffer(app: Application) {
    this.ensureOffer(app, of => this.api.markOfferSigned(of.id).subscribe(() => this.loadApps()));
  }
  declineOffer(app: Application) {
    const reason = prompt('Decline reason?') || undefined;
    this.ensureOffer(app, of => this.api.declineOffer(of.id, reason).subscribe(() => this.loadApps()));
  }
  markJoined(app: Application) {
    this.ensureOffer(app, of => this.api.markJoined(of.id).subscribe(() => this.loadApps()));
  }
  markNoShow(app: Application) {
    const reason = prompt('No-show reason?') || undefined;
    this.ensureOffer(app, of => this.api.markNoShow(of.id, reason).subscribe(() => this.loadApps()));
  }

  // quick helpers
  statusClass(s: string) {
    if (['HIRED', 'OFFER_ACCEPTED', 'SIGNED'].includes(s)) return 'good';
    if (['REJECTED', 'DECLINED', 'WITHDRAWN', 'NO_SHOW'].includes(s)) return 'danger';
    if (['OFFERED', 'INTERVIEWED', 'INTERVIEW_SCHEDULED', 'SHORTLISTED'].includes(s)) return 'warn';
    return '';
  }

  allowedMoves(s: ApplicationStatuses): ApplicationStatuses[] {
    const map: Record<ApplicationStatuses, ApplicationStatuses[]> = {
      APPLIED: ['SCREENING', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
      SCREENING: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
      SHORTLISTED: ['INTERVIEW_SCHEDULED', 'REJECTED', 'WITHDRAWN'],
      INTERVIEW_SCHEDULED: ['INTERVIEWED', 'REJECTED', 'WITHDRAWN', 'NO_SHOW'],
      INTERVIEWED: ['OFFERED', 'REJECTED', 'WITHDRAWN'],
      OFFERED: ['OFFER_ACCEPTED', 'OFFER_DECLINED', 'WITHDRAWN'],
      OFFER_ACCEPTED: ['HIRED', 'NO_SHOW'],
      OFFER_DECLINED: [],
      REJECTED: [],
      WITHDRAWN: [],
      HIRED: [],
      NO_SHOW: [],
    };
    return map[s] || [];
  }
  onEvaluate = (row: any) => {
    this.selectedInterview.set(row);
    // (optional) scroll the form into view
    setTimeout(() => document.getElementById('eval-form')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };
  getTooltipMessage(key: string): string {
    const tooltips: { [key: string]: string } = {
      vacancies: "Number of open job positions available for recruitment.",
      applicationsReceived: "Total number of applications submitted for current vacancies.",
      applied: "Number of candidates who have applied for a position.",
      shortlisted: "Candidates selected for the next stage after application review.",
      interviewing: "Candidates currently scheduled or undergoing interviews.",
      offered: "Number of candidates who have been given a job offer.",
      accepted: "Candidates who have accepted the job offer.",
      offerDeclined: "Candidates who declined or did not respond to the job offer.",
      hired: "Number of candidates who have officially joined as employees.",
      rejected: "Candidates not selected to move forward in the recruitment process."
    };

    return tooltips[key] || "";
  }


  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 95) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }

  onBack() {
    this.selectedInterview.set(null);
  }
  // openList(key: string) {
  //   this.selectedListKey = key;

  //   // map stats tile → application status
  //   const statusMap: Record<string, ApplicationStatuses> = {
  //     applied: 'APPLIED',
  //     shortlisted: 'SHORTLISTED',
  //     interviewing: 'INTERVIEW_SCHEDULED',
  //     offered: 'OFFERED',
  //     accepted: 'OFFER_ACCEPTED',
  //     hired: 'HIRED',
  //     rejected: 'REJECTED',
  //     offerDeclined: 'OFFER_DECLINED'
  //   };

  //   const status = statusMap[key];
  //   if (!status) return;

  //   this.api.listApplications({
  //     status,
  //     page: 1,
  //     pageSize: 100
  //   }).subscribe(res => {
  //     this.selectedList = {
  //       title: key.replace(/([A-Z])/g, ' $1').toUpperCase(),
  //       cols: ['Name', 'Email', 'Status'],
  //       rows: res.rows.map((r: any) => ({
  //         data: [
  //           r.candidate?.name,
  //           r.candidate?.email,
  //           r.status
  //         ]
  //       }))
  //     };

  //     this.modalOpen = true;
  //   });
  // }
  openList(key: string) {
    this.selectedListKey = key;
    if (key === 'vacancies') {
      this.api.listJobs({ page: 1, pageSize: 100 }).subscribe(res => {
        const openJobs = res.rows.filter((j: any) => j.status === 'OPEN');

        this.selectedList = {
          title: 'OPEN VACANCIES',
          cols: ['Job Title', 'Department', 'Headcount'],
          rows: openJobs.map((j: any) => ({
            data: [
              j.title || '-',
              j.departmentName || '-',
              j.headcount || 0
            ]
          }))
        };

        this.modalOpen = true;
      });

      return;
    }

    // --- Special case: All applications ---
    if (key === 'applicationsReceived') {
      this.api.listApplications({
        page: 1,
        pageSize: 100
      }).subscribe(res => {

        this.selectedList = {
          title: 'ALL APPLICATIONS',
          cols: [
            'S.No',
            'Name',
            'Role Applied',
            'Date Applied',
            'Experience',
            'Qualification',
            'Resume',
            'Status'
          ],
          rows: res.rows.map((r: any, index: number) => ({
            data: [
              index + 1,
              r.candidate?.name || '-',
              r.job?.title || '-',
              this.fmtDate(r.createdAt),
              r.candidate?.experience || '-',
              r.candidate?.qualification || '-',
              {
                type: 'resume',
                url: r.candidate?.resumeUrl || null
              },
              r.status
            ]
          }))
        };

        this.modalOpen = true;
        this.applicationRows = res.rows;
      });

      return;
    }


    const statusMap: Record<string, ApplicationStatuses> = {
      applied: 'APPLIED',
      shortlisted: 'SHORTLISTED',
      interviewing: 'INTERVIEW_SCHEDULED',
      offered: 'OFFERED',
      accepted: 'OFFER_ACCEPTED',
      hired: 'HIRED',
      rejected: 'REJECTED',
      offerDeclined: 'OFFER_DECLINED'
    };


    const status = statusMap[key];
    if (!status) return;

    // this.api.listApplications({
    //   status,
    //   page: 1,
    //   pageSize: 100
    // }).subscribe(res => {
    //   this.selectedList = {
    //     title: key.replace(/([A-Z])/g, ' $1').toUpperCase(),
    //     cols: ['Candidate', 'Email', 'Status'],
    //     rows: res.rows.map((r: any) => ({
    //       data: [
    //         r.candidate?.name || '-',
    //         r.candidate?.email || '-',
    //         r.status
    //       ]
    //     }))
    //   };

    //   this.modalOpen = true;
    // });
    this.api.listApplications({
      status,
      page: 1,
      pageSize: 100
    }).subscribe(res => {

      this.selectedList = {
        title: key.replace(/([A-Z])/g, ' $1').toUpperCase(),
        cols: [
          'S.No',
          'Name',
          'Role Applied',
          'Date Applied',
          'Experience',
          'Qualification',
          'Resume',
          'Status'
        ],
        rows: res.rows.map((r: any, index: number) => ({
          data: [
            index + 1,
            r.candidate?.name || '-',
            r.job?.title || '-',
            this.fmtDate(r.createdAt),
            r.candidate?.experience || '-',
            r.candidate?.qualification || '-',
            {
              type: 'resume',
              url: r.candidate?.resumeUrl || null
            },
            r.status
          ]
        }))
      };

      // IMPORTANT: for Excel export
      this.applicationRows = res.rows;

      this.modalOpen = true;
    });

  }

  closeModal() {
    this.modalOpen = false;
    this.selectedList = null;
    this.selectedRows = [];
  }
  exportApplications() {
    console.log(this.applicationRows)
    if (!this.applicationRows.length) return;

    const exportData = this.applicationRows.map((r: any, index: number) => ({
      'S.No': index + 1,
      'Name': r.candidate?.name || '-',
      'Email': r.candidate?.email || '-',
      'Role Applied': r.job?.title || '-',
      'Date Applied': this.fmtDate(r.createdAt),
      'Experience': r.candidate?.experience || '-',
      'Qualification': r.candidate?.qualification || '-',
      'Status': r.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, 'Applications.xlsx');
  }
  candidateResumeRawUrl: string = '';
  candidateResumeUrl: SafeResourceUrl | null = null;

  openResume(url: string) {
    if (!url) return;

    this.candidateResumeRawUrl = url;
    this.candidateResumeUrl =
      this.sanitizer.bypassSecurityTrustResourceUrl(resolveFileUrl(url));

    this.resumeDialogOpen = true;
  }

  closeResume() {
    this.resumeDialogOpen = false;
    this.candidateResumeRawUrl = '';
    this.candidateResumeUrl = null;
  }

  get isImageResume(): boolean {
    if (!this.candidateResumeRawUrl) return false;
    return /\.(jpg|jpeg|png|webp)$/i.test(this.candidateResumeRawUrl);
  }




}
