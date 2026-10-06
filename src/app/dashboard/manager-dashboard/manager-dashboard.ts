import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { Chart, registerables } from 'chart.js';
import { ManagerService } from '../../services/manager/manager.service';
import { PermissionService } from '../../services/auth/permission.service';
import { HasPermDirective } from '../../shared/has-perm.directive';

Chart.register(...registerables);

/** The request queues, in the order section 2 shows them. */
type ApprovalTab =
  | 'leave' | 'permission' | 'ot' | 'compOff'
  | 'requisition' | 'weeklyReports' | 'roster' | 'resignation';

type PeriodKey = 'current' | 'next' | 'month';

/**
 * Manager / HOD dashboard — five fixed sections:
 *   1  Team composition (headcount, gender split, week outlook)
 *   2  Every request waiting on this manager
 *   3  Shift roster — this week and next
 *   4  Weekly performance still owed, and the top performers
 *   5  Today's attendance against each person's rostered shift
 *
 * Everything is scoped server-side to the caller's direct reports, so there is
 * no department picker and no employee id to pass: the token decides the team.
 */
@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonModule, TooltipModule, HasPermDirective],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.css',
})
export class ManagerDashboard implements OnInit, AfterViewInit, OnDestroy {
  private svc = inject(ManagerService);
  private perms = inject(PermissionService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  // ── State ─────────────────────────────────────────────────
  snapshot: any = null;
  composition: any = null;
  approvals: any = null;
  alerts: any = null;
  performance: any = null;
  rosterThis: any = null;
  rosterNext: any = null;
  attendanceToday: any = null;

  loading = true;
  /** Distinct from `loading`: the call succeeded and the manager has no reports. */
  noTeam = false;
  errorMsg = '';

  period: PeriodKey = 'current';
  approvalTab: ApprovalTab = 'leave';
  rosterWeek: 'this' | 'next' = 'this';
  attendanceFilter = 'All';

  readonly periods: { key: PeriodKey; label: string }[] = [
    { key: 'current', label: 'This week' },
    { key: 'next', label: 'Next week' },
    { key: 'month', label: 'This month' },
  ];

  /**
   * One colour per queue, in fixed order. With the bar chart gone these carry
   * the identity, so they are the validated eight-slot palette rather than
   * picked by eye — all eight clear the colour-blind separation gates on the
   * dark surface, and eight is the ceiling, so nothing here is a cycled hue.
   * The label is always beside the swatch, so colour is never the only cue.
   */
  readonly approvalTabs: { key: ApprovalTab; label: string; color: string }[] = [
    { key: 'leave', label: 'Leave', color: '#3987e5' },
    { key: 'permission', label: 'Permission', color: '#d95926' },
    { key: 'ot', label: 'Overtime', color: '#199e70' },
    { key: 'compOff', label: 'Comp-Off', color: '#c98500' },
    { key: 'requisition', label: 'Manpower Requisition', color: '#1b9aaa' },
    { key: 'weeklyReports', label: 'Weekly Reports', color: '#008300' },
    { key: 'roster', label: 'Roster', color: '#9085e9' },
    { key: 'resignation', label: 'Resignation', color: '#e66767' },
  ];

  /** The colour for whichever queue is open, for the table accent. */
  get activeQueueColor(): string {
    return this.approvalTabs.find((t) => t.key === this.approvalTab)?.color ?? '#3987e5';
  }

  readonly attendanceCategories = ['All', 'Present', 'Absent', 'Leave', 'Permission', 'Week Off', 'Holiday'];

  /**
   * Held as FIELDS, not written inline in the template.
   *
   * `*ngFor="let p of [0, 1]"` builds a new array on every change-detection
   * pass, so ngFor sees a new identity each time and destroys and rebuilds its
   * whole subtree — for the ticker that is every alert row, continuously.
   */
  readonly tickerPasses = [0, 1];
  readonly skeletonRows = [1, 2, 3, 4, 5];

  // ── Show more ─────────────────────────────────────────────
  // Same contract as the HR Analytics dashboard so the two behave alike.
  private readonly EXPAND_STEP = 5;
  expandCount: Record<string, number> = {};

  // Deliberately `any[]` rather than generic: the payloads are untyped, and a
  // generic infers T = unknown when handed one, which fails the template
  // typecheck on every property access.
  visible(key: string, arr: any[] | null | undefined): any[] {
    if (!arr) return [];
    return arr.slice(0, this.expandCount[key] ?? this.EXPAND_STEP);
  }
  canShowMore(key: string, arr: any[] | null | undefined): boolean {
    return !!arr && (this.expandCount[key] ?? this.EXPAND_STEP) < arr.length;
  }
  remaining(key: string, arr: any[] | null | undefined): number {
    if (!arr) return 0;
    return arr.length - (this.expandCount[key] ?? this.EXPAND_STEP);
  }
  showMore(key: string, arr: any[]) {
    const cur = this.expandCount[key] ?? this.EXPAND_STEP;
    this.expandCount[key] = Math.min(cur + this.EXPAND_STEP, arr.length);
  }
  showLess(key: string) {
    this.expandCount[key] = this.EXPAND_STEP;
  }
  isExpanded(key: string): boolean {
    return (this.expandCount[key] ?? this.EXPAND_STEP) > this.EXPAND_STEP;
  }

  /**
   * Plain-language explanation behind every ⓘ. Kept in one map rather than
   * scattered through the template so the wording can be reviewed as a set —
   * and so a chart can never ship without one.
   */
  readonly info: Record<string, string> = {
    gender: 'How your team splits by gender, from each employee record. Counts only active direct reports — people whose In-charge or Reporting Manager is you.',
    outlook: 'Day by day for the selected period. Past and current days show what actually happened (from attendance punches). Future days can only show what is already committed — approved leave, sanctioned permissions and rostered week-offs — so they are marked "planned" and have no present/absent figure. "Expected at work" is the remainder: people with no leave, no permission and no week-off on that day, i.e. who you should expect to turn up.',
    alerts: 'Unread notifications addressed to you, plus every circular currently in force. It scrolls on its own; hover to stop it and read. Circulars are institution-wide — announcements carry no team targeting in this system.',
    approvals: 'Every request type that is waiting on your decision. Leave, permission and weekly reports reach you only after the In-charge has cleared them; overtime, comp-off, roster and resignation come straight to you.',
    requisition: 'New-hire requests raised in your department and not yet approved by the HOD. Scoped by department because the requisition record has no manager field.',
    roster: 'The shift each person is assigned for every day of the week. "Unack." counts shifts the employee has not yet acknowledged — those are the ones to chase.',
    pendingPerf: 'Team members you have not yet given a weekly rating to for the current week, plus weekly reports they have submitted that are waiting on your approval.',
    topPerformers: 'Ranked on the AVERAGE score across the last 8 weeks, not the latest week alone — a single good week is noise. Scores are manager-given only; self-ratings are excluded.',
    perfTrend: 'Your team\'s average weekly score over time, on the 0–100 scale the rating form produces (each question is 1–10, averaged, then ×10).',
    attendanceToday: 'Today\'s punches measured against each person\'s rostered shift. "Late" is minutes after their own shift start, so an evening-shift arrival at 14:00 is not counted late. A dash means there is no roster or no punch to compare.',
    shiftCompare: 'Late in = checked in after the rostered shift start. Early out = checked out before the rostered shift end. Both are blank when the person has no shift assigned for today.',
  };

  private chartsReady = false;
  /** Live charts by canvas id — one registry, so redraws never leak instances. */
  private charts: Record<string, Chart | undefined> = {};

  ngOnInit() {
    this.loadAll();
  }

  ngAfterViewInit() {
    this.chartsReady = true;
    this.scheduleDraw();
  }

  ngOnDestroy() {
    if (this.drawTimer) clearTimeout(this.drawTimer);
    for (const c of Object.values(this.charts)) c?.destroy();
    this.charts = {};
  }

  /**
   * Redraw on the next tick. The canvases only exist once *ngIf has run, so the
   * draw has to trail change detection rather than ride the subscription.
   */
  private drawTimer: any = null;
  private scheduleDraw() {
    if (!this.chartsReady) return;
    // COALESCED. Five panels resolve at their own pace and each used to fire a
    // full redraw, so a single load tore down and rebuilt every chart five
    // times over — 25 constructions for 5 charts. One pending draw only.
    if (this.drawTimer) clearTimeout(this.drawTimer);
    // The timer itself is also outside the zone, so the redraw does not drag a
    // change-detection pass along with it.
    this.zone.runOutsideAngular(() => {
      this.drawTimer = setTimeout(() => {
        this.drawTimer = null;
        this.drawAll();
      }, 60);
    });
  }

  // ─────────────────────────────────────────────────────────
  // Load
  // ─────────────────────────────────────────────────────────
  private loadAll() {
    this.loading = true;
    this.errorMsg = '';

    this.svc.getTeamSnapshot().subscribe({
      next: (res) => {
        this.snapshot = res;
        this.noTeam = !!res?.empty;
        this.loading = false;
        if (!this.noTeam) this.loadSections();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.error || 'Could not load your team dashboard.';
        this.cdr.detectChanges();
      },
    });
  }

  private loadSections() {
    this.loadComposition();

    this.svc.getPendingApprovals().subscribe({
      next: (r) => {
        this.approvals = r;
        this.approvalTab = this.firstNonEmptyTab(r?.counts);
        this.cdr.detectChanges();
        this.scheduleDraw();
      },
      error: () => { this.approvals = { counts: {} }; },
    });

    this.svc.getAlerts().subscribe({
      next: (r) => {
        // CAP THE LOOP. The track renders the list twice, so 31 alerts became
        // 62 nodes and a ~5,000px tall element under a mask, transform-animated
        // for good — enough to peg the compositor. The newest dozen is what a
        // ticker is for; the rest live in the notifications screen.
        this.alerts = { ...r, items: (r?.items ?? []).slice(0, 12), truncated: (r?.items?.length ?? 0) > 12 };
        this.cdr.detectChanges();
      },
      error: () => { this.alerts = { counts: {}, items: [] }; },
    });

    this.svc.getPerformanceTrend(8).subscribe({
      next: (r) => { this.performance = r; this.cdr.detectChanges(); this.scheduleDraw(); },
      error: () => { this.performance = { weeks: [], members: [], unrated: [], topPerformers: [] }; },
    });

    this.svc.getRoster().subscribe({
      next: (r) => { this.rosterThis = r; this.cdr.detectChanges(); },
      error: () => { this.rosterThis = { days: [], rows: [] }; },
    });

    // Next week is a second call rather than a widened range: the two grids are
    // shown separately and a 14-day grid would not fit the card.
    const { from, to } = this.nextWeekRange();
    this.svc.getRoster(from, to).subscribe({
      next: (r) => { this.rosterNext = r; this.cdr.detectChanges(); },
      error: () => { this.rosterNext = { days: [], rows: [] }; },
    });

    this.svc.getAttendanceToday().subscribe({
      next: (r) => { this.attendanceToday = r; this.cdr.detectChanges(); this.scheduleDraw(); },
      error: () => { this.attendanceToday = { rows: [], summary: {} }; },
    });
  }

  private loadComposition() {
    this.svc.getTeamComposition(this.period).subscribe({
      next: (r) => {
        this.composition = r;
        this.buildSection1();
        this.cdr.detectChanges();
        this.scheduleDraw();
      },
      error: () => {
        this.composition = { gender: [], days: [], totals: {}, plannedTotals: {} };
        this.buildSection1();
      },
    });
  }

  setPeriod(p: PeriodKey) {
    if (this.period === p) return;
    this.period = p;
    this.loadComposition();
  }

  private nextWeekRange(): { from: string; to: string } {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // days since Monday
    const mon = new Date(now);
    mon.setDate(now.getDate() - day + 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { from: iso(mon), to: iso(sun) };
  }

  private firstNonEmptyTab(counts: any): ApprovalTab {
    return this.approvalTabs.find((t) => (counts?.[t.key] ?? 0) > 0)?.key ?? 'leave';
  }

  refresh() {
    this.expandCount = {};
    this.loadAll();
  }

  // ─────────────────────────────────────────────────────────
  // Derived views
  // ─────────────────────────────────────────────────────────
  get approvalRows(): any[] {
    return this.approvals?.[this.approvalTab] ?? [];
  }

  get roster(): any {
    return this.rosterWeek === 'next' ? this.rosterNext : this.rosterThis;
  }

  get attendanceRows(): any[] {
    const rows = this.attendanceToday?.rows ?? [];
    if (this.attendanceFilter === 'All') return rows;
    return rows.filter((r: any) => r.status === this.attendanceFilter);
  }

  /**
   * Section 1's derived values.
   *
   * These are FIELDS, not getters, and that distinction is the whole point: a
   * getter that builds a fresh object runs on every change-detection pass, and
   * `*ngFor` over a brand-new array identity tears down and rebuilds its DOM
   * every single time. Computed once when the data lands instead.
   */
  headline: { primary: number; primaryLabel: string; secondary: number; secondaryLabel: string } =
    { primary: 0, primaryLabel: 'Present', secondary: 0, secondaryLabel: 'Expected' };
  ledger: { label: string; value: number; color: string }[] = [];

  private buildSection1() {
    const c = this.composition;
    if (!c) {
      this.headline = { primary: 0, primaryLabel: 'Present', secondary: 0, secondaryLabel: 'Expected' };
      this.ledger = [];
      return;
    }
    const top = (k: string) => this.GRADIENTS[this.STATE_GRADIENT[k]]?.[0] ?? '#ffffff';

    if (c.hasActual) {
      const t = c.totals ?? {};
      // "Expected" is every day-slot that was not a week-off or holiday — the
      // cover the team was supposed to provide.
      const expected = (t.present ?? 0) + (t.absent ?? 0) + (t.leave ?? 0) + (t.permission ?? 0);
      this.headline = {
        primary: t.present ?? 0, primaryLabel: 'Present',
        secondary: expected, secondaryLabel: 'Expected',
      };
      this.ledger = [
        { label: 'Leave', value: t.leave ?? 0, color: top('leave') },
        { label: 'Permission', value: t.permission ?? 0, color: top('permission') },
        { label: 'Absent', value: t.absent ?? 0, color: top('absent') },
        { label: 'Week off', value: t.weekOff ?? 0, color: top('weekOff') },
      ];
      return;
    }

    const p = c.plannedTotals ?? {};
    this.headline = {
      primary: p.scheduled ?? 0, primaryLabel: 'Expected at work',
      secondary: (p.leave ?? 0) + (p.permission ?? 0) + (p.weekOff ?? 0), secondaryLabel: 'Off',
    };
    this.ledger = [
      { label: 'Leave approved', value: p.leave ?? 0, color: top('leave') },
      { label: 'Permission approved', value: p.permission ?? 0, color: top('permission') },
      { label: 'Week off', value: p.weekOff ?? 0, color: top('weekOff') },
    ];
  }

  // ── trackBy ────────────────────────────────────────────────
  // Without these Angular re-creates every row on each pass; the alert ticker
  // alone is 60+ nodes and was being rebuilt continuously.
  trackByIndex = (i: number) => i;
  trackById = (_: number, r: any) => r?.id ?? r?.employeeId ?? r?.key ?? _;

  /** Section 4's left half: who still needs a rating from you this week. */
  get pendingRatings(): any[] {
    return this.performance?.unrated ?? [];
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Present': return 'ok';
      case 'Leave':
      case 'Permission': return 'info';
      case 'Absent': return 'bad';
      default: return 'muted';
    }
  }

  /**
   * Pill class for a weekly score, from the same bands the chart uses — so a
   * pill and a bar can never disagree about what 79 means.
   */
  scoreClass(score: number | null): string {
    return this.bandFor(score)?.key ?? 'muted';
  }

  /** "1h 20m" from a minute count; blank when there is nothing to compare. */
  mins(v: number | null | undefined): string {
    if (v == null) return '—';
    if (v === 0) return 'On time';
    const h = Math.floor(v / 60);
    const m = v % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  }

  has(key: string): boolean {
    return this.perms.has(key);
  }

  approvalTarget(tab: string): string | null {
    switch (tab) {
      case 'leave': return this.has('admin.leave.view') ? '/admin/leave' : null;
      case 'ot': return this.has('admin.otApprovals.view') ? '/admin/ot-approvals' : null;
      case 'compOff': return this.has('admin.compOffApprovals.view') ? '/admin/comp-off-approvals' : null;
      case 'permission': return '/permission-request';
      case 'requisition': return this.has('recruitment.requisition.view') ? '/recruitment/recquisition' : null;
      case 'weeklyReports': return this.has('admin.weeklyTracker.view') ? '/admin/weekly-tracker' : null;
      case 'roster': return this.has('admin.shifts.view') ? '/admin/shifts' : null;
      case 'resignation': return this.has('admin.resignation.view') ? '/admin/resignation' : null;
      default: return null;
    }
  }

  goToApprovals() {
    const target = this.approvalTarget(this.approvalTab);
    if (target) this.router.navigate([target]);
  }

  // ─────────────────────────────────────────────────────────
  // Charts
  //
  // PALETTE. Not the ad-hoc hues the other dashboards use — those were measured
  // and fail: their green (#22c55e) and amber (#f59e0b) sit at ΔE 5.7 for a
  // protan viewer, i.e. effectively the same colour to roughly one man in
  // twelve, and four of the five fall outside the legible lightness band for a
  // dark surface. These steps were validated against this page's own surface.
  //
  //   CATEGORICAL — bars, lines, stacks. Assigned in FIXED order, never cycled.
  //   DONUT_SAFE  — only the first three clear the all-pairs test, which is the
  //   one a pie/donut actually needs: a reader compares any slice to any other,
  //   not just neighbours. Hence no donut here has more than three segments.
  //   ORDINAL     — one hue, light→dark, for categories with a real order.
  //   Attendance is ordered (present → permission → leave → absent), so it gets
  //   the ramp rather than four identity colours. That also avoids putting green
  //   next to red in a stack, which is the classic unreadable pair.
  // ─────────────────────────────────────────────────────────
  private readonly CATEGORICAL = ['#3987e5', '#d95926', '#199e70', '#c98500', '#1b9aaa'];

  /**
   * The supplied gradient set. Each entry is [top, bottom] of a 180° ramp.
   *
   * Measured before use: separation and contrast clear every gate with a wide
   * margin (worst adjacent pair ΔE 26.6 under protanopia, against a floor of
   * 8). The one thing they fail is the lightness band for a dark surface — the
   * green and orange are brighter than the 0.48–0.67 guidance. That is a
   * vibrance choice, not a legibility problem, and it is the look asked for.
   *
   * PINK IS RESERVED. It appears on the female slice and nowhere else, so
   * "Absent" takes the orange ramp rather than the pink/red one.
   */
  private readonly GRADIENTS: Record<string, [string, string]> = {
    blue:   ['#16ABFB', '#086BFC'],
    green:  ['#1AEBB1', '#00BD93'],
    orange: ['#FEBF26', '#FD8C0C'],
    pink:   ['#FB797B', '#FD2C6E'],
    purple: ['#B764FC', '#7B28FC'],
    cyan:   ['#02E5EC', '#00B0D7'],
    indigo: ['#5548FA', '#2C28EE'],
  };

  /** Which ramp each attendance state wears, in both modes. */
  private readonly STATE_GRADIENT: Record<string, string> = {
    present: 'blue',
    scheduled: 'blue',
    permission: 'green',
    leave: 'purple',
    absent: 'orange',
    weekOff: 'cyan',
  };

  private readonly GENDER_GRADIENT: Record<string, string> = {
    MALE: 'blue',
    FEMALE: 'pink',
    OTHER: 'orange',
  };

  /** CSS ramp for a swatch, so the legend matches the arc exactly. */
  genderGradient(key: string): string {
    const g = this.GRADIENTS[this.GENDER_GRADIENT[key] ?? 'cyan'];
    return `linear-gradient(180deg, ${g[0]} 0%, ${g[1]} 100%)`;
  }

  /**
   * A canvas gradient for a bar or arc. Returned as a callback because the
   * chart area does not exist until the first layout pass — resolving it eagerly
   * yields a zero-height gradient that paints as flat black.
   */
  private canvasGradient(name: string) {
    return (ctx: any) => this.paintGradient(ctx, this.GRADIENTS[name] ?? this.GRADIENTS['blue']);
  }

  /**
   * Per-slice gradients for a single dataset (the donut).
   *
   * Chart.js does NOT resolve functions held inside a backgroundColor ARRAY —
   * it only calls a scriptable option when the option itself is the function.
   * Handing it `[fn, fn]` paints nothing, so the slice picks its ramp by index
   * from one function instead.
   */
  private canvasGradientBySlice(names: string[]) {
    return (ctx: any) => {
      const stops = this.GRADIENTS[names[ctx.dataIndex] ?? 'blue'] ?? this.GRADIENTS['blue'];
      return this.paintGradient(ctx, stops);
    };
  }

  private paintGradient(ctx: any, stops: [string, string]) {
    const chart = ctx.chart;
    const area = chart?.chartArea;
    // The chart area does not exist until the first layout pass; returning the
    // top stop keeps that frame painted rather than blank.
    if (!area) return stops[0];
    const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, stops[0]);
    g.addColorStop(1, stops[1]);
    return g;
  }

