import { Component, OnInit, inject } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
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
import { CandidateSummary } from '../candidate-summary/candidate-summary';
import { SkeletonModule } from 'primeng/skeleton';
import { Toast } from "primeng/toast";


type ActionKey =
  | `MOVE:${ApplicationStatuses}`
  | 'INTERVIEW'
  | 'ASSIGN_TEST'
  | 'SEND_OFFER'
  | 'REVIEW_TEST'
  | 'SIGN_OFFER'
  | 'JOINED'
  | 'NO_SHOW'
  | 'DECLINE_OFFER'
  | 'SCHEDULE_PANEL'
  | 'SCHEDULE_MANAGEMENT';


@Component({
  selector: 'app-application-status',
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, Tooltip, TableModule,
    CandidateSummary,
    InputText,
    MultiSelectModule,
    TextareaModule,
    SelectModule,
    RadioButtonModule,
    DividerModule,
    TagModule,
    Chip,
    DatePicker, ReactiveFormsModule, SkeletonModule, Toast],
  templateUrl: './application-status.html',
  styleUrl: './application-status.css',
  providers: [MessageService]
})



export class ApplicationStatus implements OnInit {
  private api = inject(Recuriting);
  private fb = inject(FormBuilder);
  private messages = inject(MessageService);
  constructor(private sanitizer: DomSanitizer, private employeeService: Employees,
     private messageService: MessageService, private cd: ChangeDetectorRef) { }

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
  showSummaryDialog = false;
  selectedAppId: number | null = null;
  statuses = [
    'APPLIED',
    'SCREENING',
    'SHORTLISTED',
    'INTERVIEW_SCHEDULED',
    'INTERVIEWED',
    'OFFERED',
    'OFFER_ACCEPTED',
    'OFFER_DECLINED',
    'REJECTED',
    'WITHDRAWN',
    'HIRED',
    'NO_SHOW'
  ];
  isLoading = false;
  



  currentApp: Application | null = null;

  showInterviewDialog = false;
  showOfferDialog = false;
  showReasonDialog = false;
  reasonMode: 'decline' | 'no-show' = 'decline';
  reasonDialogTitle = 'Reason';
  reasonDialogLabel = 'Reason (optional)';

  /** Forms */
  // interviewForm = this.fb.group({
  //   stage: ['Tech1', Validators.required],
  //   startTime: [null as Date | null, Validators.required],
  //   endTime: [null as Date | null, Validators.required],
  //   panelUserIds: [''],
  // });
  interviewForm = this.fb.group(
    {
      stage: ['Tech1', Validators.required],

      // date-only + time-only
      startDate: [null as Date | null, Validators.required],
      startTime: [null as Date | null, Validators.required],
      endDate: [null as Date | null, Validators.required],
      endTime: [null as Date | null, Validators.required],

      panelIds: [[] as (number | string)[]],
    },
    { validators: [this.endAfterStartValidator()] }
  );

