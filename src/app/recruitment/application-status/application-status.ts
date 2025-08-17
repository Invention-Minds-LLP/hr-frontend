import { Component, OnInit, inject } from '@angular/core';
import { of, switchMap } from 'rxjs';
// RxJS
import {  forkJoin, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  Recuriting, Application, ApplicationStatuses, Job, Offer, EvalTestLite, CandidateAssignedTest
} from '../../services/recruiting/recuriting';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { DatePicker } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { InputText } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

type ActionKey =
  | `MOVE:${ApplicationStatuses}`
  | 'INTERVIEW'
  | 'ASSIGN_TEST'
  | 'SEND_OFFER'
  |'REVIEW_TEST'
  | 'SIGN_OFFER'
  | 'JOINED'
  | 'NO_SHOW'
  | 'DECLINE_OFFER';


@Component({
  selector: 'app-application-status',
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule,
    InputText,
    TextareaModule,
    SelectModule,
    DatePicker, ReactiveFormsModule],
  templateUrl: './application-status.html',
  styleUrl: './application-status.css',
  providers:[MessageService]
})



export class ApplicationStatus implements OnInit {
  private api = inject(Recuriting);
  private fb = inject(FormBuilder);
  private messages = inject(MessageService);

  jobs: Job[] = [];
  selectedJobId?: number;
  filterStatus?: ApplicationStatuses | '';
  q = '';

  apps: Application[] = [];
  total = 0;
  page = 1; pageSize = 20;
  loading = false;
  error?: string;


  currentApp: Application | null = null;

  showInterviewDialog = false;
  showOfferDialog = false;
  showReasonDialog = false;
  reasonMode: 'decline' | 'no-show' = 'decline';
  reasonDialogTitle = 'Reason';
  reasonDialogLabel = 'Reason (optional)';

  /** Forms */
  interviewForm = this.fb.group({
    stage: ['Tech1', Validators.required],
    startTime: [null as Date | null, Validators.required],
    endTime: [null as Date | null, Validators.required],
    panelUserIds: [''],
  });

  offerForm = this.fb.group({
    proposedJoinAt: [null as Date | null],
  });

  reasonForm = this.fb.group({
    reason: [''],
  });


  // holds the current selected action per row (by application id)
  actionSel: Record<number, ActionKey | null> = {};


  ngOnInit() {
    this.api.listJobs({ pageSize: 200 }).subscribe(res => (this.jobs = res.rows));
    this.load();
  }
  scheduleInterview(app: Application) {
    this.currentApp = app;
    this.interviewForm.reset({ stage: 'Tech1', startTime: null, endTime: null, panelUserIds: '' });
    this.showInterviewDialog = true;
  }

  sendOffer(app: Application) {
    this.currentApp = app;
    this.offerForm.reset({ proposedJoinAt: null });
    this.showOfferDialog = true;
  }

  signOffer(app: Application) {
    this.getOrCreateOffer(app).pipe(
      switchMap(ofr => this.api.markOfferSigned(ofr.id))
    ).subscribe(() => this.load());
  }

  declineOffer(app: Application) {
    this.currentApp = app;
    this.reasonMode = 'decline';
    this.reasonDialogTitle = 'Decline Offer';
    this.reasonDialogLabel = 'Decline reason (optional)';
    this.reasonForm.reset({ reason: '' });
    this.showReasonDialog = true;
  }

  joined(app: Application) {
    this.getOrCreateOffer(app).pipe(
      switchMap(ofr => this.api.markJoined(ofr.id))
    ).subscribe(() => this.load());
  }

  noShow(app: Application) {
    this.currentApp = app;
    this.reasonMode = 'no-show';
    this.reasonDialogTitle = 'Mark No-show';
    this.reasonDialogLabel = 'Reason (optional)';
    this.reasonForm.reset({ reason: '' });
    this.showReasonDialog = true;
  }

  // --- submit handlers for dialogs ---

  submitInterview() {
    if (!this.currentApp || this.interviewForm.invalid) return;
    const v = this.interviewForm.value;
    const body = {
      stage: v.stage!,
      startTime: (v.startTime as Date).toISOString(),
      endTime: (v.endTime as Date).toISOString(),
      panelUserIds: v.panelUserIds || undefined,
    };
    this.api.scheduleInterview(this.currentApp.id, body).subscribe(() => {
      this.showInterviewDialog = false;
      this.resetInterview();
      this.load();
    });
  }
  resetInterview() { this.interviewForm.reset({ stage: 'Tech1', startTime: null, endTime: null, panelUserIds: '' }); }

  submitOffer(skipDate: boolean) {
    if (!this.currentApp) return;
    const dt = this.offerForm.value.proposedJoinAt as Date | null;
    const iso = skipDate || !dt ? undefined : dt.toISOString();

    this.getOrCreateOffer(this.currentApp).pipe(
      switchMap(ofr => this.api.sendOffer(ofr.id, iso))
    ).subscribe(() => {
      this.showOfferDialog = false;
      this.offerForm.reset();
      this.load();
    });
  }

