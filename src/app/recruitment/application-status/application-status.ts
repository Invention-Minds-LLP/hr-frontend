import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { of, switchMap } from 'rxjs';
// RxJS
import { forkJoin, firstValueFrom } from 'rxjs';
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
import { Tooltip } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { MultiSelectModule } from 'primeng/multiselect';
import { Employees } from '../../services/employees/employees';
import { Chip } from 'primeng/chip';

type ActionKey =
  | `MOVE:${ApplicationStatuses}`
  | 'INTERVIEW'
  | 'ASSIGN_TEST'
  | 'SEND_OFFER'
  | 'REVIEW_TEST'
  | 'SIGN_OFFER'
  | 'JOINED'
  | 'NO_SHOW'
  | 'DECLINE_OFFER';


@Component({
  selector: 'app-application-status',
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, Tooltip, TableModule,
    InputText,
    MultiSelectModule,
    TextareaModule,
    SelectModule,
    RadioButtonModule,
    DividerModule,
    TagModule,
    Chip,
    DatePicker, ReactiveFormsModule],
  templateUrl: './application-status.html',
  styleUrl: './application-status.css',
  providers: [MessageService]
})



export class ApplicationStatus implements OnInit {
  private api = inject(Recuriting);
  private fb = inject(FormBuilder);
  private messages = inject(MessageService);
  constructor(private sanitizer: DomSanitizer, private employeeService: Employees) { }

  jobs: Job[] = [];
  selectedJobId?: number;
  filterStatus?: ApplicationStatuses | '';
  q = '';

  apps: Application[] = [];
  total = 0;
  page = 1; pageSize = 20;
  loading = false;
  error?: string;
  resumeDialogOpen = false;
  resumeSafeUrl?: SafeResourceUrl;


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

  rejectDlg = { visible: false, app: null as Application | null, reason: null as any | null, note: '' };
  rejectReasonOptions = [
    { label: 'Salary', value: 'SALARY' },
    { label: 'Role mismatch', value: 'ROLE_MISMATCH' },
    { label: 'Location', value: 'LOCATION' },
    { label: 'Experience', value: 'EXPERIENCE' },
    { label: 'Culture', value: 'CULTURE' },
    { label: 'Other', value: 'OTHER' },
  ];

  // holds the current selected action per row (by application id)
  actionSel: Record<number, ActionKey | null> = {};


