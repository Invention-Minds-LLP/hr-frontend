import { CommonModule } from '@angular/common';
import { Component, Input, ElementRef, ViewChild, Output, EventEmitter, ViewChildren, QueryList } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { PerformanceService } from '../../services/performances/performance-service';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { Incident } from '../../services/incident/incident';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { Appraisal } from '../../services/appraisal/appraisal';

@Component({
  selector: 'app-appraisal-template',
  imports: [CommonModule, ReactiveFormsModule, TabsModule, FormsModule,
    TableModule, InputTextModule, TextareaModule, SelectModule, DialogModule,
    ButtonModule, FloatLabelModule
  ],
  templateUrl: './appraisal-template.html',
  styleUrl: './appraisal-template.css',
  providers: [MessageService]
})
export class AppraisalTemplate {
  template: any;
  employeeCode!: string;
  employeeId!: number;
  departmentId!: number;
  cycle!: string;
  templateId?: number;
  currentPeriod: 'MONTH_1' | 'MONTH_3' | 'MONTH_6' | 'YEAR_1' = 'MONTH_1';
  joiningDate: any;
  employeeName: string = '';
  @Input() summaryData: any;
  @Output() closeForm = new EventEmitter<void>();


  incidentDialogVisible = false;
  incidents: any[] = [];
  loadingIncidents = false;
  isLoading = false;


  // Overall summary structure
  summary: any = {
    MONTH_1: {}, MONTH_3: {}, MONTH_6: {}, YEAR_1: {} //, YEAR_2: {}
  };
  scoreOptions = [
    { label: '1 - Poor', value: 1 },
    { label: '2 - Satisfactory', value: 2 },
    { label: '3 - Good', value: 3 },
    { label: '4 - Very Good', value: 4 },
    { label: '5 - Excellent', value: 5 }
  ];

  /** Bands are a percentage of the template's own maximum — see updateMarksScored(). */
  performanceOptions = [
    { label: 'Outstanding (95%+)', value: 'Outstanding' },
    { label: 'Commendable (80–94%)', value: 'Commendable' },
    { label: 'Acceptable (60–79%)', value: 'Acceptable' },
    { label: 'Not Acceptable (below 60%)', value: 'Not Acceptable' }
  ];

  /** Highest value in scoreOptions — one place to change if the scale changes. */
  private readonly MAX_SCORE_PER_QUESTION = 5;

  /** Which column this user fills: SELF | INCHARGE | SUPERVISOR | HOD.
   *  Null means they may read the sheet but not score it. Derived server-side
   *  from their relationship to the employee, not their role id. */
  reviewerRole: string | null = null;

  /** HOD is the employee's reporting manager — there is no separate
   *  department-head field, and that is who signs the HOD column. */
  reviewerRoleLabels: Record<string, string> = {
    SELF: 'Self',
    INCHARGE: 'In-charge',
    HOD: 'HOD',
    MANAGEMENT: 'Management',
    REVIEWER: 'Reviewer',
  };

  /** Other reviewers' scores, shown read-only beside your own column. Only HR
   *  receives these — for everyone else the server filters them out, so this
   *  stays empty. Keyed `questionId|period` -> [{ role, score }]. */
  othersScores: Record<string, Array<{ role: string; score: number }>> = {};

  /** True when the caller is HR and therefore sees every reviewer's marks. */
  canSeeAllScores = false;

  /** Bands from the template, falling back to the system default. */
  scoreBands: Array<{ label: string; minPercent: number }> = [
    { label: 'Outstanding', minPercent: 95 },
    { label: 'Commendable', minPercent: 80 },
    { label: 'Acceptable', minPercent: 60 },
    { label: 'Not Acceptable', minPercent: 0 },
  ];

  downloading = false;

  // Raised when a submit is refused because HR has signed the period off.
  editRequestVisible = false;
  editRequestReason = '';
  editRequestSending = false;
  lockedSummaryId: number | null = null;