  submitReason() {
    if (!this.currentApp) return;
    const reason = this.reasonForm.value.reason || undefined;

    const call$ = this.reasonMode === 'decline'
      ? this.getOrCreateOffer(this.currentApp).pipe(switchMap(ofr => this.api.declineOffer(ofr.id, reason)))
      : this.getOrCreateOffer(this.currentApp).pipe(switchMap(ofr => this.api.markNoShow(ofr.id, reason)));

    call$.subscribe(() => {
      this.showReasonDialog = false;
      this.reasonForm.reset();
      this.load();
    });
  }

  // --- helpers ---
  private getOrCreateOffer(app: Application) {
    return app.offer ? of(app.offer) : this.api.createOffer(app.id);
  }

  load() {
    this.loading = true;
    this.api.listApplications({
      jobId: this.selectedJobId,
      status: this.filterStatus || undefined,
      q: this.q || undefined,
      page: this.page,
      pageSize: this.pageSize,
    }).subscribe({
      next: (res) => { this.apps = res.rows; this.total = res.total; },
      error: (e) => this.error = e?.error?.error || 'Failed to load',
      complete: () => this.loading = false,
    });
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

  move(app: Application, to: ApplicationStatuses) {
    this.api.moveApplication(app.id, to).subscribe(() => this.load());
  }

  // scheduleInterview(app: Application) {
  //   const stage = prompt('Stage (e.g., Tech1)') || 'Screen';
  //   const start = prompt('Start ISO (e.g., 2025-08-22T10:00:00Z)');
  //   const end = prompt('End ISO (e.g., 2025-08-22T11:00:00Z)');
  //   if (!start || !end) return;
  //   this.api.scheduleInterview(app.id, { stage, startTime: start, endTime: end }).subscribe(() => this.load());
  // }

  // --- Offer helpers ---
  ensureOffer(app: Application, cb: (o: Offer) => void) {
    if (app.offer) return cb(app.offer);
    this.api.createOffer(app.id).subscribe(of => cb(of));
  }
  // sendOffer(app: Application) {
  //   this.ensureOffer(app, of => {
  //     const when = prompt('Proposed join date (ISO)?') || undefined;
  //     this.api.sendOffer(of.id, when).subscribe(() => this.load());
  //   });
  // }
  // signOffer(app: Application) { this.ensureOffer(app, of => this.api.markOfferSigned(of.id).subscribe(() => this.load())); }
  // declineOffer(app: Application) {
  //   const reason = prompt('Decline reason?') || undefined;
  //   this.ensureOffer(app, of => this.api.declineOffer(of.id, reason).subscribe(() => this.load()));
  // }
  // joined(app: Application) { this.ensureOffer(app, of => this.api.markJoined(of.id).subscribe(() => this.load())); }
  // noShow(app: Application) {
  //   const r = prompt('No-show reason?') || undefined;
  //   this.ensureOffer(app, of => this.api.markNoShow(of.id, r).subscribe(() => this.load()));
  // }


  actionOptionsFor(a: Application): { label: string; value: ActionKey; disabled?: boolean }[] {
    const opts: { label: string; value: ActionKey; disabled?: boolean }[] = [];

    // 1) Status moves (from your allowedMoves()) -------------------
    const moves = this.allowedMoves(a.status) || [];
    if (moves.length) {
      opts.push(...moves.map(m => ({ label: `Move → ${m}`, value: `MOVE:${m}` as const })));
    }

    // 2) Interview ---------------------------------------------------
    if (a.status === 'SHORTLISTED' || a.status === 'SCREENING') {
      opts.push({ label: 'Schedule Interview', value: 'INTERVIEW' });
    }
    if (['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED'].includes(a.status)) {
      opts.push({ label: 'Assign Test', value: 'ASSIGN_TEST' as const });
    }
    // 3) Offer actions ----------------------------------------------
    if (a.status === 'INTERVIEWED' || a.status === 'OFFERED' || a.status === 'OFFER_ACCEPTED') {
      opts.push({ label: 'Send Offer', value: 'SEND_OFFER' });
    }
    if (a.offer?.status === 'SENT' || a.offer?.status === 'VIEWED') {
      opts.push({ label: 'Mark Offer Signed', value: 'SIGN_OFFER' });
    }
    if (a.status === 'OFFER_ACCEPTED') {
      opts.push({ label: 'Mark Joined', value: 'JOINED' });
    }
    if (a.status === 'OFFERED' || a.status === 'OFFER_ACCEPTED') {
      opts.push({ label: 'Mark No-show', value: 'NO_SHOW' });
    }
    if (a.offer && a.offer.status !== 'DECLINED' && a.offer.status !== 'SIGNED') {
      opts.push({ label: 'Decline Offer', value: 'DECLINE_OFFER' });
    }
    if (this.hasPendingTestReview(a)) { // see loader below
      opts.push({ label: 'Review Test', value: 'REVIEW_TEST' });
    }


    // If nothing available, show disabled placeholder
    if (!opts.length) {
      opts.push({ label: 'No actions available', value: 'INTERVIEW', disabled: true });
    }

    return opts;
  }

  handleActionSelect(a: Application, key: ActionKey | null) {
    if (!key) return;

    // Moves
    if (key.startsWith('MOVE:')) {
      const target = key.split(':')[1] as ApplicationStatuses;
      this.move(a, target);
      return;
    }

    // Others
    switch (key) {
      case 'INTERVIEW':
        this.scheduleInterview(a);
        break;
      case 'ASSIGN_TEST':
        this.openAssignTest(a);
        break;
      case 'SEND_OFFER':
        this.sendOffer(a);
        break;
      case 'SIGN_OFFER':
        this.signOffer(a);
        break;
      case 'JOINED':
        this.joined(a);
        break;
      case 'NO_SHOW':
        this.noShow(a);
        break;
      case 'REVIEW_TEST':
         this.openReviewTest(a);
       break;
      case 'DECLINE_OFFER':
        this.declineOffer(a);
        break;
    }
  }
  // component TS additions
  testsCatalog: EvalTestLite[] = [];
  showAssignTestDialog = false;
  assignTestForm = this.fb.group({
    testId: [null as number | null, Validators.required],
    testDate: [null as Date | null],      // optional start
    deadlineDate: [null as Date | null],  // optional deadline
  });

  openAssignTest(a: Application) {
    this.currentApp = a;
    if (!this.testsCatalog.length) {
      this.api.listPublishedTests().subscribe(t => this.testsCatalog = t || []);
    }
    this.assignTestForm.reset({ testId: null, testDate: null, deadlineDate: null });
    this.showAssignTestDialog = true;
  }

  submitAssignTest() {
    if (!this.currentApp || this.assignTestForm.invalid) return;
    const v = this.assignTestForm.value;
    const body = {
      testId: Number(v.testId),
      testDate: v.testDate ? (v.testDate as Date).toISOString() : undefined,
      deadlineDate: v.deadlineDate ? (v.deadlineDate as Date).toISOString() : undefined,
    };
    this.api.assignTestToApplication(this.currentApp.id, body).subscribe(() => {
      this.showAssignTestDialog = false;
      this.load(); // refresh applications/interviews if you show them
    });
  }
  // async annotatePendingReviews(apps: Application[]) {
  //   // naive batching; you can parallelize with forkJoin
  //   for (const a of apps) {
  //     const tests = await firstValueFrom(this.api.listApplicationTests(a.id).pipe(catchError(() => of([]))));
  //     a['_tests'] = tests;
  //     a['_hasPendingTestReview'] = tests.some(t => t.status === 'Completed' && !t.reviewedAt);
  //   }
  // }

  // fields
  showReviewDialog = false;
  reviewCtx: CandidateAssignedTest | null = null;

  reviewForm = this.fb.group({
    decision: [null as 'PASS' | 'FAIL' | null, Validators.required],
    note: [''],
  });

  openReviewTest(a: Application) {
    // pick the latest completed & unreviewed test
    const tests = (a as any)._tests as CandidateAssignedTest[] || [];
    const pending = tests.find(t => t.status === 'Completed' && !t.reviewedAt);
    if (!pending) { this.messages.add({ severity: 'info', summary: 'Nothing to review' }); return; }
    this.currentApp = a;
    this.reviewCtx = pending;
    this.reviewForm.reset({ decision: null, note: '' });
    this.showReviewDialog = true;
  }

  submitReview() {
    if (!this.currentApp || !this.reviewCtx || this.reviewForm.invalid) return;
    const { decision, note } = this.reviewForm.value;

    this.api.reviewCandidateTest(this.currentApp.id, this.reviewCtx.id, {
      decision: decision as 'PASS' | 'FAIL', note: note || undefined
    }).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Saved', detail: 'Review recorded' });
        this.showReviewDialog = false;
        // update local flags
        this.reviewCtx!.reviewDecision = decision as any;
        this.reviewCtx!.reviewedAt = new Date().toISOString();
        (this.currentApp as any)._hasPendingTestReview = false;
      },
      error: (e) => this.messages.add({ severity: 'error', summary: 'Failed', detail: e?.error?.error || 'Could not save review' })
    });
  }

  pendingReviewByAppId: Record<number, boolean> = {};

  // when you load apps, compute flags
  async annotatePendingReviews(apps: Application[]) {
    const obs = apps.map(a =>
      this.api.listApplicationTests(a.id).pipe(catchError(() => of([])))
    );
    const lists = await firstValueFrom(forkJoin(obs));
    for (let i = 0; i < apps.length; i++) {
      const tests = lists[i] as CandidateAssignedTest[];
      this.pendingReviewByAppId[apps[i].id] =
        tests.some(t => t.status === 'Completed' && !t.reviewedAt);
    }
  }
  
  // tiny helper used anywhere (TS-safe)
  hasPendingTestReview(a: Application) {
    return !!this.pendingReviewByAppId[a.id];
  }
}