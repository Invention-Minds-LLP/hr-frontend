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

@Component({
  selector: 'app-recruitment-dashboard',
  imports: [CommonModule, FormsModule, JobCreate, ApplicationCreate, ApplicationStatus, ToastModule, SelectModule],
  templateUrl: './recruitment-dashboard.html',
  styleUrl: './recruitment-dashboard.css',
  providers:[MessageService]
})
export class RecruitmentDashboard implements OnInit {
  private api = inject(Recuriting);
  private messages = inject(MessageService);

  // top stats
  stats = signal<{ [k: string]: number }>({});

  // jobs
  jobs: Job[] = [];
  totalJobs = 0;
  page = 1; pageSize = 10;
  selectedJob?: Job;

  // applications for the selected job
  apps: Application[] = [];
  totalApps = 0;
  appPage = 1; appPageSize = 20;

  loading = false;
  updatingJobId: number | null = null;

  // Allowed transitions (tweak if you want to disallow reopening CLOSED, etc.)
  private jobMoves: Record<JobStatus, JobStatus[]> = {
    OPEN: ['ON_HOLD', 'CLOSED', 'DRAFT'],
    ON_HOLD: ['OPEN', 'CLOSED', 'DRAFT'],
    DRAFT: ['OPEN', 'ON_HOLD', 'CLOSED'],
    CLOSED: ['OPEN', 'ON_HOLD', 'DRAFT'], // or [] if you do NOT allow reopen
  };

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
  }

  loadStats() {
    this.api.pipelineStats().subscribe(s => this.stats.set(s as any));
  }

  loadJobs() {
    this.loading = true;
    this.api.listJobs({ page: this.page, pageSize: this.pageSize }).subscribe({
      next: (res) => { this.jobs = res.rows; this.totalJobs = res.total; },
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
      this.api.sendOffer(of.id, join).subscribe(() => this.loadApps());
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
}