  endAfterStartValidator() {
    return (fg: import('@angular/forms').AbstractControl) => {
      const v: any = fg.value || {};
      if (!v.startDate || !v.startTime || !v.endDate || !v.endTime) return null;
      const s = new Date(v.startDate); s.setHours(v.startTime.getHours(), v.startTime.getMinutes(), 0, 0);
      const e = new Date(v.endDate); e.setHours(v.endTime.getHours(), v.endTime.getMinutes(), 0, 0);
      return e > s ? null : { endBeforeStart: true };
    };
  }

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
    this.loading = true
    setTimeout(() => {
      this.api.listJobs({ pageSize: 200 }).subscribe(res => (this.jobs = res.rows));
      this.load();
    },2000)

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
  scheduleInterview(a: Application, stage: any) {
    this.currentApp = a;
    this.showInterviewDialog = true;

    // reset form (keep your existing defaults if any)
    this.interviewForm.reset({ stage: stage, startTime: null, endTime: null, panelIds: [] });
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
  // syncPanelCsv() {
  //   const csv = (this.selectedPanelIds ?? []).join(',');
  //   this.interviewForm.patchValue({ panelUserIds: csv }, { emitEvent: false });
  // }
  private toIso(d: Date | string): string {
    return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
  }

  submitInterview() {
    if (!this.currentApp) return;
    this.isLoading = true;

    const v = this.interviewForm.value;
    const start = this.combineDateAndTime(v.startDate as Date, v.startTime as Date);
    const end = this.combineDateAndTime(v.endDate as Date, v.endTime as Date);

    const payload = {
      stage: (v.stage ?? '').toString().trim(),
      // pick one based on your backend
      // startTime: start.toISOString(),
      // endTime:   end.toISOString(),
      startTime: this.toOffsetIso(start),
      endTime: this.toOffsetIso(end),
      panelUserIds: (v.panelIds ?? []).join(','),
    };

    this.api.scheduleInterview(this.currentApp.id, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Interview Scheduled',
          detail: 'Interview has been successfully scheduled.',
        });
        this.isLoading = false;
        this.showInterviewDialog = false;
        this.resetInterview();
        this.load();
      },
      error: (err) => {
        if (err.status === 409 && err.error?.warning) {
          const details = (err.error.conflicts || []).join('\n');
          this.messageService.add({
            severity: 'warn',
            summary: 'Scheduling Conflict',
            detail: `${err.error.message}\n${details}`,
            life: 8000,
          });
          this.isLoading = false;
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to schedule interview',
          });
          this.isLoading = false;
        }
      },
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
  resetInterview() { 
    this.interviewForm.reset({ stage: 'Tech1', startTime: null, endTime: null, panelIds: [] });
    // this.resetAction(this.currentApp?.id!);
 }

  submitOffer(skipDate: boolean) {
    if (!this.currentApp) return;
    const dt = this.offerForm.value.proposedJoinAt as Date | null;
    const iso = skipDate || !dt ? undefined : dt.toISOString();
    this.isLoading = true;
    this.getOrCreateOffer(this.currentApp).pipe(
      switchMap(ofr => this.api.sendOffer(ofr.id, iso))
    ).subscribe(() => {
      this.isLoading = false;
      this.showOfferDialog = false;
      this.offerForm.reset();
      this.load();
    });
  }

  submitReason() {
    if (!this.currentApp) return;
    const reason = this.reasonForm.value.reason || undefined;
    this.isLoading = true;

    const call$ = this.reasonMode === 'decline'
      ? this.getOrCreateOffer(this.currentApp).pipe(switchMap(ofr => this.api.declineOffer(ofr.id, reason)))
      : this.getOrCreateOffer(this.currentApp).pipe(switchMap(ofr => this.api.markNoShow(ofr.id, reason)));

    call$.subscribe(() => {
      this.showReasonDialog = false;
      this.reasonForm.reset();
      this.load();
      this.isLoading = false;
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
      next: (res) => { this.apps = res.rows; this.total = res.total },
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

  getApplicationStatusColors(status: ApplicationStatuses) {
    const hueMap: Record<ApplicationStatuses, number> = {
      APPLIED: 210,               // blue
      SCREENING: 190,             // teal
      SHORTLISTED: 120,           // green
      INTERVIEW_SCHEDULED: 50,    // amber
      INTERVIEWED: 40,            // orange
      OFFERED: 25,                // orange-red
      OFFER_ACCEPTED: 140,        // bright green
      OFFER_DECLINED: 0,          // red
      REJECTED: 350,              // dark red/pink
      WITHDRAWN: 280,             // purple
      HIRED: 160,                 // teal-green
      NO_SHOW: 30,                // brownish
    };

    const baseHue = hueMap[status] ?? 200; // fallback color
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`; // light pastel bg
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;   // dark text/dot

    return { badgeColor, dotColor };
  }


  move(
    app: Application,
    to: ApplicationStatuses,
    extras: Partial<{ rejectReason: any; currentStage: string; shortListNote: string }> = {}
  ) {
    const extra: { rejectReason?: any; currentStage?: string; shortListNote?: string } = {};
    if (extras.rejectReason) extra.rejectReason = extras.rejectReason;
    if (extras.currentStage?.trim()) extra.currentStage = extras.currentStage.trim();
    if (extras.currentStage?.trim() && to === 'SHORTLISTED') {
      extra.shortListNote = extras.shortListNote!.trim();
    }


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
    const interviews = a.interviews || [];
    const testAssigned = (a as any).CandidateAssignedTest?.length > 0;

    if (interviews.length === 0 && (a.status === 'SHORTLISTED' || a.status === 'SCREENING')) {
      // ✅ First interview not done yet
      opts.push({ label: 'Schedule Round 1 – Panel', value: 'SCHEDULE_PANEL' });
    } else if (interviews.some((i: any) => i.stage === 'Panel') && !testAssigned) {
      // ✅ Test not yet assigned
      opts.push({ label: 'Schedule Round 2 – Test', value: 'ASSIGN_TEST' });
    } else if (testAssigned && !interviews.some((i: any) => i.stage === 'Management')) {
      // ✅ Management interview not yet scheduled
      opts.push({ label: 'Schedule Round 3 – Management', value: 'SCHEDULE_MANAGEMENT' });
    }
    // // 2) Interview ---------------------------------------------------
    // if (a.status === 'SHORTLISTED' || a.status === 'SCREENING') {
    //   opts.push({ label: 'Schedule Interview', value: 'INTERVIEW' });
    // }
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
      case 'DECLINE_OFFER':
        this.declineOffer(a);
        break;
      case 'SCHEDULE_PANEL':
        this.scheduleInterview(a, 'Panel');
        break;
      case 'ASSIGN_TEST':
        this.openAssignTest(a);
        break;

      case 'SCHEDULE_MANAGEMENT':
        this.scheduleInterview(a, 'Management');
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
    this.assignTestForm.reset({ testId: null, testDateDate: null, deadlineDateDate: null, testDateTime: null, deadlineDateTime: null });
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
    this.isLoading = true;
    const payload = {
      testId: Number(v.testId), // <-- cast to number (in case it’s a string)
      testDate: this.toIsos(v.testDateDate!, v.testDateTime!),
      deadlineDate: this.toIsos(v.deadlineDateDate!, v.deadlineDateTime!),
    };
    this.api.assignTestToApplication(this.currentApp.id, payload).subscribe(() => {
      this.showAssignTestDialog = false;
      this.load(); // refresh applications/interviews if you show them
      this.isLoading = false;
    });
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
    this.resetAction(this.rejectDlg.app.id);
  }
  shortlistDlg = { visible: false, app: null as Application | null, stage: '', shortListNote: '' };
  openShortlistDialog(a: Application) { this.shortlistDlg = { visible: true, app: a, stage: '', shortListNote: '' }; }
  doShortlist() {
    if (!this.shortlistDlg.app || !this.shortlistDlg.stage) return;
    
    this.move(this.shortlistDlg.app, 'SHORTLISTED', { currentStage: this.shortlistDlg.stage.trim(), shortListNote: this.shortlistDlg.shortListNote.trim() });
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

  private combineDateAndTime(date: Date, time: Date): Date {
    if (!date || !time) return null as any;
    const d = new Date(date);
    d.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return d;
  }

  // If your backend expects UTC, use toISOString().
  // If it expects local wall time with offset (recommended), use this:
  private toOffsetIso(d: Date): string {
    const pad = (n: number) => `${Math.floor(Math.abs(n))}`.padStart(2, '0');
    const off = -d.getTimezoneOffset(); // minutes
    const sign = off >= 0 ? '+' : '-';
    const hh = pad(off / 60), mm = pad(off % 60);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${hh}:${mm}`;
  }
  openSummaryDialog(app: any) {
    this.selectedAppId = app.id;
    this.showSummaryDialog = true;
  }
  resetAction(appId: number) {
    this.actionSel = { ...this.actionSel, [appId]: null };
    this.cd.detectChanges();
  }
  onInterviewDialogHide() {
    // Reset the form
    console.log('Interview dialog closed');
    this.resetInterview();
  
    // Reset dropdown selection (so you can reselect the same action)
    if (this.currentApp) {
      this.resetAction(this.currentApp.id);
    }
  
    // Clear current app reference
    this.currentApp = null;
  }
  onActionChange(a: Application, key: ActionKey | null) {
    if (!key) return;
  
    // Call your handler first
    this.handleActionSelect(a, key);
  
    // Reset the dropdown *after* a brief delay to ensure reactivity
    setTimeout(() => {
      this.actionSel = { ...this.actionSel, [a.id]: null }; // new object reference
    }, 100);
  }
  truncate(text?: string, limit = 10) {
    return text && text.length > limit ? text.slice(0, limit) + '…' : text || '';
  }
  
  
}