  ngOnInit() {
    this.api.listJobs({ pageSize: 200 }).subscribe(res => (this.jobs = res.rows));
    this.load();
  }
  // scheduleInterview(app: Application) {
  //   this.currentApp = app;
  //   this.interviewForm.reset({ stage: 'Tech1', startTime: null, endTime: null, panelUserIds: '' });
  //   this.showInterviewDialog = true;
  // }

// ---- fields ----
panelOptions: Array<{ label: string; value: number; meta?: { code: string } }> = [];
selectedPanelIds: number[] = []; // bound to p-multiSelect

// helper to render selected chips
panelLabelById = (id: number) =>
  this.panelOptions.find(o => o.value === id)?.label ?? String(id);

// call this when opening the dialog for an app
scheduleInterview(a: Application) {
  this.currentApp = a;
  this.showInterviewDialog = true;

  // reset form (keep your existing defaults if any)
  this.interviewForm.reset({ stage: '', startTime: null, endTime: null, panelUserIds: '' });
  this.selectedPanelIds = [];

  // load employees from job's department (ACTIVE only)
  const depId = a?.job?.departmentId;
  if (depId) {
    this.employeeService.list({ departmentId: depId, status: 'ACTIVE' })
      .subscribe(rows => {
        this.panelOptions = rows.map(e => {
          const code = e.employeeCode ?? undefined; // code?: string
          const opt: { label: string; value: number; meta?: { code: string } } = {
            label: `${e.firstName} ${e.lastName}${code ? ` (${code})` : ''}`,
            value: e.id
          };
          if (code) opt.meta = { code }; // only add when it's a string
          return opt;
        });
      });
  } else {
    // fallback: load none or all; choose your preference
    this.panelOptions = [];
  }
}

// keep the CSV in your form control so submit logic stays simple
syncPanelCsv() {
  const csv = (this.selectedPanelIds ?? []).join(',');
  this.interviewForm.patchValue({ panelUserIds: csv }, { emitEvent: false });
}
private toIso(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

submitInterview() {
  if (!this.currentApp) return;

  // ensure panel CSV is up to date (in case user didn't change after open)
  this.syncPanelCsv();

  const v = this.interviewForm.value;
  console.log('submitInterview', v);
  const payload = {
    stage: (v.stage ?? '').toString().trim(),          // ← ensure string
    startTime: this.toIso(v.startTime as Date),        // ← Date -> ISO string
    endTime:   this.toIso(v.endTime as Date),          // ← Date -> ISO string
    panelUserIds: v.panelUserIds || '',
  };

  this.api.scheduleInterview(this.currentApp.id, payload)
    .subscribe(() => {
      this.showInterviewDialog = false;
      this.resetInterview();
      this.load(); // your refresh
    });
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

  // submitInterview() {
  //   if (!this.currentApp || this.interviewForm.invalid) return;
  //   const v = this.interviewForm.value;
  //   const body = {
  //     stage: v.stage!,
  //     startTime: (v.startTime as Date).toISOString(),
  //     endTime: (v.endTime as Date).toISOString(),
  //     panelUserIds: v.panelUserIds || undefined,
  //   };
  //   this.api.scheduleInterview(this.currentApp.id, body).subscribe(() => {
  //     this.showInterviewDialog = false;
  //     this.resetInterview();
  //     this.load();
  //   });
  // }
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
      next: (res) => { this.apps = res.rows; this.total = res.total; this.annotatePendingReviews(this.apps) },
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

  move(
    app: Application,
    to: ApplicationStatuses,
    extras: Partial<{ rejectReason: any; currentStage: string }> = {}
  ) {
    const extra: { rejectReason?: any; currentStage?: string } = {};
    if (extras.rejectReason) extra.rejectReason = extras.rejectReason;
    if (extras.currentStage?.trim()) extra.currentStage = extras.currentStage.trim();
  
    this.api.moveApplication(app.id, to, extra)
      .subscribe(() => this.load());
  }
  sendOffer(app: Application) {
    this.currentApp = app;
    this.offerForm.reset({ proposedJoinAt: null });
    this.showOfferDialog = true;
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

    if (key.startsWith('MOVE:')) {
      const target = key.split(':')[1] as ApplicationStatuses;

      // Require reason for REJECTED
      console.log(target)
      if (target === 'REJECTED') { this.openRejectDialog(a); return; }
      if (target === 'SHORTLISTED') { this.openShortlistDialog(a); return; }


      this.move(a, target);
      return;
    }

    // Non-move actions
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
    testId: [null, Validators.required],
  
    // start
    testDateDate: [null],        // Date only
    testDateTime: [null],        // Date object holding only time part
  
    // deadline
    deadlineDateDate: [null],
    deadlineDateTime: [null],
  });
  

  openAssignTest(a: Application) {
    this.currentApp = a;
    if (!this.testsCatalog.length) {
      this.api.listPublishedTests().subscribe(t => this.testsCatalog = t || []);
    }
    this.assignTestForm.reset({ testId: null, testDateDate: null, deadlineDateDate: null, testDateTime:null, deadlineDateTime: null });
    this.showAssignTestDialog = true;
  }
  private toIsos(date: Date | null, time: Date | null): string | undefined {
    if (!date) return undefined;
    const d = new Date(date);
    if (time) {
      d.setHours(time.getHours(), time.getMinutes(), time.getSeconds() || 0, 0);
    }
    return d.toISOString(); // send string; adjust if your API expects Date
  }

  submitAssignTest() {
    if (!this.currentApp || this.assignTestForm.invalid) return;
    const v = this.assignTestForm.value;
    const payload = {
      testId: Number(v.testId), // <-- cast to number (in case it’s a string)
      testDate: this.toIsos(v.testDateDate!, v.testDateTime!),
      deadlineDate: this.toIsos(v.deadlineDateDate!, v.deadlineDateTime!),
    };
    this.api.assignTestToApplication(this.currentApp.id, payload).subscribe(() => {
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
    decision: this.fb.control<string | null>(null, { validators: Validators.required }),
    note: this.fb.control<string>(''),
  });

  // openReviewTest(a: Application) {
  //   console.log('openReviewTest', a);
  //   // pick the latest completed & unreviewed test
  //   const tests = (a as any)._CandidateAssignedTest as CandidateAssignedTest[] || [];
  //   const pending = tests.find(t => t.status === 'Completed' && !t.reviewedAt);
  //   if (!pending) { this.messages.add({ severity: 'info', summary: 'Nothing to review' }); return; }
  //   this.currentApp = a;
  //   this.reviewCtx = pending;
  //   this.reviewForm.reset({ decision: null, note: '' });
  //   this.showReviewDialog = true;
  // }
  openReviewTest(a: Application & { CandidateAssignedTest?: CandidateAssignedTest[] }) {
    // use the property that actually exists on the object
    const tests = a.CandidateAssignedTest ?? [];

    // pick latest Completed + not reviewed
    const pending = tests
      .sort((x, y) => new Date(y.completedAt ?? 0).getTime() - new Date(x.completedAt ?? 0).getTime())
      .find(t => /completed/i.test(t.status ?? '') && !t.reviewedAt);

    if (!pending) {
      this.messages.add({ severity: 'info', summary: 'Nothing to review' });
      return;
    }

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
  resumeUrl(a: any): string | null {
    return a?.resumeUrl || a?.candidate?.resumeUrl || null;
  }

  /** Open modal viewer */
  viewResume(a: any) {
    const url = this.resumeUrl(a);
    if (!url) {
      this.resumeSafeUrl = undefined;
      this.resumeDialogOpen = true;
      return;
    }
    // If your resumes are PDFs this will embed them; other formats will download/open in-browser as supported
    this.resumeSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.resumeDialogOpen = true;
  }
  openRejectDialog(a: Application) { this.rejectDlg = { visible: true, app: a, reason: null, note: '' }; }
  doReject() {
    if (!this.rejectDlg.app || !this.rejectDlg.reason) return;
    this.move(this.rejectDlg.app, 'REJECTED', {
      rejectReason: this.rejectDlg.reason,

    });
    this.rejectDlg.visible = false;
  }
  shortlistDlg = { visible: false, app: null as Application | null, stage: '' };
  openShortlistDialog(a: Application) { this.shortlistDlg = { visible: true, app: a, stage: '' }; }
  doShortlist() {
    if (!this.shortlistDlg.app || !this.shortlistDlg.stage) return;
    this.move(this.shortlistDlg.app, 'SHORTLISTED', { currentStage: this.shortlistDlg.stage.trim() });
    this.shortlistDlg.visible = false;
  }
  initials(label?: string | null): string {
    if (!label) return '?';
    const parts = label.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    const first = parts[0]?.[0] ?? '';
    const second = (parts[1]?.[0] ?? '') || (parts[0]?.[1] ?? ''); // fallback to 2 letters of first word
    const res = (first + second).toUpperCase();
    return res || '?';
  }
  
}