  sendEditRequest() {
    if (!this.lockedSummaryId || !this.editRequestReason.trim()) return;
    this.editRequestSending = true;
    this.formService.requestEdit(this.lockedSummaryId, this.editRequestReason.trim()).subscribe({
      next: (res) => {
        this.editRequestSending = false;
        this.editRequestVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Request sent',
          detail: res?.message || 'HR will review your request.',
          life: 6000,
        });
      },
      error: (err) => {
        this.editRequestSending = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Could not send',
          detail: err?.error?.error || 'Failed to send the request.',
        });
      },
    });
  }

  get canScore(): boolean {
    return !!this.reviewerRole;
  }

  othersFor(questionId: number, period: string): Array<{ role: string; score: number }> {
    return this.othersScores[`${questionId}|${period}`] || [];
  }

  /** Periods where the reviewer explicitly picked a band. Auto-calc leaves
   *  those alone instead of overwriting the choice on the next score change. */
  private manualPerf: Record<string, boolean> = {};

  summaryPeriods = ['MONTH_1', 'MONTH_3', 'MONTH_6', 'YEAR_1'];

  /** Fallback only. The server sends a per-cycle label, because a recurring
   *  review stores YEAR_1 whatever year it covers — a second-year review must
   *  read "2nd Year", not "1 Year". loadCycleShape() overwrites these. */
  periodLabels: Record<string, string> = {
    MONTH_1: '1st Month',
    MONTH_3: '3rd Month',
    MONTH_6: '6th Month',
    YEAR_1: '1 Year',
    YEAR_2: '2nd Year',
  };

  /** Columns to render. Four for a first-year cycle (the progression is worth
   *  seeing); just the row's own period for an annual one, where the probation
   *  columns are meaningless. Defaults to all four so legacy rows whose cycle
   *  predates the derived scheme keep working. */
  visiblePeriods: string[] = ['MONTH_1', 'MONTH_3', 'MONTH_6', 'YEAR_1'];
  track: 'FIRST_YEAR' | 'RECURRING' | null = null;

  /** period -> milestone date, and whether it has arrived. The backend refuses
   *  to store a period whose milestone is still in the future, so the form
   *  greys it out rather than letting the reviewer hit a 400 on submit. */
  milestoneDates: Record<string, string> = {};
  periodReached: Record<string, boolean> = {};

  /**
   * The Final Review is one record per CYCLE (PerformanceFinalReview is keyed by
   * employee + department + cycle, with no period), so it belongs only on the
   * cycle's last period. Showing it on the 1st Month sheet would let someone
   * write the whole cycle's closing remarks four months in.
   *
   * Last of visiblePeriods covers all three shapes: YEAR_1 for a first-year
   * cycle, the single annual period for a recurring one, and YEAR_1 again for a
   * legacy cycle that falls back to all four.
   */
  get isFinalPeriod(): boolean {
    if (!this.visiblePeriods.length) return true;
    return this.currentPeriod === this.visiblePeriods[this.visiblePeriods.length - 1];
  }

  /** Label of the period that carries the Final Review, for the note. */
  get finalPeriodLabel(): string {
    const last = this.visiblePeriods[this.visiblePeriods.length - 1];
    return this.periodLabels[last] || last || '';
  }

  /** True when the editable period is still locked behind its milestone. */
  get currentPeriodLocked(): boolean {
    return this.milestoneDates[this.currentPeriod] ? !this.periodReached[this.currentPeriod] : false;
  }

  isPeriodEditable(period: string): boolean {
    if (period !== this.currentPeriod) return false;
    return this.milestoneDates[period] ? !!this.periodReached[period] : true;
  }

  /**
   * Which signature lines this viewer may capture.
   *
   * HR runs the session — they sit with the employee, so they can capture any
   * line including the employee's own. A reviewer signs only their own: an
   * in-charge has no business signing the HOD's line, and neither of them
   * signs for the employee.
   */
  

  /** A pad is drawable only if the period is open AND this line is theirs. */
  

  /** Total paused days within the current cycle window. Loaded after the
   *  appraisal-form GET resolves; subtracted from the elapsed-months calc
   *  so a 6-month maternity pause keeps the employee on MONTH_6 instead of
   *  flipping them to YEAR_1. */
  pauseDays = 0;
  /** Currently-active pause, if any. Disables submit + shows top banner.
   *  HR can still override (banner reflects that). */
  activePause: { startDate: string; reason: string } | null = null;
  isHRUser = Number(localStorage.getItem('roleId')) === 1 ||
    (Number(localStorage.getItem('deptId')) === 1 && Number(localStorage.getItem('roleId')) === 2);
  setCurrentPeriod(joiningDate: Date, cycle: string) {
    // Parse cycle
    const { start: cycleStart, end: cycleEnd } = this.parseCycle(cycle);

    // Employee starts AFTER cycle → use actual joining date
    const effectiveStart = joiningDate > cycleStart ? joiningDate : cycleStart;

    // Today capped to cycle end
    const today = new Date();
    const effectiveToday = today > cycleEnd ? cycleEnd : today;

    const rawMonths = this.monthsBetween(effectiveStart, effectiveToday);
    // Convert paused days → months (mean month length) and subtract.
    const months = Math.max(0, rawMonths - this.pauseDays / 30.4375);
    console.log("Months inside cycle =", rawMonths, "minus paused =", this.pauseDays, "→ effective =", months);

    if (months < 1) return "MONTH_1";
    if (months < 3) return "MONTH_3";
    if (months < 6) return "MONTH_6";
    if (months < 12) return "YEAR_1";
    return "YEAR_1";
    // return "YEAR_2";
  }


  parseCycle(cycle: string) {
    const [from, , to] = cycle.split(" ");
    const start = new Date(from.replace("-", " "));
    const end = new Date(to.replace("-", " "));
    return { start, end };
  }
  /** Total paused days that overlap [max(DOJ, cycleStart), min(today, cycleEnd)]. */
  computePausedDaysInCycle(pauses: any[], doj: Date, cycle: string): number {
    const { start: cycleStart, end: cycleEnd } = this.parseCycle(cycle);
    const from = doj > cycleStart ? doj : cycleStart;
    const today = new Date();
    const to = today > cycleEnd ? cycleEnd : today;
    if (to <= from) return 0;
    const MS_DAY = 24 * 60 * 60 * 1000;
    let days = 0;
    for (const p of pauses) {
      const ps = new Date(p.startDate);
      const pe = p.endDate ? new Date(p.endDate) : to;
      const a = ps < from ? from : ps;
      const b = pe > to ? to : pe;
      if (b <= a) continue;
      days += Math.ceil((b.getTime() - a.getTime()) / MS_DAY);
    }
    return days;
  }

  monthsBetween(d1: Date, d2: Date) {
    return (
      d2.getFullYear() * 12 + d2.getMonth() - (d1.getFullYear() * 12 + d1.getMonth())
    );
  }


  // Final review structure
  finalReview: any = {
    appreciations: "",
    talents: "",
    overallComments: "",
    employeeSig: "",
    supervisorSig: "",
    hrSig: ""
  };


  constructor(private formService: PerformanceService, private incidentService: Incident, private messageService: MessageService,
    private appraisalService: Appraisal) { }

  ngOnInit() {
    if (this.summaryData) {
      this.employeeId = this.summaryData.employeeId;
      this.departmentId = this.summaryData.departmentId;
      this.cycle = this.summaryData.cycle;
      this.templateId = this.summaryData.templateId ?? this.summaryData.template?.id;
      this.employeeCode = this.summaryData.employee.employeeCode;
      console.log(this.summaryData);
      this.employeeName = this.summaryData.employee.firstName + ' ' + this.summaryData.employee.lastName;
    }
    else {
      console.error("No summary data provided to appraisal template");
      this.employeeId = 11;
      this.departmentId = 2;
      this.cycle = 'APR-2024 TO MAR-2025'


    }

    this.formService.getEmployeeForm(this.employeeId, this.departmentId, this.cycle, this.templateId).subscribe({
      next: (data) => {
        if (!data?.template) {
          this.messageService.add({
            severity: 'error',
            summary: 'No template',
            detail: 'No performance template is attached to this row. Ask HR to assign one.',
            life: 6000,
          });
          return;
        }

        this.reviewerRole = data.reviewerRole ?? null;
        this.canSeeAllScores = !!data.canSeeAllScores;
        if (Array.isArray(data.scoreBands) && data.scoreBands.length) {
          this.scoreBands = data.scoreBands;
        }

        const responses = data.responses || [];
        this.buildOthersScores(responses);

        this.template = {
          ...data.template,
          questions: (data.template.questions || []).map((q: any) => ({
            ...q,
            periods: {
              MONTH_1: { period: 'MONTH_1', score: this.findResponseScore(responses, q.id, 'MONTH_1') },
              MONTH_3: { period: 'MONTH_3', score: this.findResponseScore(responses, q.id, 'MONTH_3') },
              MONTH_6: { period: 'MONTH_6', score: this.findResponseScore(responses, q.id, 'MONTH_6') },
              YEAR_1: { period: 'YEAR_1', score: this.findResponseScore(responses, q.id, 'YEAR_1') },
              YEAR_2: { period: 'YEAR_2', score: this.findResponseScore(responses, q.id, 'YEAR_2') },
            }
          }))
        };

        // Preloaded before the cycle shape resolves, so the form renders with
        // saved scores immediately.
        this.summary = this.mapSummaries(data.summaries || []);
        if (data.finalReview) this.finalReview = data.finalReview;

        const doj = data.employee?.dateOfJoining ? new Date(data.employee.dateOfJoining) : null;
        if (doj) this.joiningDate = doj.toLocaleDateString();

        // Fetch pauses first so paused days are subtracted BEFORE the DOJ
        // fallback picks a period — otherwise a maternity-paused employee jumps
        // to YEAR_1 too early. Resolves on both paths, and with no DOJ.
        this.appraisalService.listEmployeePauses(this.employeeId).subscribe({
          next: (pauses) => this.applyPausesAndInit(pauses || [], doj),
          error: () => this.applyPausesAndInit([], doj),
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.error || 'Failed to load the appraisal form.',
          life: 6000,
        });
      }
    });


  }

  /** Resolve pause state + editable period, then always build the pads. */
  private applyPausesAndInit(pauses: any[], doj: Date | null) {
    this.pauseDays = doj ? this.computePausedDaysInCycle(pauses, doj, this.cycle) : 0;
    this.activePause = pauses.find(p => !p.endDate) || null;
    this.currentPeriod = this.resolveCurrentPeriod(doj);
    this.loadCycleShape();
  }

  /**
   * Ask the backend which track this row's cycle belongs to, so the form shows
   * the right columns and knows when each milestone opens. A cycle with no
   * matching plan (created before cycles were derived) keeps the old
   * all-four-columns behaviour.
   */
  private loadCycleShape() {
    if (!this.employeeId) return;
    this.formService.getEmployeeCycles(this.employeeId).subscribe({
      next: (res) => {
        const plan = (res.plans || []).find(p => p.cycle === this.cycle);

        if (!plan) {
          // Cycle matches no derived plan — a legacy label, or orphaned by a
          // department changing its basis. Fall back to joining-date milestones
          // so the period still locks until it opens; keep all four columns.
          const now = Date.now();
          for (const [period, date] of Object.entries(res.fallbackMilestones || {})) {
            this.milestoneDates[period] = date;
            this.periodReached[period] = new Date(date).getTime() <= now;
          }
          return;
        }

        this.track = plan.track;
        for (const p of plan.periods) {
          this.milestoneDates[p.period] = p.milestoneDate;
          this.periodReached[p.period] = p.reached;
          // Cycle-specific label wins: "2nd Year" for a second-year review even
          // though it is stored as YEAR_1.
          if (p.label) this.periodLabels[p.period] = p.label;
        }
        this.visiblePeriods = plan.track === 'RECURRING'
          ? [this.currentPeriod]
          : plan.periods.map(p => p.period);
      },
      error: () => { /* leave the defaults — the form still works */ },
    });
  }

  /** Which column the reviewer may edit. HR picks a period when assigning the
   *  row, so that wins — otherwise an employee whose DOJ math says YEAR_1 could
   *  never complete the MONTH_3 row they were actually assigned. DOJ maths is
   *  the fallback for legacy rows that carry no period. */
  private resolveCurrentPeriod(doj: Date | null): 'MONTH_1' | 'MONTH_3' | 'MONTH_6' | 'YEAR_1' {
    const assigned = this.summaryData?.period;
    if (assigned && this.summaryPeriods.includes(assigned)) return assigned;
    if (doj) return this.setCurrentPeriod(doj, this.cycle) as any;
    return 'MONTH_1';
  }



  


  

  

  /** Only YOUR column preloads into the editable inputs. */
  findResponseScore(responses: any[], questionId: number, period: string) {
    const mine = responses.find(x =>
      x.questionId === questionId &&
      x.period === period &&
      (x.reviewerRole === this.reviewerRole || (!this.reviewerRole && x.reviewerRole === 'REVIEWER'))
    );
    return mine ? mine.score : null;
  }

  /** Everyone else's scores, for the read-only strip beside your input. */
  private buildOthersScores(responses: any[]) {
    this.othersScores = {};
    for (const r of responses) {
      if (r.score == null) continue;
      if (r.reviewerRole === this.reviewerRole) continue;
      const key = `${r.questionId}|${r.period}`;
      (this.othersScores[key] ||= []).push({ role: r.reviewerRole, score: r.score });
    }
  }

  mapSummaries(summaries: any[]) {
    const obj: any = { MONTH_1: {}, MONTH_3: {}, MONTH_6: {}, YEAR_1: {} };
    for (let s of summaries) {
      obj[s.period] = {
        marksScored: s.marksScored,
        overallPerf: s.overallPerf,
        employeeSig: s.employeeSig,
        supervisorSig: s.supervisorSig,
        hodSig: s.hodSig
      };
    }
    return obj;
  }


  onSubmit() {
    // 1) Flatten responses
    const flattenedResponses: any[] = [];
    this.template.questions.forEach((q: any) => {
      Object.values(q.periods).forEach((p: any) => {
        if (p.score !== null && p.score !== undefined) {
          flattenedResponses.push({
            questionId: q.id,
            period: p.period,
            score: p.score,
            reviewerId: null,
            comments: null
          });
        }
      });
    });

    // 2) Flatten summaries
    const flattenedSummaries: any[] = [];
    this.summaryPeriods.forEach(period => {
      const s = this.summary[period];
      if (s && (s.marksScored || s.overallPerf)) {
        flattenedSummaries.push({
          period,
          marksScored: s.marksScored,
          overallPerf: s.overallPerf,
          // The UI no longer captures signatures, but these are still sent so a
          // row signed before the change keeps its images when scores are
          // edited. They round-trip whatever the server returned.
          employeeSig: s.employeeSig,
          supervisorSig: s.supervisorSig,
          hodSig: s.hodSig
        });
      }
    });

    // 3) Build final payload. Send finalReview only when it actually carries
    // something — this object is pre-initialised with empty strings, and sending
    // it unconditionally made the backend write a blank review row every time
    // and suppressed the "HOD submitted, please review" notification to HR.
    // Only the cycle's last period carries it. Earlier periods load the record
    // for display, so without this check they would re-save it unchanged.
    const hasFinalReview = this.isFinalPeriod
      && ['appreciations', 'talents', 'overallComments', 'employeeSig', 'supervisorSig', 'hrSig']
        .some(k => String((this.finalReview as any)?.[k] ?? '').trim() !== '');

    const payload = {
      employeeId: this.employeeId,
      departmentId: this.departmentId,
      cycle: this.cycle,
      templateId: this.templateId ?? null,
      responses: flattenedResponses,
      summaries: flattenedSummaries,
      finalReview: hasFinalReview ? this.finalReview : null
    };
    this.isLoading = true;
    console.log("Submitting payload:", payload);

    // 4) Call backend
    this.formService.submitFullForm(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Form submitted successfully.' });
        console.log("Form submitted successfully", res);
      },
      error: (err) => {
        this.isLoading = false;
        // 423 = HR has signed this period off. Offer the way back in rather
        // than a dead end.
        if (err?.status === 423 && err?.error?.summaryId) {
          this.lockedSummaryId = err.error.summaryId;
          this.editRequestReason = '';
          this.editRequestVisible = true;
          return;
        }
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.error || 'Error submitting form.',
        });
      }
    });
  }
  /** Highest total this template can award, weight-aware. Questions with no
   *  weight count as 1 so unweighted templates behave exactly as before. */
  get maxMarks(): number {
    if (!this.template?.questions?.length) return 0;
    return this.template.questions.reduce(
      (sum: number, q: any) => sum + this.MAX_SCORE_PER_QUESTION * (q.weight || 1),
      0
    );
  }

  /** Reviewer picked a band by hand — stop auto-calc from overwriting it. */
  onOverallPerfPicked() {
    this.manualPerf[this.currentPeriod] = true;
  }

  updateMarksScored() {
    if (!this.template || !this.template.questions) return;

    let total = 0;
    this.template.questions.forEach((q: any) => {
      const score = q.periods[this.currentPeriod]?.score;
      if (score) total += score * (q.weight || 1);
    });

    this.summary[this.currentPeriod].marksScored = total;

    if (this.manualPerf[this.currentPeriod]) return;

    // Band on percentage of THIS template's maximum, using the template's own
    // cut-offs. Comparing a raw total against fixed marks only ever worked for a
    // template with exactly the number of questions those marks were written
    // for — a 15-question form caps at 75 and could never leave "Not Acceptable".
    const max = this.maxMarks;
    if (!max) return;
    const pct = (total / max) * 100;

    const sorted = [...this.scoreBands].sort((a, b) => b.minPercent - a.minPercent);
    const hit = sorted.find(b => pct >= b.minPercent);
    this.summary[this.currentPeriod].overallPerf = hit?.label ?? sorted[sorted.length - 1]?.label ?? null;
  }

  /** Download the printed sheet. `tenure` spans every cycle. */
  downloadSheet(scope: 'cycle' | 'tenure') {
    if (!this.employeeId) return;
    this.downloading = true;
    this.formService.downloadSheet(this.employeeId, scope, this.cycle).subscribe({
      next: (blob) => {
        this.downloading = false;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PerformanceIndicator_${this.employeeCode || this.employeeId}_${scope}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Download failed',
          detail: 'Could not generate the performance sheet.',
        });
      },
    });
  }

  

  
  openIncidentPopup() {
    if (!this.employeeId) return;

    this.loadingIncidents = true;
    this.incidentDialogVisible = true;

    this.incidentService.getIncidentsByEmployee(this.employeeId).subscribe({
      next: (data) => {
        this.incidents = data;
        this.loadingIncidents = false;
      },
      error: () => {
        this.loadingIncidents = false;
        this.incidents = [];
      }
    });
  }

  goBack() {
    this.closeForm.emit();
  }

}