  /**
   * Score bands, with the key rendered beside the chart.
   *
   * NOT green/amber/red: amber and red measure ΔE 13.0 apart for a reader with
   * ordinary colour vision — below the legibility floor — so the familiar
   * traffic-light fails the moment it matters. This trio clears every gate, and
   * the printed key is what carries the meaning rather than the hue alone.
   */
  readonly SCORE_BANDS = [
    { key: 'strong', label: 'Strong', range: '80–100', color: '#199e70', min: 80 },
    { key: 'solid', label: 'Solid', range: '60–79', color: '#9085e9', min: 60 },
    { key: 'attention', label: 'Needs attention', range: 'Under 60', color: '#e66767', min: 0 },
  ];

  /**
   * Gender keeps a fixed slot per value, so a headcount change never repaints
   * it. This is the ONLY place pink appears on the dashboard — it is reserved
   * for the female slice so the colour never reads as anything else. Every
   * other slot that used to be pink is now cyan.
   */
  private readonly GENDER_COLORS: Record<string, string> = {
    MALE: '#3987e5',
    FEMALE: '#d55181',
    OTHER: '#c98500',
  };

  bandFor(score: number | null | undefined) {
    if (score == null) return null;
    return this.SCORE_BANDS.find((b) => score >= b.min) ?? this.SCORE_BANDS[this.SCORE_BANDS.length - 1];
  }
  private readonly DONUT_SAFE = ['#3987e5', '#d95926', '#199e70'];
  private readonly ORDINAL = ['#86b6ef', '#5598e7', '#2a78d6', '#184f95'];
  private readonly ACCENT = '#2a78d6';
  private readonly EMPHASIS = '#d95926';
  private readonly SURFACE = '#0d0d0d';
  private readonly INK = '#c3c2b7';
  private readonly GRID = '#2c2c2a';
  private readonly MUTED = '#898781';

  private axis(opts: { stacked?: boolean; max?: number; title?: string; integer?: boolean } = {}) {
    return {
      stacked: opts.stacked ?? false,
      beginAtZero: true,
      ...(opts.max != null ? { max: opts.max } : {}),
      ticks: { color: this.MUTED, ...(opts.integer ? { precision: 0 } : {}) },
      grid: { color: this.GRID, drawTicks: false },
      border: { color: this.GRID },
      ...(opts.title ? { title: { display: true, text: opts.title, color: this.MUTED } } : {}),
    } as any;
  }

  private categoryAxis(opts: { stacked?: boolean } = {}) {
    return {
      stacked: opts.stacked ?? false,
      ticks: { color: this.INK },
      grid: { display: false },
      border: { color: this.GRID },
    } as any;
  }

  private legend(display = true) {
    return {
      display,
      labels: { color: this.INK, boxWidth: 12, boxHeight: 12, usePointStyle: true, pointStyle: 'rectRounded' },
    } as any;
  }

  /**
   * Direct labels on stacked segments and donut arcs.
   *
   * Required, not decorative: with four series the legend alone leaves identity
   * carried by colour, and the attendance ramp is four steps of ONE hue — the
   * middle two are deliberately close, which is what makes the ramp read as
   * ordered. The number in the segment is what makes them separable.
   */
  private readonly segmentLabels = {
    id: 'segmentLabels',

    /**
     * Ink that survives its own background. The ordinal ramp spans light
     * (#86b6ef) to dark (#184f95), so a fixed white label is unreadable on the
     * light end and a fixed dark one on the dark end.
     */
    inkFor(fill: unknown): string {
      const hex = typeof fill === 'string' && /^#[0-9a-f]{6}$/i.test(fill) ? fill : null;
      if (!hex) return '#ffffff';
      const srgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const lin = srgb.map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
      const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
      return L > 0.4 ? '#0b0b0b' : '#ffffff';
    },

    afterDatasetsDraw(chart: any) {
      const { ctx } = chart;
      const type = chart.config.type;
      const horizontal = chart.options?.indexAxis === 'y';
      const inkFor = (this as any).inkFor;
      ctx.save();
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      chart.data.datasets.forEach((ds: any, di: number) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach((el: any, i: number) => {
          const v = ds.data[i];
          if (v == null || v === 0) return;
          const label = String(v);
          const bg = Array.isArray(ds.backgroundColor) ? ds.backgroundColor[i] : ds.backgroundColor;
          ctx.fillStyle = inkFor(bg);

          if (type === 'doughnut' || type === 'pie') {
            // Skip slivers — an arc under ~14° cannot hold a legible number.
            const angle = Math.abs((el.endAngle ?? 0) - (el.startAngle ?? 0));
            if (angle < 0.25) return;
            const p = el.tooltipPosition();
            ctx.fillText(label, p.x, p.y);
            return;
          }

          const w = Math.abs((el.x ?? 0) - (el.base ?? el.x ?? 0));
          const h = Math.abs((el.base ?? el.y ?? 0) - (el.y ?? 0));
          const size = horizontal ? w : h;
          // A label clipped by its own segment is worse than no label; the
          // value stays in the tooltip and the table.
          if (size < 22) return;
          const cx = horizontal ? (el.x + el.base) / 2 : el.x;
          const cy = horizontal ? el.y : (el.y + el.base) / 2;
          ctx.fillText(label, cx, cy);
        });
      });
      ctx.restore();
    },
  };

  private drawAll() {
    this.drawGenderChart();
    this.drawOutlookChart();
    this.drawTopPerformersChart();
    this.drawShiftComparisonChart();
  }

  private make(id: string, config: any) {
    const ctx = document.getElementById(id) as HTMLCanvasElement | null;
    if (!ctx) return;
    // OUTSIDE THE ZONE, deliberately.
    //
    // Chart.js animates on requestAnimationFrame, and Zone.js patches rAF — so
    // inside the zone every single animation frame triggers a full Angular
    // change-detection pass. With a live ticker in the tree that meant
    // rebuilding its rows sixty times a second, and the resulting reflow woke
    // Chart's ResizeObserver, which started another render. That cycle feeds
    // itself and pegs the main thread: the page stops responding rather than
    // merely running slowly.
    this.zone.runOutsideAngular(() => {
      this.charts[id]?.destroy();
      this.charts[id] = new Chart(ctx, {
        ...config,
        options: { responsive: true, maintainAspectRatio: false, ...config.options },
      });
    });
  }

  // ── Section 1 ───────────────────────────────────────────
  private drawGenderChart() {
    const g = this.composition?.gender ?? [];
    if (!g.length) return;
    // Part-to-whole, at most three classes — a pie earns its place here.
    this.make('mgrGenderChart', {
      type: 'doughnut',
      data: {
        labels: g.map((x: any) => x.label),
        datasets: [{
          data: g.map((x: any) => x.value),
          backgroundColor: this.canvasGradientBySlice(g.map((x: any) => this.GENDER_GRADIENT[x.key] ?? 'cyan')),
          borderColor: this.SURFACE,
          borderWidth: 2,
        }],
      },
      options: { cutout: '58%', plugins: { legend: { ...this.legend(), position: 'bottom' } } },
      plugins: [this.segmentLabels],
    });
  }

  private drawOutlookChart() {
    const days = this.composition?.days ?? [];
    if (!days.length) return;
    const planned = days.every((d: any) => d.planned);

    // Past/current days stack actuals; future days stack what is committed.
    // The two never mix in one bar, because a day is entirely one or the other.
    const series = planned
      ? [
          // "Scheduled in" read as jargon. This is simply everyone with no
          // leave, permission or week-off booked on that day.
          { label: 'Expected at work', key: 'scheduled' },
          { label: 'Permission', key: 'permission' },
          { label: 'Leave', key: 'leave' },
          { label: 'Week off', key: 'weekOff' },
        ]
      : [
          { label: 'Present', key: 'present' },
          { label: 'Permission', key: 'permission' },
          { label: 'Leave', key: 'leave' },
          { label: 'Absent', key: 'absent' },
        ];

    this.make('mgrOutlookChart', {
      type: 'bar',
      data: {
        labels: days.map((d: any) => d.label),
        datasets: series.map((s) => ({
          label: s.label,
          data: days.map((d: any) => d[s.key] ?? 0),
          backgroundColor: this.canvasGradient(this.STATE_GRADIENT[s.key]),
          borderColor: this.SURFACE,
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false,
        })),
      },
      options: {
        scales: {
          x: this.categoryAxis({ stacked: true }),
          y: this.axis({ stacked: true, integer: true, title: 'People' }),
        },
        plugins: { legend: this.legend() },
      },
      plugins: [this.segmentLabels],
    });
  }

  // ── Section 4 ───────────────────────────────────────────
  private drawTopPerformersChart() {
    const top = this.performance?.topPerformers ?? [];
    if (!top.length) return;
    const max = this.performance?.scoreScaleMax ?? 100;
    // One hue for everyone with the leader picked out — the chart's job is the
    // ranking, not five identities.
    this.make('mgrTopChart', {
      type: 'bar',
      data: {
        labels: top.map((t: any) => t.name),
        datasets: [{
          label: 'Average score',
          data: top.map((t: any) => t.avgScore),
          // Coloured by SCORE BAND, not by position. Rank is already in the bar
          // length and the row order; the hue adds where the thresholds fall,
          // which the length alone cannot show. The key sits under the chart.
          backgroundColor: top.map((t: any) => this.bandFor(t.avgScore)?.color ?? this.ACCENT),
          borderRadius: 4,
          borderSkipped: false,
          barThickness: 18,
        }],
      },
      options: {
        indexAxis: 'y',
        scales: { x: this.axis({ max, title: 'Average / ' + max }), y: this.categoryAxis() },
        plugins: { legend: this.legend(false) },
      },
    });
  }

  // ── Section 5 ───────────────────────────────────────────
  private drawShiftComparisonChart() {
    const rows = (this.attendanceToday?.rows ?? []).filter((r: any) => r.lateByMin != null || r.earlyOutMin != null);
    if (!rows.length) return;

    // Minutes lost at each end of the day, per person. Stacked because the two
    // add up to that person's total shortfall against their own shift.
    this.make('mgrShiftChart', {
      type: 'bar',
      data: {
        labels: rows.map((r: any) => r.name),
        datasets: [
          {
            label: 'Late in (min)',
            data: rows.map((r: any) => r.lateByMin ?? 0),
            backgroundColor: this.CATEGORICAL[1],
            borderColor: this.SURFACE,
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false,
          },
          {
            label: 'Early out (min)',
            data: rows.map((r: any) => r.earlyOutMin ?? 0),
            backgroundColor: this.CATEGORICAL[0],
            borderColor: this.SURFACE,
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        scales: {
          x: this.axis({ stacked: true, integer: true, title: 'Minutes vs their own shift' }),
          y: this.categoryAxis({ stacked: true }),
        },
        plugins: { legend: this.legend() },
      },
      plugins: [this.segmentLabels],
    });
  }
}
