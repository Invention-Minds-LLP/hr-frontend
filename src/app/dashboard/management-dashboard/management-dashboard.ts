import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ManagementService } from '../../services/management/management.service';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-management-dashboard',
  standalone: true,
  imports: [CommonModule, SkeletonModule, TooltipModule],
  templateUrl: './management-dashboard.html',
  styleUrl: './management-dashboard.css',
})
export class ManagementDashboard implements OnInit, AfterViewInit {

  // ── Chart.js plugins: always-on value labels ───────────────
  // Applied to every chart via the `plugins: [...]` array.
  // Draws values on bars (top or inside if stacked), near line points, and
  // absolute counts on doughnut slices.
  private readonly valueLabelsPlugin = {
    id: 'valueLabels',
    afterDatasetsDraw(chart: any) {
      const ctx = chart.ctx;
      const type = chart.config.type;
      const indexAxis = chart.options?.indexAxis ?? 'x';
      const isHorizontal = indexAxis === 'y';
      const isStacked = !!(chart.options?.scales?.y?.stacked || chart.options?.scales?.x?.stacked);

      chart.data.datasets.forEach((_ds: any, i: number) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;

        meta.data.forEach((el: any, j: number) => {
          const val = chart.data.datasets[i].data[j];
          if (val == null || val === 0) return;

          ctx.save();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px sans-serif';

          if (type === 'doughnut' || type === 'pie') {
            const pos = el.tooltipPosition();
            ctx.fillStyle = '#0b0e13';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(val), pos.x, pos.y);
          } else if (type === 'line') {
            // Draw label above the point, but flip below if the point is too
            // close to the top of the chart area (to avoid overlapping the legend)
            const chartTop = chart.chartArea?.top ?? 4;
            ctx.textAlign = 'center';
            if (el.y - 12 < chartTop) {
              ctx.textBaseline = 'top';
              ctx.fillText(String(val), el.x, el.y + 8);
            } else {
              ctx.textBaseline = 'bottom';
              ctx.fillText(String(val), el.x, el.y - 6);
            }
          } else if (isHorizontal) {
            // Horizontal bar — draw to the right of the bar end (or inside if no room)
            if (isStacked) {
              const w = Math.abs(el.x - el.base);
              if (w < 20) return;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(val), el.x + (el.base - el.x) / 2, el.y);
            } else {
              const label = String(val);
              const textWidth = ctx.measureText(label).width;
              const chartRight = chart.chartArea?.right ?? (chart.width - 4);
              // If outside label would exceed chart area, draw inside the bar
              if (el.x + 6 + textWidth > chartRight - 4) {
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#0b0e13'; // dark text on colored bar
                ctx.fillText(label, el.x - 6, el.y);
              } else {
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, el.x + 6, el.y);
              }
            }
          } else {
            // Vertical bar — similar outside/inside fallback near top
            if (isStacked) {
              const h = Math.abs(el.base - el.y);
              if (h < 14) return;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(val), el.x, el.y + (el.base - el.y) / 2);
            } else {
              const chartTop = chart.chartArea?.top ?? 4;
              if (el.y - 4 < chartTop + 10) {
                // Not enough room above — draw inside the top of the bar
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#0b0e13';
                ctx.fillText(String(val), el.x, el.y + 4);
              } else {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(String(val), el.x, el.y - 4);
              }
            }
          }
          ctx.restore();
        });
      });
    },
  };

  // ── Loading flags ─────────────────────────────────────────
  loadingPulse       = true;
  loadingWorkforce   = true;
  loadingAttendance  = true;
  loadingPerformance = true;
  loadingPIPs        = true;
  loadingAttrition   = true;
  loadingFunnel      = true;
  loadingTraining    = true;
  loadingActions     = true;
  loadingDeptSnap    = true;
  loadingWeekly      = true;
  loadingPerfDist    = true;
  loadingDeptRisk    = true;
  loadingOtAnalysis  = true;
  loadingLateArrivals = true;
  loadingLeaveUtil   = true;
  loadingAbsenteeism = true;
  loadingWfInsights  = true;
  loadingAttention   = true;

  // ── Attention Needed (auto-flagged alerts) ───────────────
  attention: { items: any[]; counts: any; generatedAt?: string } | null = null;
  /** Whether the user collapsed the panel — persisted to localStorage so a
   *  click on a chip → drill into a section doesn't re-expand the alerts. */
  attentionCollapsed = false;

  // ── Section TOC for the sticky side nav ──────────────────
  // `id` matches the [id]="..." attribute on the corresponding section in
  // the template. Adding a new section? Add an entry here and tag the
  // section with the matching id.
  readonly tocSections: { id: string; label: string; icon: string }[] = [
    { id: 'sec-attention',   label: 'Attention',     icon: '🚨' },
    { id: 'sec-pulse',       label: 'Pulse',         icon: '💓' },
    { id: 'sec-workforce',   label: 'Workforce',     icon: '👥' },
    { id: 'sec-dept-snap',   label: 'Departments',   icon: '🏢' },
    { id: 'sec-dept-risk',   label: 'Risk',          icon: '⚠️' },
    { id: 'sec-attendance',  label: 'Attendance',    icon: '🕒' },
    { id: 'sec-pip',         label: 'Performance',   icon: '📊' },
    { id: 'sec-perf-dist',   label: 'Perf. Trend',   icon: '📈' },
    { id: 'sec-attrition',   label: 'Attrition',     icon: '📤' },
    { id: 'sec-training',    label: 'Training',      icon: '🎓' },
    { id: 'sec-actions',     label: 'Actions',       icon: '✅' },
    { id: 'sec-ot',          label: 'Overtime',      icon: '⏱️' },
    { id: 'sec-late',        label: 'Late Arrivals', icon: '🚦' },
    { id: 'sec-leave-util',  label: 'Leave Util.',   icon: '🗓️' },
    { id: 'sec-absent',      label: 'Absenteeism',   icon: '📉' },
    { id: 'sec-quals',       label: 'Qualifications',icon: '🎓' },
    { id: 'sec-el',          label: 'EL Insights',   icon: '💰' },
    { id: 'sec-train-ins',   label: 'Train. Insights', icon: '📚' },
    { id: 'sec-mobile',      label: 'Mobile',        icon: '📱' },
  ];
  activeTocId = 'sec-attention';

  // ── Data ─────────────────────────────────────────────────
  pulse: any           = null;
  workforce: any       = null;
  attendanceDays: any[]  = [];
  leaveCalendar: any[]   = [];
  leaveTopTypes: any[]   = [];
  performanceRadar: any  = null;
  activePIPs: any[]      = [];
  attritionTrend: any    = null;
  recruitmentFunnel: any = null;
  trainingByDept: any[]  = [];
  actionItems: any[]     = [];
  deptSnapshot: any[]    = [];
  weeklyTrend: any       = null;
  perfDist: any          = null;
  deptRisk: any[]        = [];
  otAnalysis: any        = null;
  lateArrivals: any      = null;
  leaveUtil: any         = null;
  absenteeism: any       = null;
  wfInsights: any        = null;
  mobileLogin: any       = null;
  loadingMobileLogin     = true;
  mobileLoginDays        = 14;
  qualifications: any    = null;
  loadingQualifications  = true;
  elInsights: any        = null;
  loadingElInsights      = true;
  trainingInsights: any  = null;
  loadingTrainingInsights = true;
  trainingCalendar: any  = null;
  loadingTrainingCalendar = true;
  trainingCalMonth: string = ''; // YYYY-MM
  selectedCalDay: any | null = null;

  // ── OT month navigation ───────────────────────────────────
  otMonth = new Date();
  otMonthStr = '';
  otMonthLabel = '';

  // ── Late arrivals & absenteeism period selectors ──────────
  lateDays = 30;
  absentDays = 30;
  readonly periodOptions = [
    { label: '7 Days',  days: 7  },
    { label: '30 Days', days: 30 },
    { label: '60 Days', days: 60 },
    { label: '90 Days', days: 90 },
  ];

  // ── Expandable list state ─────────────────────────────────
  // Each key maps to how many rows are currently visible (default 5)
  private readonly EXPAND_STEP = 5;
  expandCount: Record<string, number> = {};

  visibleRows(key: string, arr: any[]): any[] {
    const count = this.expandCount[key] ?? this.EXPAND_STEP;
    return arr.slice(0, count);
  }

  canShowMore(key: string, arr: any[]): boolean {
    return (this.expandCount[key] ?? this.EXPAND_STEP) < arr.length;
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

  // Leave type → colour palette (cycles for unknown types)
  private leaveTypeColors: Record<string, string> = {};
  private readonly LEAVE_COLORS = [
    '#f59e0b','#60a5fa','#34d399','#f472b6','#a78bfa',
    '#fb923c','#38bdf8','#4ade80','#e879f9','#facc15',
  ];
  private colorIndex = 0;

  // ── Attendance period selector ───────────────────────────
  attendanceDays_count = 7;
  readonly attendancePeriods = [
    { label: 'Last 7 Days',  days: 7 },
    { label: 'Last 14 Days', days: 14 },
    { label: 'Last 30 Days', days: 30 },
  ];

  // ── Leave calendar navigation ─────────────────────────────
  calendarMonth = new Date(); // the month being viewed
  calendarMonthStr = ''; // YYYY-MM
  calendarMonthLabel = '';
  calendarGrid: any[] = [];

  // ── KPI detail panel ─────────────────────────────────────
  detailType    = '';
  detailTitle   = '';
  detailColumns: { key: string; label: string }[] = [];
  detailRows: any[] = [];
  loadingDetail = false;

  // ── Chart detail modal ────────────────────────────────────
  modalVisible  = false;
  modalTitle    = '';
  modalColumns: { key: string; label: string }[] = [];
  modalRows: any[] = [];
  // Drill-down config for the modal: which row field to filter by, plus
  // the source employee list and sub-modal columns. When set, a "View"
  // column is shown per row.
  modalDrill: {
    rowKey: string;        // field on modal row to match (e.g., 'dept')
    sourceKey: string;     // field on source row to match (usually same)
    source: any[];         // employee-level rows
    cols: { key: string; label: string }[];  // columns for sub-modal
  } | null = null;

  // ── Sub-modal (drill-down from a row) ─────────────────────
  subModalVisible  = false;
  subModalTitle    = '';
  subModalColumns: { key: string; label: string }[] = [];
  subModalRows: any[] = [];

  // ── Chart instances ───────────────────────────────────────
  private workforceBarChart?: Chart;
  private workforceDonutChart?: Chart;
  private attendanceChart?: Chart;
  private attritionChart?: Chart;
  private funnelChart?: Chart;
  private weeklyChart?: Chart;
  private perfDistChart?: Chart;
  private otDeptChart?: Chart;
  private lateHeatChart?: Chart;
  private ageGenderChart?: Chart;
  private tenureChart?: Chart;
  private joiningTrendChart?: Chart;
  private mobileLoginChart?: Chart;
  private qualDegreeChart?: Chart;
  private elDistChart?: Chart;
  private trainingDeptChart?: Chart;
  private trainingScoreChart?: Chart;
  private chartsReady = false;

  // ── KPI card config ───────────────────────────────────────
  readonly kpiCards = [
    { key: 'headcount',           label: 'Total Headcount',      icon: '👥', detailType: '',
      info: 'Total active employees on payroll.' },
    { key: 'presentToday',        label: 'Present Today',        icon: '✅', detailType: 'present',
      info: 'Employees marked present today. Click to see who is in.' },
    { key: 'pendingApprovals',    label: 'Pending Approvals',    icon: '⏳', detailType: 'approvals',
      info: 'Leave + Permission requests awaiting approval. Click to view list.' },
    { key: 'openPositions',       label: 'Open Positions',       icon: '💼', detailType: 'positions',
      info: 'Active unfilled job openings. Click to see all roles.' },
    { key: 'activePIPs',          label: 'Active PIPs',          icon: '⚠️', detailType: '',
      info: 'Employees on Performance Improvement Plans (Warning / Active / Extended).' },
    { key: 'attritionMTD',        label: 'Attrition MTD',        icon: '📉', detailType: 'attrition',
      info: 'Resignations submitted this calendar month. Click to view.' },
    { key: 'otPending',           label: 'OT Pending',           icon: '🕐', detailType: 'ot',
      info: 'Overtime >60 min approved by manager, awaiting final HR approval. Click to view.' },
    { key: 'trainingCompletionPct', label: 'Training Completion', icon: '🎓', detailType: '',
      info: '% of all training assignments marked Completed across the institute.' },
  ];

  constructor(private svc: ManagementService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.attentionCollapsed = localStorage.getItem('mgmt-dash-attn-collapsed') === '1';
    this.loadAll();
    // Scroll-spy: highlight the TOC chip whose section is currently visible.
    this.installTocScrollSpy();
  }
  ngAfterViewInit(){
    this.chartsReady = true;
    // If API responded before view was ready, draw now
    setTimeout(() => {
      if (this.workforce)        this.drawWorkforceCharts();
      if (this.attritionTrend)   this.drawAttritionChart();
      if (this.recruitmentFunnel) this.drawFunnelChart();
      if (this.weeklyTrend)      this.drawWeeklyChart();
      if (this.perfDist)         this.drawPerfDistChart();
      if (this.wfInsights)       this.drawWfInsightCharts();
      if (this.otAnalysis)       this.drawOtDeptChart();
      if (this.lateArrivals)     this.drawLateHeatChart();
      if (this.mobileLogin)      this.drawMobileLoginChart();
      if (this.qualifications)   this.drawQualDegreeChart();
      if (this.elInsights)       this.drawElDistChart();
      if (this.trainingInsights) { this.drawTrainingDeptChart(); this.drawTrainingScoreChart(); }
    }, 0);
  }

  // ─────────────────────────────────────────────────────────
  // TOC / scroll-spy / utility helpers (added with the dashboard
  // upgrade — Attention panel, sticky nav, print export).
  // ─────────────────────────────────────────────────────────

  /** Smooth-scroll to a section. Called from TOC chips and from clicking
   *  an Attention-Needed alert that has a sectionId. */
  scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeTocId = id;
  }

  /** Track which section is most visible and update activeTocId so the
   *  side-nav chip highlights. Uses IntersectionObserver — cheap, no scroll
   *  listener or repeated layout reads. */
  private installTocScrollSpy() {
    // Defer to next tick so the sections actually exist in the DOM.
    setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          // Pick the entry with the highest intersectionRatio that's visible.
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (visible?.target?.id) {
            this.activeTocId = visible.target.id;
          }
        },
        { rootMargin: '-30% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
      );
      for (const s of this.tocSections) {
        const el = document.getElementById(s.id);
        if (el) observer.observe(el);
      }
    }, 500);
  }

  toggleAttentionPanel() {
    this.attentionCollapsed = !this.attentionCollapsed;
    localStorage.setItem('mgmt-dash-attn-collapsed', this.attentionCollapsed ? '1' : '0');
  }

  /** Click handler for an Attention chip — navigates to the related section
   *  if one was provided by the backend. */
  openAttentionItem(item: { sectionId?: string }) {
    if (item.sectionId) this.scrollToSection(item.sectionId);
  }

  /** Map a KPI key onto its delta in `pulse.comparisons`. Returns:
   *   { dir: 'up'|'down'|'flat', value: number, label: string, isGood: boolean }
   *  or null if no comparable prior data. The component template uses this
   *  to render the small ↑/↓ chip on each KPI card.
   *
   *  isGood lets us colour the chip green/red contextually — e.g. attrition
   *  going UP is bad, attendance going UP is good. Defined per-key. */
  getKpiDelta(key: string): { dir: 'up'|'down'|'flat'; value: number; label: string; isGood: boolean } | null {
    const c = this.pulse?.comparisons;
    if (!c) return null;

    // Map: KPI key → comparison entry + whether "going up" is desirable
    const map: Record<string, { entry: any; upIsGood: boolean }> = {
      headcount:             { entry: c.headcount,             upIsGood: true  },
      attendancePct:         { entry: c.attendancePct,         upIsGood: true  },
      attritionMTD:          { entry: c.attritionMTD,          upIsGood: false }, // up = more leaving = bad
      trainingCompletionPct: { entry: c.trainingCompletionPct, upIsGood: true  },
    };

    const m = map[key];
    if (!m || !m.entry) return null;

    // Some metrics use absolute-points delta (already-percentage values),
    // others use relative %. Pick whichever the backend supplied.
    const d = m.entry.deltaPoints ?? m.entry.deltaPct;
    if (d === null || d === undefined) return null;

    const dir: 'up'|'down'|'flat' = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
    const isGood = dir === 'flat' ? true : (m.upIsGood ? dir === 'up' : dir === 'down');

    // Display: "↑ 3.2%" or "↑ 4 pts" depending on which delta the backend used.
    const suffix = m.entry.deltaPoints !== undefined && m.entry.deltaPoints !== null ? ' pts' : '%';
    return {
      dir,
      value: Math.abs(d),
      label: `${dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'} ${Math.abs(d)}${suffix} vs last month`,
      isGood,
    };
  }

  /** Trigger the browser's print dialog — combined with the print stylesheet
   *  this generates a tidy PDF / paper export of the entire dashboard.
   *  We expand any collapsed UI before printing so nothing is missing. */
  exportDashboardPdf() {
    const wasCollapsed = this.attentionCollapsed;
    this.attentionCollapsed = false;
    // Give Angular one tick to repaint the expanded panel before print
    setTimeout(() => {
      window.print();
      // Restore the user's previous collapse state after the print dialog.
      this.attentionCollapsed = wasCollapsed;
    }, 50);
  }

  // ── Data loading ──────────────────────────────────────────
  private loadAll() {
    this.svc.getAttention().subscribe({
      next: (d) => { this.attention = d; this.loadingAttention = false; },
      error: () => { this.loadingAttention = false; },
    });

    this.svc.getPulse().subscribe({
      next: (d) => { this.pulse = d; this.loadingPulse = false; },
      error: () => { this.loadingPulse = false; }
    });

    this.svc.getWorkforce().subscribe({
      next: (d) => {
        this.workforce = d; this.loadingWorkforce = false;
        if (this.chartsReady) { this.cdr.detectChanges(); this.drawWorkforceCharts(); }
      },
      error: () => { this.loadingWorkforce = false; }
    });

    this.loadAttendance(7);
    this.loadLeaveCalendar();

    this.svc.getPerformanceRadar().subscribe({
      next: (d) => { this.performanceRadar = d; this.loadingPerformance = false; },
      error: () => { this.loadingPerformance = false; }
    });

    this.svc.getActivePIPs().subscribe({
      next: (d) => { this.activePIPs = d; this.loadingPIPs = false; },
      error: () => { this.loadingPIPs = false; }
    });

    this.svc.getAttritionTrend().subscribe({
      next: (d) => {
        this.attritionTrend = d; this.loadingAttrition = false;
        if (this.chartsReady) { this.cdr.detectChanges(); this.drawAttritionChart(); }
      },
      error: () => { this.loadingAttrition = false; }
    });

    this.svc.getRecruitmentFunnel().subscribe({
      next: (d) => {
        this.recruitmentFunnel = d; this.loadingFunnel = false;
        if (this.chartsReady) { this.cdr.detectChanges(); this.drawFunnelChart(); }
      },
      error: () => { this.loadingFunnel = false; }
    });

    this.svc.getTrainingByDept().subscribe({
      next: (d) => { this.trainingByDept = d; this.loadingTraining = false; },
      error: () => { this.loadingTraining = false; }
    });

    // ── PHASE 2 (mid-fold sections) ────────────────────────────
    // Slight delay (200ms) so the eager phase's connections finish
    // first. These appear in the second viewport-height of the page.
    setTimeout(() => {
      this.svc.getActionItems().subscribe({
        next: (d) => { this.actionItems = d; this.loadingActions = false; },
        error: () => { this.loadingActions = false; }
      });

      this.svc.getDeptSnapshot().subscribe({
        next: (d) => { this.deptSnapshot = d; this.loadingDeptSnap = false; },
        error: () => { this.loadingDeptSnap = false; }
      });

      this.svc.getDeptRisk().subscribe({
        next: (d) => { this.deptRisk = d; this.loadingDeptRisk = false; },
        error: () => { this.loadingDeptRisk = false; }
      });

      this.svc.getWeeklyTrend().subscribe({
        next: (d) => {
          this.weeklyTrend = d; this.loadingWeekly = false;
          if (this.chartsReady) { this.cdr.detectChanges(); setTimeout(() => this.drawWeeklyChart(), 0); }
        },
        error: () => { this.loadingWeekly = false; }
      });

      this.svc.getPerformanceDistribution().subscribe({
        next: (d) => {
          this.perfDist = d; this.loadingPerfDist = false;
          if (this.chartsReady) { this.cdr.detectChanges(); setTimeout(() => this.drawPerfDistChart(), 0); }
        },
        error: () => { this.loadingPerfDist = false; }
      });
    }, 200);

    // ── PHASE 3 (lazy / bottom-of-page sections) ──────────────
    // Deferred so initial paint isn't fighting 25 parallel requests.
    // 700ms gives the eager + mid-fold sections a clean shot at backend
    // CPU + network. User can already see and interact with the top of
    // the dashboard while these load in the background.
    setTimeout(() => {
      this.loadOtAnalysis();
      this.loadLateArrivals(this.lateDays);
      this.svc.getLeaveUtilization().subscribe({
        next: (d) => { this.leaveUtil = d; this.loadingLeaveUtil = false; },
        error: () => { this.loadingLeaveUtil = false; }
      });
      this.loadAbsenteeism(this.absentDays);

      this.svc.getWorkforceInsights().subscribe({
        next: (d) => {
          this.wfInsights = d; this.loadingWfInsights = false;
          if (this.chartsReady) { this.cdr.detectChanges(); setTimeout(() => this.drawWfInsightCharts(), 0); }
        },
        error: () => { this.loadingWfInsights = false; }
      });

      this.loadMobileLogin(this.mobileLoginDays);

      this.svc.getQualifications().subscribe({
        next: (d) => {
          this.qualifications = d; this.loadingQualifications = false;
          if (this.chartsReady) { this.cdr.detectChanges(); setTimeout(() => this.drawQualDegreeChart(), 0); }
        },
        error: () => { this.loadingQualifications = false; }
      });

      this.svc.getElInsights().subscribe({
        next: (d) => {
          this.elInsights = d;
          this.loadingElInsights = false;
          this.cdr.detectChanges();
          requestAnimationFrame(() => requestAnimationFrame(() => this.drawElDistChart()));
        },
        error: (err) => {
          console.error('[el-insights] failed:', err);
          this.loadingElInsights = false;
        },
      });

      this.svc.getTrainingInsights().subscribe({
        next: (d) => {
          this.trainingInsights = d;
          this.loadingTrainingInsights = false;
          this.cdr.detectChanges();
          requestAnimationFrame(() => requestAnimationFrame(() => {
            this.drawTrainingDeptChart();
            this.drawTrainingScoreChart();
          }));
        },
        error: (err) => {
          console.error('[training-insights] failed:', err);
          this.loadingTrainingInsights = false;
        },
      });

      // Training calendar — current month
      const now = new Date();
      this.trainingCalMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      this.loadTrainingCalendar(this.trainingCalMonth);
    }, 700);
  }

  loadTrainingCalendar(month: string) {
    this.loadingTrainingCalendar = true;
    this.svc.getTrainingCalendar(month).subscribe({
      next: (d) => {
        this.trainingCalendar = d;
        this.trainingCalMonth = month;
        this.loadingTrainingCalendar = false;
      },
      error: (err) => {
        console.error('[training-calendar] failed:', err);
        this.loadingTrainingCalendar = false;
      },
    });
  }

  shiftTrainingCalMonth(delta: number) {
    const [y, m] = this.trainingCalMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.loadTrainingCalendar(next);
  }

  selectTrainingCalDay(day: any) {
    this.selectedCalDay = day && day.total > 0 ? day : null;
  }

  // Map day-of-week of 1st of month to grid offset (0=Sun..6=Sat)
  get trainingCalLeadingBlanks(): number[] {
    if (!this.trainingCalMonth) return [];
    const [y, m] = this.trainingCalMonth.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    return new Array(first.getDay()).fill(0);
  }

  loadMobileLogin(days: number) {
    this.loadingMobileLogin = true;
    this.svc.getMobileLoginActivity(days).subscribe({
      next: (d) => {
        this.mobileLogin = d; this.loadingMobileLogin = false;
        if (this.chartsReady) { this.cdr.detectChanges(); setTimeout(() => this.drawMobileLoginChart(), 0); }
      },
      error: () => { this.loadingMobileLogin = false; }
    });
  }

  selectMobileLoginPeriod(days: number) {
    this.mobileLoginDays = days;
    this.loadMobileLogin(days);
  }

  // ── OT Analysis navigation ────────────────────────────────
  loadOtAnalysis() {
    const y = this.otMonth.getFullYear();
    const m = String(this.otMonth.getMonth() + 1).padStart(2, '0');
    this.otMonthStr = `${y}-${m}`;
    this.loadingOtAnalysis = true;
    this.svc.getOtAnalysis(this.otMonthStr).subscribe({
      next: (d) => {
        this.otAnalysis = d;
        this.otMonthLabel = d.monthLabel;
        this.loadingOtAnalysis = false;
        if (this.chartsReady) { this.cdr.detectChanges(); setTimeout(() => this.drawOtDeptChart(), 0); }
      },
      error: () => { this.loadingOtAnalysis = false; }
    });
  }

  prevOtMonth() {
    this.otMonth = new Date(this.otMonth.getFullYear(), this.otMonth.getMonth() - 1, 1);
    this.loadOtAnalysis();
  }

  nextOtMonth() {
    const now = new Date();
    const next = new Date(this.otMonth.getFullYear(), this.otMonth.getMonth() + 1, 1);
    if (next > now) return;
    this.otMonth = next;
    this.loadOtAnalysis();
  }

  isCurrentOtMonth(): boolean {
    const now = new Date();
    return this.otMonth.getFullYear() === now.getFullYear() && this.otMonth.getMonth() === now.getMonth();
  }

  // ── Late arrivals period ──────────────────────────────────
  selectLatePeriod(days: number) {
    if (this.lateDays === days) return;
    this.lateDays = days;
    this.loadLateArrivals(days);
  }

  loadLateArrivals(days: number) {
    this.loadingLateArrivals = true;
    this.svc.getLateArrivals(days).subscribe({
      next: (d) => {
        this.lateArrivals = d;
        this.loadingLateArrivals = false;
        if (this.chartsReady) { this.cdr.detectChanges(); setTimeout(() => this.drawLateHeatChart(), 0); }
      },
      error: () => { this.loadingLateArrivals = false; }
    });
  }

  // ── Absenteeism period ────────────────────────────────────
  selectAbsentPeriod(days: number) {
    if (this.absentDays === days) return;
    this.absentDays = days;
    this.loadAbsenteeism(days);
  }

  loadAbsenteeism(days: number) {
    this.loadingAbsenteeism = true;
    this.svc.getAbsenteeism(days).subscribe({
      next: (d) => { this.absenteeism = d; this.loadingAbsenteeism = false; },
      error: () => { this.loadingAbsenteeism = false; }
    });
  }

  // ── OT rate helper ────────────────────────────────────────
  getOtBarWidth(hours: number): string {
    if (!this.otAnalysis?.deptTotals?.length) return '0%';
    const max = this.otAnalysis.deptTotals[0].hours || 1;
    return Math.round((hours / max) * 100) + '%';
  }

  // ── Late arrival helpers ──────────────────────────────────
  getLateBarWidth(count: number): string {
    if (!this.lateArrivals?.deptHeatmap?.length) return '0%';
    const max = this.lateArrivals.deptHeatmap[0].count || 1;
    return Math.round((count / max) * 100) + '%';
  }

  getLateHeatClass(count: number): string {
    if (count <= 3)  return 'heat-low';
    if (count <= 8)  return 'heat-mid';
    return 'heat-high';
  }

  // ── Leave util helpers ────────────────────────────────────
  getUtilClass(pct: number): string {
    if (pct >= 80) return 'util-high';
    if (pct >= 50) return 'util-mid';
    return 'util-low';
  }

  // ── Absenteeism helpers ───────────────────────────────────
  getAbsentRateClass(rate: number): string {
    if (rate >= 15) return 'badge-danger';
    if (rate >= 8)  return 'badge-warn';
    return 'badge-good';
  }

  // ── KPI helpers ───────────────────────────────────────────
  getKpiValue(key: string): any {
    if (!this.pulse) return '—';
    return this.pulse[key] ?? '—';
  }

  getKpiColorClass(card: any): string {
    if (!this.pulse) return '';
    const v = this.pulse[card.key];
    switch (card.key) {
      case 'presentToday':          return (this.pulse.attendancePct ?? 0) >= 85 ? 'good' : (this.pulse.attendancePct ?? 0) >= 70 ? 'warn' : 'danger';
      case 'pendingApprovals':      return v > 0 ? 'warn' : 'good';
      case 'openPositions':         return v > 0 ? 'info' : 'good';
      case 'activePIPs':            return v > 0 ? 'danger' : 'good';
      case 'attritionMTD':          return v > 3 ? 'danger' : v > 0 ? 'warn' : 'good';
      case 'otPending':             return v > 0 ? 'warn' : 'good';
      case 'trainingCompletionPct': return v >= 75 ? 'good' : v >= 50 ? 'warn' : 'danger';
      default: return 'neutral';
    }
  }

  // Build a detailed tooltip for the risk total so users understand the math.
  // Each factor is a RATE × weight × 33, not the raw count. This clarifies
  // why e.g. 5 leaves on 3 HC = 55 (5/3 × 1 × 33 ≈ 55).
  buildRiskTotalTooltip(d: any): string {
    const b = d.breakdown ?? {};
    const hc = Math.max(d.headcount ?? 1, 1);
    const resignRaw = d.resignations ?? 0;
    const leaveRaw  = d.leaveCount   ?? 0;
    const pipRaw    = d.pips         ?? 0;
    const avgScore  = d.avgScore;

    const avgScoreDesc = avgScore != null
      ? `max(0, (60 − ${avgScore})/60) × 2 × 33`
      : `(no appraisal)`;

    return (
      `Risk formula: each factor = (count/HC) × weight × 33\n` +
      `HC (head-count) = ${hc}\n\n` +
      `• R  →  ${resignRaw}/${hc} × 3 × 33  =  ${b.resign ?? 0}\n` +
      `• L  →  ${leaveRaw}/${hc} × 1 × 33  =  ${b.leave ?? 0}\n` +
      `• A  →  ${avgScoreDesc}  =  ${b.score ?? 0}\n` +
      `• P  →  ${pipRaw}/${hc} × 2 × 33  =  ${b.pip ?? 0}\n\n` +
      `Total = ${b.resign ?? 0} + ${b.leave ?? 0} + ${b.score ?? 0} + ${b.pip ?? 0} = ${d.riskScore ?? 0}`
    );
  }

  getKpiSub(key: string): string {
    if (!this.pulse) return '';
    switch (key) {
      case 'presentToday':       return `${this.pulse.attendancePct ?? 0}% attendance rate`;
      case 'pendingApprovals':   {
        const l = this.pulse.pendingLeaves ?? 0;
        const p = this.pulse.pendingPermissions ?? 0;
        return `Leave: ${l} · Permission: ${p}`;
      }
      case 'otPending':          return '>60 min awaiting HR';
      case 'attritionMTD':       return 'Resignations this month';
      default: return '';
    }
  }

  // ── KPI detail panel ─────────────────────────────────────
  openDetail(card: any) {
    if (!card.detailType) return;
    if (this.detailType === card.detailType) { this.detailType = ''; return; }
    this.detailType = card.detailType;
    this.detailRows = [];
    this.loadingDetail = true;

    const colMap: Record<string, { title: string; cols: { key: string; label: string }[] }> = {
      present:   { title: 'Employees Present Today',
        cols: [{ key:'name',label:'Name' },{ key:'department',label:'Dept' },{ key:'designation',label:'Designation' },{ key:'checkIn',label:'Check-In' },{ key:'checkOut',label:'Check-Out' }] },
      approvals: { title: 'Pending Approval Requests',
        cols: [{ key:'name',label:'Name' },{ key:'department',label:'Dept' },{ key:'requestType',label:'Type' },{ key:'type',label:'Leave Type' },{ key:'since',label:'Waiting (days)' }] },
      attrition: { title: 'Resignations This Month',
        cols: [{ key:'name',label:'Name' },{ key:'department',label:'Dept' },{ key:'designation',label:'Designation' },{ key:'lastDate',label:'Last Working Date' },{ key:'status',label:'Status' }] },
      ot:        { title: 'OT Pending HR Approval (>60 min)',
        cols: [{ key:'name',label:'Name' },{ key:'department',label:'Dept' },{ key:'date',label:'Date' },{ key:'hours',label:'Duration' }] },
      positions: { title: 'Open Job Positions',
        cols: [{ key:'title',label:'Job Title' },{ key:'department',label:'Dept' },{ key:'headcount',label:'Headcount' },{ key:'location',label:'Location' },{ key:'openSince',label:'Open (days)' }] },
    };

    const cfg = colMap[card.detailType];
    this.detailTitle   = cfg.title;
    this.detailColumns = cfg.cols;
    this.svc.getKpiDetail(card.detailType).subscribe({
      next: (rows) => { this.detailRows = rows; this.loadingDetail = false; },
      error: () => { this.loadingDetail = false; },
    });
  }
  closeDetail() { this.detailType = ''; }

  // ── Chart detail modal ────────────────────────────────────
  openChartModal(chartId: string) {
    type ColDef = { key: string; label: string };
    let title = '';
    let cols: ColDef[] = [];
    let rows: any[] = [];

    switch (chartId) {
      case 'workforce-dept':
        title = 'All Active Employees by Department';
        cols  = [
          { key: 'dept',        label: 'Department' },
          { key: 'name',        label: 'Employee Name' },
          { key: 'designation', label: 'Designation' },
          { key: 'type',        label: 'Employment Type' },
          { key: 'status',      label: 'Status' },
        ];
        rows = this.workforce?.employeeList ?? [];
        break;

      case 'workforce-status':
        title = 'Employment Status Breakdown';
        cols  = [{ key: 'status', label: 'Status' }, { key: 'count', label: 'Employees' }];
        rows  = this.workforce?.byStatus ?? [];
        break;

      case 'attendance':
        title = `Attendance Trend (Last ${this.attendanceDays_count} Days)`;
        cols  = [
          { key: 'date',       label: 'Date' },
          { key: 'present',    label: 'Present' },
          { key: 'leave',      label: 'On Leave' },
          { key: 'permission', label: 'Permission' },
          { key: 'absent',     label: 'Absent' },
        ];
        rows = this.attendanceDays;
        break;

      case 'attrition':
        title = 'Attrition Trend (12 Months)';
        cols  = [
          { key: 'month',     label: 'Month' },
          { key: 'submitted', label: 'Resignations Submitted' },
          { key: 'exited',    label: 'Actually Exited' },
        ];
        rows = this.attritionTrend?.months ?? [];
        break;

      case 'funnel':
        title = 'Recruitment Funnel';
        cols  = [
          { key: 'stage',   label: 'Stage' },
          { key: 'count',   label: 'Candidates' },
          { key: 'dropPct', label: 'Drop-off %' },
        ];
        rows = this.recruitmentFunnel?.funnel ?? [];
        break;

      case 'weekly':
        title = 'Weekly Performance Trend (8 Weeks)';
        cols  = [
          { key: 'label',    label: 'Week' },
          { key: 'avgScore', label: 'Avg Score (/10)' },
          { key: 'count',    label: 'Submissions' },
        ];
        rows = this.weeklyTrend?.weeks ?? [];
        break;

      case 'perf-dist':
        title = 'Appraisal Score Distribution';
        const total = this.perfDist?.distribution?.reduce((s: number, d: any) => s + d.count, 0) || 1;
        cols  = [
          { key: 'label', label: 'Band' },
          { key: 'count', label: 'Employees' },
          { key: '_pct',  label: '% of Appraised' },
        ];
        rows = (this.perfDist?.distribution ?? []).map((d: any) => ({
          ...d, _pct: Math.round(d.count / total * 100) + '%'
        }));
        break;

      case 'perf-dept':
        title = 'Avg Appraisal Score by Department';
        cols  = [
          { key: 'dept',  label: 'Department' },
          { key: 'avg',   label: 'Avg Score (/100)' },
          { key: 'count', label: 'Employees Appraised' },
        ];
        rows = this.perfDist?.deptAvg ?? [];
        break;

      case 'training':
        title = 'Training Completion by Department';
        cols  = [
          { key: 'dept',      label: 'Department' },
          { key: 'completed', label: 'Completed' },
          { key: 'total',     label: 'Assigned' },
          { key: 'pct',       label: 'Completion %' },
        ];
        rows = this.trainingByDept;
        break;

      case 'ot-dept':
        title = `All OT Employees by Department — ${this.otMonthLabel}`;
        cols  = [
          { key: 'dept',        label: 'Department' },
          { key: 'name',        label: 'Employee Name' },
          { key: 'designation', label: 'Designation' },
          { key: 'hours',       label: 'OT Hours' },
          { key: 'minutes',     label: 'OT Minutes' },
        ];
        rows = this.otAnalysis?.allEmployees ?? [];
        break;

      case 'ot-emp':
        title = `Top OT Employees — ${this.otMonthLabel}`;
        cols  = [
          { key: 'name',        label: 'Employee' },
          { key: 'dept',        label: 'Department' },
          { key: 'designation', label: 'Designation' },
          { key: 'hours',       label: 'OT Hours' },
          { key: 'minutes',     label: 'OT Minutes' },
        ];
        rows = this.otAnalysis?.topEmployees ?? [];
        break;

      case 'late-dept':
        title = `All Late Employees by Department (Last ${this.lateDays} Days)`;
        cols  = [
          { key: 'dept',         label: 'Department' },
          { key: 'name',         label: 'Employee Name' },
          { key: 'count',        label: 'Late Days' },
          { key: 'totalMinutes', label: 'Total Delay (min)' },
          { key: 'avgMinutes',   label: 'Avg Delay (min)' },
        ];
        rows = this.lateArrivals?.allEmployees ?? [];
        break;

      case 'late-emp':
        title = `Chronic Late-Comers (Last ${this.lateDays} Days)`;
        cols  = [
          { key: 'name',         label: 'Employee' },
          { key: 'dept',         label: 'Department' },
          { key: 'count',        label: 'Late Count' },
          { key: 'totalMinutes', label: 'Total Delay (min)' },
          { key: 'avgMinutes',   label: 'Avg Delay (min)' },
        ];
        rows = this.lateArrivals?.topLate ?? [];
        break;

      case 'leave-util-dept':
        title = `All Employees — Leave Utilization by Dept (${this.leaveUtil?.year})`;
        cols  = [
          { key: 'dept',           label: 'Department' },
          { key: 'name',           label: 'Employee Name' },
          { key: 'allowed',        label: 'Allowed (days)' },
          { key: 'used',           label: 'Used (days)' },
          { key: 'remaining',      label: 'Remaining' },
          { key: 'utilizationPct', label: 'Utilization %' },
        ];
        rows = this.leaveUtil?.allEmployees ?? [];
        break;

      case 'leave-util-emp':
        title = `Top Leave Users (${this.leaveUtil?.year})`;
        cols  = [
          { key: 'name',           label: 'Employee' },
          { key: 'dept',           label: 'Department' },
          { key: 'allowed',        label: 'Allowed' },
          { key: 'used',           label: 'Used' },
          { key: 'remaining',      label: 'Remaining' },
          { key: 'utilizationPct', label: 'Utilization %' },
        ];
        rows = this.leaveUtil?.topUsers ?? [];
        break;

      case 'absent-dept':
        title = `All Absent Employees by Department (Last ${this.absentDays} Days)`;
        cols  = [
          { key: 'dept',       label: 'Department' },
          { key: 'name',       label: 'Employee Name' },
          { key: 'absentDays', label: 'Absent Days' },
          { key: 'absentRate', label: 'Absence Rate %' },
        ];
        rows = this.absenteeism?.allAbsentEmployees ?? [];
        break;

      case 'absent-emp':
        title = `Chronic Absentees (Last ${this.absentDays} Days)`;
        cols  = [
          { key: 'name',       label: 'Employee' },
          { key: 'dept',       label: 'Department' },
          { key: 'absentDays', label: 'Absent Days' },
          { key: 'absentRate', label: 'Absence Rate %' },
        ];
        rows = this.absenteeism?.chronicAbsentees ?? [];
        break;

      case 'age-gender':
        title = 'Age-Gender Split (≤ 45 vs > 45)';
        cols  = [{ key: 'label', label: 'Age Group' }, { key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }, { key: 'other', label: 'Other' }];
        rows  = this.wfInsights?.ageSplitChart ?? [];
        break;

      case 'tenure':
        title = 'Years of Service Breakdown';
        cols  = [{ key: 'label', label: 'Tenure Band' }, { key: 'count', label: 'Employees' }];
        rows  = this.wfInsights?.tenureBuckets ?? [];
        break;

      case 'joining-trend':
        title = 'Joinings vs Resignations by Year';
        cols  = [
          { key: 'year',         label: 'Year' },
          { key: 'joinings',     label: 'Joinings' },
          { key: 'resignations', label: 'Resignations' },
          { key: 'net',          label: 'Net (+in / −out)' },
        ];
        rows  = this.wfInsights?.joiningTrend ?? [];
        break;

      case 'dept-gender':
        title = 'Department-wise Gender Breakdown';
        cols  = [{ key: 'dept', label: 'Department' }, { key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }, { key: 'other', label: 'Other' }, { key: 'total', label: 'Total' }];
        rows  = this.wfInsights?.deptGender ?? [];
        break;

      case 'mobile-login':
        title = 'Daily Mobile vs Desktop Logins';
        cols  = [{ key: 'date', label: 'Date' }, { key: 'mobile', label: 'Mobile' }, { key: 'desktop', label: 'Desktop' }, { key: 'total', label: 'Total' }, { key: 'uniqueUsers', label: 'Unique Users' }];
        rows  = this.mobileLogin?.daily ?? [];
        break;

      case 'qual-degree':
        title = 'Qualification — Degree Distribution';
        cols  = [{ key: 'degree', label: 'Degree / Qualification' }, { key: 'count', label: 'Count' }];
        rows  = this.qualifications?.degreeDistribution ?? [];
        break;

      case 'qual-inst':
        title = 'Qualification — Top Institutions';
        cols  = [{ key: 'institution', label: 'Institution' }, { key: 'count', label: 'Employees' }];
        rows  = this.qualifications?.topInstitutions ?? [];
        break;

      case 'qual-dept':
        title = 'Qualifications by Department';
        cols  = [{ key: 'dept', label: 'Department' }, { key: 'qualifiedCount', label: 'Qualified Staff' }, { key: 'topDegree', label: 'Most Common Degree' }, { key: 'totalQuals', label: 'Total Records' }];
        rows  = this.qualifications?.deptBreakdown ?? [];
        break;

      case 'el-dist':
        title = 'EL Balance Distribution';
        cols  = [
          { key: 'label', label: 'Balance Range' },
          { key: 'count', label: 'Employees' },
        ];
        rows  = this.elInsights?.distribution ?? [];
        break;

      case 'el-top':
        title = 'Highest EL Balances (Top 10)';
        cols  = [
          { key: 'employeeName', label: 'Employee' },
          { key: 'employeeCode', label: 'Code' },
          { key: 'dept',         label: 'Department' },
          { key: 'balance',      label: 'EL Balance' },
          { key: 'daysOver55',   label: 'Days Over 55' },
          { key: 'lastLeaveDate', label: 'Last EL Taken' },
        ];
        rows  = this.elInsights?.topOffenders ?? [];
        break;

      case 'el-dept':
        title = 'EL Average by Department';
        cols  = [
          { key: 'dept',          label: 'Department' },
          { key: 'headcount',     label: 'Headcount' },
          { key: 'avgBalance',    label: 'Avg Balance' },
          { key: 'overThreshold', label: 'Employees over 55' },
        ];
        rows  = this.elInsights?.deptAvg ?? [];
        break;

      case 'training-dept':
        title = 'Training Participation by Department';
        cols  = [
          { key: 'dept',              label: 'Department' },
          { key: 'assignedEmployees', label: 'Assigned' },
          { key: 'completed',         label: 'Completed' },
          { key: 'pending',           label: 'Pending' },
          { key: 'completionPct',     label: 'Completion %' },
          { key: 'trainingsCovered',  label: 'Trainings' },
        ];
        rows = this.trainingInsights?.deptParticipation ?? [];
        break;

      case 'training-score':
        title = 'Test Score Distribution';
        cols  = [
          { key: 'label', label: 'Score Band' },
          { key: 'count', label: 'Attempts' },
        ];
        rows = this.trainingInsights?.scoreDistribution ?? [];
        break;

      case 'training-top':
        title = 'Top Performers (Avg Test Score)';
        cols  = [
          { key: 'name',          label: 'Employee' },
          { key: 'employeeCode',  label: 'Code' },
          { key: 'dept',          label: 'Department' },
          { key: 'designation',   label: 'Designation' },
          { key: 'avgScore',      label: 'Avg Score' },
          { key: 'attemptsCount', label: 'Attempts' },
        ];
        rows = this.trainingInsights?.topPerformers ?? [];
        break;

      case 'training-low':
        title = 'Needs Attention — Low Scoring (< 60)';
        cols  = [
          { key: 'name',          label: 'Employee' },
          { key: 'employeeCode',  label: 'Code' },
          { key: 'dept',          label: 'Department' },
          { key: 'designation',   label: 'Designation' },
          { key: 'avgScore',      label: 'Avg Score' },
          { key: 'attemptsCount', label: 'Attempts' },
        ];
        rows = this.trainingInsights?.lowPerformers ?? [];
        break;

      case 'training-rated':
        title = 'Top Rated Trainings';
        cols  = [
          { key: 'title',         label: 'Training' },
          { key: 'startDate',     label: 'Start' },
          { key: 'avgRating',     label: 'Overall' },
          { key: 'avgTrainer',    label: 'Trainer' },
          { key: 'avgContent',    label: 'Content' },
          { key: 'avgRelevance',  label: 'Relevance' },
          { key: 'feedbackCount', label: 'Feedbacks' },
        ];
        rows = this.trainingInsights?.topRatedTrainings ?? [];
        break;

      case 'training-low-rated':
        title = 'Lowest Rated Trainings';
        cols  = [
          { key: 'title',         label: 'Training' },
          { key: 'startDate',     label: 'Start' },
          { key: 'avgRating',     label: 'Overall' },
          { key: 'avgTrainer',    label: 'Trainer' },
          { key: 'avgContent',    label: 'Content' },
          { key: 'avgRelevance',  label: 'Relevance' },
          { key: 'feedbackCount', label: 'Feedbacks' },
        ];
        rows = this.trainingInsights?.lowRatedTrainings ?? [];
        break;

      case 'el-all':
        title = 'All Employees — EL Balance';
        cols  = [
          { key: 'employeeName', label: 'Employee' },
          { key: 'employeeCode', label: 'Code' },
          { key: 'dept',         label: 'Department' },
          { key: 'designation',  label: 'Designation' },
          { key: 'balance',      label: 'Balance' },
          { key: 'bucket',       label: 'Bucket' },
          { key: 'lastLeaveDate', label: 'Last EL Taken' },
        ];
        rows  = this.elInsights?.employeeList ?? [];
        break;

      default:
        return;
    }

    this.modalTitle   = title;
    this.modalColumns = cols;
    this.modalRows    = rows;
    this.modalDrill   = this.buildModalDrill(chartId);
    this.modalVisible = true;
  }

  // Return a drill-down config when the modal shows aggregate rows and
  // we have an employee-level list available for a secondary popup.
  private buildModalDrill(chartId: string): ManagementDashboard['modalDrill'] {
    const empCols = [
      { key: 'name',        label: 'Employee Name' },
      { key: 'designation', label: 'Designation' },
      { key: 'dept',        label: 'Department' },
    ];
    switch (chartId) {
      case 'workforce-status':
        return {
          rowKey: 'status', sourceKey: 'status',
          source: this.workforce?.employeeList ?? [],
          cols: [
            { key: 'name', label: 'Name' }, { key: 'dept', label: 'Department' },
            { key: 'designation', label: 'Designation' }, { key: 'status', label: 'Status' },
          ],
        };
      case 'perf-dept':
        return {
          rowKey: 'dept', sourceKey: 'dept',
          source: this.perfDist?.employeeList ?? this.workforce?.employeeList ?? [],
          cols: empCols,
        };
      case 'training':
        return {
          rowKey: 'dept', sourceKey: 'dept',
          source: this.workforce?.employeeList ?? [],
          cols: empCols,
        };
      case 'ot-dept':
        return {
          rowKey: 'dept', sourceKey: 'dept',
          source: this.otAnalysis?.allEmployees ?? [],
          cols: [
            { key: 'name', label: 'Employee' }, { key: 'designation', label: 'Designation' },
            { key: 'hours', label: 'OT Hours' }, { key: 'minutes', label: 'OT Minutes' },
          ],
        };
      case 'late-dept':
        return {
          rowKey: 'dept', sourceKey: 'dept',
          source: this.lateArrivals?.allEmployees ?? [],
          cols: [
            { key: 'name', label: 'Employee' },
            { key: 'count', label: 'Late Days' },
            { key: 'totalMinutes', label: 'Total Delay (min)' },
            { key: 'avgMinutes',   label: 'Avg Delay (min)' },
          ],
        };
      case 'leave-util-dept':
        return {
          rowKey: 'dept', sourceKey: 'dept',
          source: this.leaveUtil?.allEmployees ?? [],
          cols: [
            { key: 'name', label: 'Employee' },
            { key: 'allowed', label: 'Allowed' }, { key: 'used', label: 'Used' },
            { key: 'remaining', label: 'Remaining' }, { key: 'utilizationPct', label: 'Utilization %' },
          ],
        };
      case 'absent-dept':
        return {
          rowKey: 'dept', sourceKey: 'dept',
          source: this.absenteeism?.allAbsentEmployees ?? [],
          cols: [
            { key: 'name', label: 'Employee' },
            { key: 'absentDays', label: 'Absent Days' }, { key: 'absentRate', label: 'Absence Rate %' },
          ],
        };
      case 'qual-dept':
        return {
          rowKey: 'dept', sourceKey: 'dept',
          source: this.qualifications?.employeeList ?? [],
          cols: [
            { key: 'name',        label: 'Employee' },
            { key: 'employeeCode', label: 'Code' },
            { key: 'designation', label: 'Designation' },
            { key: 'degree',      label: 'Highest Degree' },
            { key: 'institution', label: 'Institution' },
            { key: 'year',        label: 'Year' },
          ],
        };
      case 'tenure':
        return {
          rowKey: 'label', sourceKey: 'tenureBand',
          source: this.wfInsights?.employeeList ?? [],
          cols: [
            { key: 'name',        label: 'Employee Name' },
            { key: 'employeeCode', label: 'Code' },
            { key: 'dept',        label: 'Department' },
            { key: 'designation', label: 'Designation' },
            { key: 'tenureBand',  label: 'Tenure' },
          ],
        };
      case 'age-gender':
        return {
          rowKey: 'label', sourceKey: 'ageBand',
          source: this.wfInsights?.employeeList ?? [],
          cols: [
            { key: 'name',         label: 'Employee Name' },
            { key: 'employeeCode', label: 'Code' },
            { key: 'gender',       label: 'Gender' },
            { key: 'age',          label: 'Age' },
            { key: 'ageBand',      label: 'Age Band' },
            { key: 'dept',         label: 'Department' },
          ],
        };
      case 'joining-trend':
        return {
          rowKey: 'year', sourceKey: 'joiningYear',
          source: this.wfInsights?.employeeList ?? [],
          cols: [
            { key: 'name',           label: 'Employee Name' },
            { key: 'employeeCode',   label: 'Code' },
            { key: 'dept',           label: 'Department' },
            { key: 'designation',    label: 'Designation' },
            { key: 'dateOfJoining',  label: 'Date of Joining' },
            { key: 'joiningYear',    label: 'Year' },
          ],
        };
      case 'dept-gender':
        return {
          rowKey: 'dept', sourceKey: 'dept',
          source: this.wfInsights?.employeeList ?? [],
          cols: [
            { key: 'name',        label: 'Employee Name' },
            { key: 'gender',      label: 'Gender' },
            { key: 'designation', label: 'Designation' },
          ],
        };
      case 'qual-degree':
        return {
          rowKey: 'degree', sourceKey: 'degree',
          source: this.qualifications?.employeeList ?? [],
          cols: [
            { key: 'name',   label: 'Employee Name' },
            { key: 'dept',   label: 'Department' },
            { key: 'degree', label: 'Degree' },
          ],
        };
      case 'el-dist':
        return {
          rowKey: 'label', sourceKey: 'bucket',
          source: this.elInsights?.employeeList ?? [],
          cols: [
            { key: 'employeeName', label: 'Employee' },
            { key: 'employeeCode', label: 'Code' },
            { key: 'dept',         label: 'Department' },
            { key: 'designation',  label: 'Designation' },
            { key: 'balance',      label: 'EL Balance' },
            { key: 'lastLeaveDate', label: 'Last EL Taken' },
          ],
        };
      case 'el-dept':
        return {
          rowKey: 'dept', sourceKey: 'dept',
          source: this.elInsights?.employeeList ?? [],
          cols: [
            { key: 'employeeName', label: 'Employee' },
            { key: 'employeeCode', label: 'Code' },
            { key: 'designation',  label: 'Designation' },
            { key: 'balance',      label: 'EL Balance' },
            { key: 'bucket',       label: 'Bucket' },
          ],
        };
      case 'training-dept':
        // Use the granular per-attempt list so each row shows
        // employee × training × test, not just employee aggregates.
        return {
          rowKey: 'dept', sourceKey: 'dept',
          source: this.trainingInsights?.attemptDetails ?? [],
          cols: [
            { key: 'name',           label: 'Employee' },
            { key: 'employeeCode',   label: 'Code' },
            { key: 'designation',    label: 'Designation' },
            { key: 'trainingTitle',  label: 'Training' },
            { key: 'testName',       label: 'Test' },
            { key: 'score',          label: 'Score' },
            { key: 'passingPercent', label: 'Pass %' },
            { key: 'attemptDate',    label: 'Date' },
          ],
        };
      case 'training-score':
        // Drill by score band — show employees whose avg score is in that band
        return {
          rowKey: 'label', sourceKey: 'band',
          source: this.trainingInsights?.employeeList ?? [],
          cols: [
            { key: 'name',          label: 'Employee' },
            { key: 'employeeCode',  label: 'Code' },
            { key: 'dept',          label: 'Department' },
            { key: 'designation',   label: 'Designation' },
            { key: 'avgScore',      label: 'Avg Score' },
            { key: 'attemptsCount', label: 'Attempts' },
            { key: 'band',          label: 'Band' },
          ],
        };
      case 'perf-dist':
        return {
          rowKey: 'label', sourceKey: 'band',
          source: this.perfDist?.employeeList ?? [],
          cols: [
            { key: 'name',        label: 'Employee' },
            { key: 'dept',        label: 'Department' },
            { key: 'designation', label: 'Designation' },
            { key: 'score',       label: 'Score' },
            { key: 'band',        label: 'Band' },
          ],
        };
      case 'attendance':
        // Each row is a day. Drill = employees who were absent on that day.
        // Backend must return `attendanceDays[].absentEmployees`; fall back to
        // empty array if not present so the button still renders gracefully.
        return {
          rowKey: 'date', sourceKey: 'date',
          source: (this.attendanceDays ?? []).flatMap((d: any) =>
            (d.absentEmployees ?? []).map((e: any) => ({ ...e, date: d.date })),
          ),
          cols: [
            { key: 'name',        label: 'Employee Name' },
            { key: 'dept',        label: 'Department' },
            { key: 'designation', label: 'Designation' },
            { key: 'date',        label: 'Absent On' },
          ],
        };
      case 'attrition':
        return {
          rowKey: 'month', sourceKey: 'month',
          source: (this.attritionTrend?.months ?? []).flatMap((m: any) =>
            (m.resignations ?? []).map((e: any) => ({ ...e, month: m.month })),
          ),
          cols: [
            { key: 'name',        label: 'Employee Name' },
            { key: 'dept',        label: 'Department' },
            { key: 'designation', label: 'Designation' },
            { key: 'lastDate',    label: 'Last Working Date' },
            { key: 'status',      label: 'Status' },
          ],
        };
      case 'weekly':
        return {
          rowKey: 'label', sourceKey: 'weekLabel',
          source: (this.weeklyTrend?.weeks ?? []).flatMap((w: any) =>
            (w.submissions ?? []).map((r: any) => ({ ...r, weekLabel: w.label })),
          ),
          cols: [
            { key: 'name',   label: 'Employee' },
            { key: 'dept',   label: 'Department' },
            { key: 'score',  label: 'Score' },
            { key: 'ratedBy', label: 'Rated By' },
          ],
        };
      default:
        return null;
    }
  }

  closeModal() {
    this.modalVisible = false;
    this.modalDrill = null;
  }

  exportModalCsv() {
    this.downloadCsv(this.modalTitle, this.modalColumns, this.modalRows);
  }

  // ── Sub-modal (drill-down from row) ──────────────────────
  openSubModal(row: any) {
    if (!this.modalDrill) return;
    const keyVal = row[this.modalDrill.rowKey];
    if (keyVal == null) return;
    const filtered = this.modalDrill.source.filter(
      (s: any) => s[this.modalDrill!.sourceKey] === keyVal,
    );
    this.subModalTitle   = `${this.modalDrill.rowKey === 'dept' ? 'Employees' : 'Details'} for ${keyVal} (${filtered.length})`;
    this.subModalColumns = this.modalDrill.cols;
    this.subModalRows    = filtered;
    this.subModalVisible = true;
  }

  closeSubModal() { this.subModalVisible = false; }

  exportSubModalCsv() {
    this.downloadCsv(this.subModalTitle, this.subModalColumns, this.subModalRows);
  }

  private downloadCsv(title: string, cols: { key: string; label: string }[], rows: any[]) {
    const header = cols.map(c => c.label).join(',');
    const body   = rows.map(r =>
      cols.map(c => {
        const v = r[c.key] ?? '';
        return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
      }).join(',')
    ).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = title.replace(/[^a-z0-9]/gi, '_') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Performance radar ────────────────────────────────────
  radarDimensions = [
    { key: 'attendance',    label: 'Attendance' },
    { key: 'leadership',    label: 'Leadership' },
    { key: 'qualityOfWork', label: 'Quality of Work' },
  ];

  getRadarScore(dim: string): number {
    return this.performanceRadar?.managerRatings?.find((r: any) => r.dimension === dim)?.value ?? 0;
  }

  // ── Dept snapshot helpers ────────────────────────────────
  getAttBadge(pct: number): string {
    if (pct >= 85) return 'badge-good';
    if (pct >= 70) return 'badge-warn';
    return 'badge-danger';
  }

  getScoreBadge(score: number | null): string {
    if (score === null) return 'badge-muted';
    if (score >= 70) return 'badge-good';
    if (score >= 50) return 'badge-warn';
    return 'badge-danger';
  }

  // ── Weekly trend helpers ─────────────────────────────────
  getTrendClass(): string {
    if (!this.weeklyTrend) return '';
    return this.weeklyTrend.trend === 'improving' ? 'trend-up' : this.weeklyTrend.trend === 'declining' ? 'trend-down' : 'trend-stable';
  }

  getTrendIcon(): string {
    if (!this.weeklyTrend) return '';
    return this.weeklyTrend.trend === 'improving' ? '↑' : this.weeklyTrend.trend === 'declining' ? '↓' : '→';
  }

  // ── Shared helpers ────────────────────────────────────────
  getScoreColor(score: number): string {
    if (score >= 7) return '#22c55e';
    if (score >= 5) return '#f59e0b';
    return '#ef4444';
  }

  getSeverityClass(s: string) {
    if (s === 'danger') return 'sev-danger';
    if (s === 'warn')   return 'sev-warn';
    return 'sev-info';
  }

  getPIPStatusClass(s: string) {
    if (s === 'TERMINATION_INITIATED') return 'pip-term';
    if (s === 'PIP_EXTENDED')          return 'pip-ext';
    if (s === 'PIP_ACTIVE')            return 'pip-active';
    return 'pip-warn';
  }

  // ── Leave calendar ────────────────────────────────────────
  // ── Attendance period switcher ────────────────────────────
  selectAttendancePeriod(days: number) {
    if (this.attendanceDays_count === days) return;
    this.attendanceDays_count = days;
    this.loadingAttendance = true;
    this.loadAttendance(days);
  }

  loadAttendance(days: number) {
    this.svc.getAttendanceSummary(days).subscribe({
      next: (d) => {
        this.attendanceDays = d.days;
        this.loadingAttendance = false;
        this.cdr.detectChanges();
        this.drawAttendanceChart();
      },
      error: () => { this.loadingAttendance = false; }
    });
  }

  // ── Leave calendar navigation ─────────────────────────────
  loadLeaveCalendar() {
    const y = this.calendarMonth.getFullYear();
    const m = String(this.calendarMonth.getMonth() + 1).padStart(2, '0');
    this.calendarMonthStr = `${y}-${m}`;
    this.svc.getLeaveCalendar(this.calendarMonthStr).subscribe({
      next: (d) => {
        this.leaveCalendar   = d.calendar;
        this.leaveTopTypes   = d.topTypes;
        this.calendarMonthLabel = d.monthLabel;
        this.buildCalendarGrid();
      },
      error: () => {}
    });
  }

  prevMonth() {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() - 1, 1);
    this.loadLeaveCalendar();
  }

  nextMonth() {
    const now = new Date();
    const next = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1);
    // Don't allow navigating beyond current month
    if (next.getFullYear() > now.getFullYear() || (next.getFullYear() === now.getFullYear() && next.getMonth() > now.getMonth())) return;
    this.calendarMonth = next;
    this.loadLeaveCalendar();
  }

  isCurrentMonth(): boolean {
    const now = new Date();
    return this.calendarMonth.getFullYear() === now.getFullYear() && this.calendarMonth.getMonth() === now.getMonth();
  }

  buildCalendarGrid() {
    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: any[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = this.leaveCalendar.find(c => c.date === dateStr);
      grid.push({ day: d, date: dateStr, count: entry?.count || 0, employees: entry?.employees || [] });
    }
    this.calendarGrid = grid;
  }

  // Leave type → stable colour assignment
  getLeaveTypeColor(type: string): string {
    if (!this.leaveTypeColors[type]) {
      this.leaveTypeColors[type] = this.LEAVE_COLORS[this.colorIndex % this.LEAVE_COLORS.length];
      this.colorIndex++;
    }
    return this.leaveTypeColors[type];
  }

  // Calendar cell background based on dominant leave type + count intensity
  getCalendarCellStyle(cell: any): { [key: string]: string } {
    if (!cell || cell.count === 0) return {};
    const baseColor = this.getLeaveTypeColor(cell.dominantType || 'Leave');
    const alpha = cell.count <= 2 ? '0.28' : cell.count <= 5 ? '0.55' : '0.85';
    return { background: this.hexToRgba(baseColor, alpha) };
  }

  private hexToRgba(hex: string, alpha: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  getCalendarIntensity(count: number): string {
    if (count === 0)  return 'transparent';
    if (count <= 2)   return 'rgba(245,158,11,0.25)';
    if (count <= 5)   return 'rgba(245,158,11,0.5)';
    return 'rgba(245,158,11,0.85)';
  }

  // Dept risk helpers
  getRiskClass(level: string): string {
    if (level === 'high')   return 'risk-high';
    if (level === 'medium') return 'risk-medium';
    return 'risk-low';
  }

  getRiskBarColor(level: string): string {
    if (level === 'high')   return '#ef4444';
    if (level === 'medium') return '#f59e0b';
    return '#22c55e';
  }

  monthLabel() { return this.calendarMonth.toLocaleString('en', { month: 'long', year: 'numeric' }); }

  // ── Chart drawing ─────────────────────────────────────────
  private drawWorkforceCharts() {
    if (!this.workforce) return;
    const barCtx = document.getElementById('workforceBarChart') as HTMLCanvasElement;
    if (barCtx) {
      if (this.workforceBarChart) this.workforceBarChart.destroy();
      const depts  = this.workforce.byDept.slice(0, 8);
      const types  = ['PERMANENT','CONTRACT','PROBATION','DOCTOR','TRAINEE'];
      const colors = ['#60a5fa','#34d399','#f59e0b','#f472b6','#a78bfa'];
      this.workforceBarChart = new Chart(barCtx, {
        type: 'bar',
        data: { labels: depts.map((d: any) => d.dept), datasets: types.map((t,i) => ({ label: t, data: depts.map((d: any) => d[t]||0), backgroundColor: colors[i], borderRadius: 4 })) },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#d1d5db', font: { size: 11 }, padding: 16 } } },
          scales: { x: { stacked: true, ticks: { color: '#d1d5db', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.06)' } }, y: { stacked: true, ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.06)' } } } },
        plugins: [this.valueLabelsPlugin],
      });
    }
    const donutCtx = document.getElementById('workforceDonutChart') as HTMLCanvasElement;
    if (donutCtx) {
      if (this.workforceDonutChart) this.workforceDonutChart.destroy();
      const statuses = this.workforce.byStatus;
      const sc: Record<string,string> = { ACTIVE:'#22c55e', NOTICE_PERIOD:'#f59e0b', SABBATICAL:'#60a5fa', SUSPENDED:'#ef4444', RESIGNED:'#9ca3af', TERMINATED:'#7f1d1d' };
      this.workforceDonutChart = new Chart(donutCtx, {
        type: 'doughnut',
        data: { labels: statuses.map((s: any) => s.status), datasets: [{ data: statuses.map((s: any) => s.count), backgroundColor: statuses.map((s: any) => sc[s.status]||'#6b7280'), borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: '#d1d5db', font: { size: 11 }, padding: 12 } } } },
        plugins: [this.valueLabelsPlugin],
      });
    }
  }

  private drawAttendanceChart() {
    const ctx = document.getElementById('attendanceChart') as HTMLCanvasElement;
    if (!ctx || !this.attendanceDays.length) return;
    if (this.attendanceChart) this.attendanceChart.destroy();

    // Append "(WO)" or holiday name to x-axis labels for non-working days
    const labels = this.attendanceDays.map((d: any) =>
      d.isNonWorking ? `${d.date}\n(${d.nonWorkingLabel === 'Week Off' ? 'WO' : 'H'})` : d.date
    );

    this.attendanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Present',    data: this.attendanceDays.map((d: any) => d.present),    backgroundColor: '#22c55e', borderRadius: 4, stack: 'att' },
          { label: 'On Leave',   data: this.attendanceDays.map((d: any) => d.leave),      backgroundColor: '#60a5fa', borderRadius: 4, stack: 'att' },
          { label: 'Permission', data: this.attendanceDays.map((d: any) => d.permission), backgroundColor: '#f59e0b', borderRadius: 4, stack: 'att' },
          { label: 'Absent',     data: this.attendanceDays.map((d: any) => d.absent),     backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 4, stack: 'att' },
          { label: 'Week Off / Holiday', data: this.attendanceDays.map((d: any) => d.weekoff ?? 0), backgroundColor: 'rgba(100,116,139,0.35)', borderRadius: 4, stack: 'att' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#d1d5db', font: { size: 11 }, padding: 14 } },
          tooltip: {
            callbacks: {
              title: (items: any[]) => {
                const idx = items[0]?.dataIndex;
                const day = this.attendanceDays[idx];
                if (day?.isNonWorking) return `${day.date} — ${day.nonWorkingLabel}`;
                return items[0]?.label ?? '';
              },
              afterBody: (items: any[]) => {
                const idx = items[0]?.dataIndex;
                const day = this.attendanceDays[idx];
                if (day?.isNonWorking) return [`Week off / holiday — absences not counted`, `${day.present} attended`];
                return [];
              }
            }
          }
        },
        scales: {
          x: { stacked: true, ticks: { color: '#d1d5db', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { stacked: true, ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        },
      },
      plugins: [this.valueLabelsPlugin],
    });
  }

  private drawAttritionChart() {
    const ctx = document.getElementById('attritionChart') as HTMLCanvasElement;
    if (!ctx || !this.attritionTrend) return;
    if (this.attritionChart) this.attritionChart.destroy();
    const months = this.attritionTrend.months;
    this.attritionChart = new Chart(ctx, {
      type: 'line',
      data: { labels: months.map((m: any) => m.month), datasets: [
        { label: 'Submitted', data: months.map((m: any) => m.submitted), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#f59e0b' },
        { label: 'Exited',    data: months.map((m: any) => m.exited),    borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.12)',  fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#ef4444' },
      ]},
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#d1d5db', font: { size: 11 } } } },
        scales: { x: { ticks: { color: '#d1d5db', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } }, y: { ticks: { color: '#d1d5db', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.06)' } } } },
      plugins: [this.valueLabelsPlugin],
    });
  }

  private drawFunnelChart() {
    const ctx = document.getElementById('funnelChart') as HTMLCanvasElement;
    if (!ctx || !this.recruitmentFunnel) return;
    if (this.funnelChart) this.funnelChart.destroy();
    const funnel = this.recruitmentFunnel.funnel;
    this.funnelChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: funnel.map((f: any) => f.stage), datasets: [{ label: 'Candidates', data: funnel.map((f: any) => f.count), backgroundColor: ['#60a5fa','#818cf8','#a78bfa','#c084fc','#e879f9'], borderRadius: 6 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: (c) => { const d = funnel[c.dataIndex]?.dropPct; return d ? `Drop-off: ${d}%` : ''; } } } },
        scales: { x: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.06)' } }, y: { ticks: { color: '#e5e7eb', font: { size: 12 } }, grid: { display: false } } } },
      plugins: [this.valueLabelsPlugin],
    });
  }

  private drawWeeklyChart() {
    const ctx = document.getElementById('weeklyTrendChart') as HTMLCanvasElement;
    if (!ctx || !this.weeklyTrend?.weeks?.length) return;
    if (this.weeklyChart) this.weeklyChart.destroy();
    const weeks = this.weeklyTrend.weeks;
    this.weeklyChart = new Chart(ctx, {
      type: 'line',
      data: { labels: weeks.map((w: any) => w.label), datasets: [
        { label: 'Avg Weekly Score', data: weeks.map((w: any) => w.avgScore),
          borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.12)',
          fill: true, tension: 0.4, pointRadius: 6, pointHoverRadius: 9,
          pointBackgroundColor: '#a78bfa', pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 2 },
      ]},
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#d1d5db', font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: '#d1d5db', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { min: 0, max: 100, ticks: { color: '#d1d5db', stepSize: 10 }, grid: { color: 'rgba(255,255,255,0.06)' } },
        } },
      plugins: [this.valueLabelsPlugin],
    });
  }

  private drawPerfDistChart() {
    const ctx = document.getElementById('perfDistChart') as HTMLCanvasElement;
    if (!ctx || !this.perfDist?.distribution) return;
    // Skip drawing if no appraisals exist (all counts are 0)
    if (this.perfDist.withAppraisal === 0) return;
    if (this.perfDistChart) this.perfDistChart.destroy();
    const dist = this.perfDist.distribution;
    // Shorten legend labels so they don't get clipped in the narrow slot.
    // Full label like "Excellent (80–100)" becomes just "Excellent" in the legend;
    // tooltip / modal still show the full band name.
    const shortLabels = dist.map((d: any) => (d.label || '').split(' (')[0] || d.label);
    this.perfDistChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: shortLabels,
        datasets: [{
          data: dist.map((d: any) => d.count),
          backgroundColor: dist.map((d: any) => d.color),
          borderWidth: 0, hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#d1d5db', font: { size: 11 },
              padding: 10, boxWidth: 12, boxHeight: 12,
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              // Show the full band label (with score range) on hover
              title: (items: any[]) => dist[items[0]?.dataIndex]?.label ?? '',
            },
          },
        },
      },
      plugins: [this.valueLabelsPlugin],
    });
  }

  private drawOtDeptChart() {
    const ctx = document.getElementById('otDeptChart') as HTMLCanvasElement;
    if (!ctx || !this.otAnalysis?.deptTotals?.length) return;
    if (this.otDeptChart) this.otDeptChart.destroy();
    const data = this.otAnalysis.deptTotals.slice(0, 10);
    this.otDeptChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((d: any) => d.dept),
        datasets: [{ label: 'OT Hours', data: data.map((d: any) => d.hours),
          backgroundColor: '#f59e0b', borderRadius: 5 }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#e5e7eb', font: { size: 11 } }, grid: { display: false } }
        }
      },
      plugins: [this.valueLabelsPlugin],
    });
  }

  private drawLateHeatChart() {
    const ctx = document.getElementById('lateHeatChart') as HTMLCanvasElement;
    if (!ctx || !this.lateArrivals?.deptHeatmap?.length) return;
    if (this.lateHeatChart) this.lateHeatChart.destroy();
    const data = this.lateArrivals.deptHeatmap.slice(0, 10);
    this.lateHeatChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((d: any) => d.dept),
        datasets: [{ label: 'Late Days', data: data.map((d: any) => d.count),
          backgroundColor: '#f472b6', borderRadius: 5 }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#e5e7eb', font: { size: 11 } }, grid: { display: false } }
        }
      },
      plugins: [this.valueLabelsPlugin],
    });
  }

  private drawWfInsightCharts() {
    // 1. Age-Gender grouped bar (Male + Female only, always-on data labels)
    const ageCtx = document.getElementById('ageGenderChart') as HTMLCanvasElement;
    if (ageCtx && this.wfInsights?.ageSplitChart?.length) {
      if (this.ageGenderChart) this.ageGenderChart.destroy();
      const d = this.wfInsights.ageSplitChart;
      this.ageGenderChart = new Chart(ageCtx, {
        type: 'bar',
        data: {
          labels: d.map((r: any) => r.label),
          datasets: [
            { label: 'Male',   data: d.map((r: any) => r.male),   backgroundColor: '#60a5fa', borderRadius: 5 },
            { label: 'Female', data: d.map((r: any) => r.female), backgroundColor: '#f472b6', borderRadius: 5 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#d1d5db', font: { size: 12 }, padding: 16 } } },
          scales: {
            x: { ticks: { color: '#d1d5db', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
            y: { ticks: { color: '#d1d5db', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.06)' } },
          },
        },
        plugins: [this.valueLabelsPlugin],
      });
    }

    // 2. Tenure distribution horizontal bar
    const tenureCtx = document.getElementById('tenureChart') as HTMLCanvasElement;
    if (tenureCtx && this.wfInsights?.tenureBuckets?.length) {
      if (this.tenureChart) this.tenureChart.destroy();
      const t = this.wfInsights.tenureBuckets;
      // Distinct colour per tenure bucket so each band stands out
      const tenureColors = [
        '#f87171', // < 1 year — fresh joiners (red-ish)
        '#fbbf24', // 1 – 3 yrs (amber)
        '#34d399', // 3 – 5 yrs (green)
        '#60a5fa', // 5 – 10 yrs (blue)
        '#a78bfa', // > 10 yrs — veterans (purple)
      ];
      this.tenureChart = new Chart(tenureCtx, {
        type: 'bar',
        data: {
          labels: t.map((b: any) => b.label),
          datasets: [{
            label: 'Employees',
            data: t.map((b: any) => b.count),
            backgroundColor: t.map((_: any, i: number) => tenureColors[i % tenureColors.length]),
            borderRadius: 5,
          }],
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.06)' } },
            y: { ticks: { color: '#e5e7eb', font: { size: 12 } }, grid: { display: false } },
          },
        },
        plugins: [this.valueLabelsPlugin],
      });
    }

    // 3. Joining vs Resignation year trend
    const joinCtx = document.getElementById('joiningTrendChart') as HTMLCanvasElement;
    if (joinCtx && this.wfInsights?.joiningTrend?.length) {
      if (this.joiningTrendChart) this.joiningTrendChart.destroy();
      const j = this.wfInsights.joiningTrend;
      this.joiningTrendChart = new Chart(joinCtx, {
        type: 'line',
        data: {
          labels: j.map((r: any) => r.year),
          datasets: [
            {
              label: 'Joinings',
              data: j.map((r: any) => r.joinings ?? r.count ?? 0),
              borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)',
              fill: true, tension: 0.4, pointRadius: 4,
              pointBackgroundColor: '#22c55e', borderWidth: 2,
            },
            {
              label: 'Resignations',
              data: j.map((r: any) => r.resignations ?? 0),
              borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.12)',
              fill: true, tension: 0.4, pointRadius: 4,
              pointBackgroundColor: '#ef4444', borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#d1d5db', font: { size: 12 } } },
            tooltip: {
              callbacks: {
                afterLabel: (c) => {
                  const row = j[c.dataIndex];
                  if (!row) return '';
                  return `Net: ${row.net >= 0 ? '+' : ''}${row.net}`;
                },
              },
            },
          },
          scales: {
            x: { ticks: { color: '#d1d5db', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
            y: { ticks: { color: '#d1d5db', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.06)' } },
          },
        },
        plugins: [this.valueLabelsPlugin],
      });
    }
  }

  private drawQualDegreeChart() {
    const ctx = document.getElementById('qualDegreeChart') as HTMLCanvasElement;
    if (!ctx || !this.qualifications?.degreeDistribution?.length) return;
    if (this.qualDegreeChart) this.qualDegreeChart.destroy();
    const top = this.qualifications.degreeDistribution.slice(0, 10);
    const palette = ['#60a5fa','#34d399','#f472b6','#fbbf24','#a78bfa','#38bdf8','#4ade80','#fb923c','#e879f9','#facc15'];
    this.qualDegreeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map((d: any) => d.degree),
        datasets: [{
          label: 'Employees',
          data: top.map((d: any) => d.count),
          backgroundColor: top.map((_: any, i: number) => palette[i % palette.length]),
          borderRadius: 5,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#d1d5db', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#e5e7eb', font: { size: 11 } }, grid: { display: false } },
        },
      },
      plugins: [this.valueLabelsPlugin],
    });
  }

  // EL balance distribution (horizontal bar, one colour per bucket)
  private drawElDistChart(retries = 3) {
    const ctx = document.getElementById('elDistChart') as HTMLCanvasElement;
    if (!ctx) {
      if (retries > 0) {
        // Canvas not in DOM yet — likely still waiting for Angular's *ngIf/[hidden] swap.
        // Retry on the next animation frame (handles late view init) up to 3 times.
        console.warn('[drawElDistChart] canvas not ready, retries left:', retries);
        requestAnimationFrame(() => this.drawElDistChart(retries - 1));
      } else {
        console.error('[drawElDistChart] canvas never appeared — giving up');
      }
      return;
    }
    if (!this.elInsights?.distribution?.length) {
      console.warn('[drawElDistChart] no distribution data', this.elInsights);
      return;
    }
    if (this.elDistChart) this.elDistChart.destroy();
    const dist = this.elInsights.distribution;
    // Green → yellow → orange → red: healthy to breaching
    const colors = ['#22c55e', '#84cc16', '#fbbf24', '#fb923c', '#ef4444'];
    this.elDistChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dist.map((d: any) => d.label),
        datasets: [{
          label: 'Employees',
          data: dist.map((d: any) => d.count),
          backgroundColor: dist.map((_: any, i: number) => colors[i % colors.length]),
          borderRadius: 5,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (c) => {
                const b = dist[c.dataIndex];
                return b ? `Range: ${b.min}${b.max === Infinity ? '+' : ` – ${b.max}`} days EL` : '';
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: '#d1d5db', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#e5e7eb', font: { size: 12 } }, grid: { display: false } },
        },
      },
      plugins: [this.valueLabelsPlugin],
    });
  }

  // Training department-participation horizontal bar (assigned vs completed)
  private drawTrainingDeptChart(retries = 3) {
    const ctx = document.getElementById('trainingDeptChart') as HTMLCanvasElement;
    if (!ctx) {
      if (retries > 0) { requestAnimationFrame(() => this.drawTrainingDeptChart(retries - 1)); return; }
      return;
    }
    if (!this.trainingInsights?.deptParticipation?.length) return;
    if (this.trainingDeptChart) this.trainingDeptChart.destroy();
    const data = this.trainingInsights.deptParticipation.slice(0, 10);
    this.trainingDeptChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((d: any) => d.dept),
        datasets: [
          { label: 'Assigned',  data: data.map((d: any) => d.assignedEmployees), backgroundColor: '#60a5fa', borderRadius: 4, stack: 't' },
          { label: 'Completed', data: data.map((d: any) => d.completed),         backgroundColor: '#22c55e', borderRadius: 4, stack: 't' },
        ],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#d1d5db', font: { size: 11 }, padding: 14 } } },
        scales: {
          x: { stacked: true, ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { stacked: true, ticks: { color: '#e5e7eb', font: { size: 11 } }, grid: { display: false } },
        },
      },
      plugins: [this.valueLabelsPlugin],
    });
  }

  // Test score distribution doughnut (Excellent/Good/Average/Below)
  private drawTrainingScoreChart(retries = 3) {
    const ctx = document.getElementById('trainingScoreChart') as HTMLCanvasElement;
    if (!ctx) {
      if (retries > 0) { requestAnimationFrame(() => this.drawTrainingScoreChart(retries - 1)); return; }
      return;
    }
    if (!this.trainingInsights?.scoreDistribution?.length) return;
    const total = this.trainingInsights.scoreDistribution.reduce((s: number, d: any) => s + d.count, 0);
    if (total === 0) return;
    if (this.trainingScoreChart) this.trainingScoreChart.destroy();
    const dist = this.trainingInsights.scoreDistribution;
    const shortLabels = dist.map((d: any) => (d.label || '').split(' (')[0] || d.label);
    this.trainingScoreChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: shortLabels,
        datasets: [{
          data: dist.map((d: any) => d.count),
          backgroundColor: dist.map((d: any) => d.color),
          borderWidth: 0, hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#d1d5db', font: { size: 11 }, padding: 10, boxWidth: 12, boxHeight: 12, usePointStyle: true },
          },
          tooltip: {
            callbacks: {
              title: (items: any[]) => dist[items[0]?.dataIndex]?.label ?? '',
            },
          },
        },
      },
      plugins: [this.valueLabelsPlugin],
    });
  }

  private drawMobileLoginChart() {
    const ctx = document.getElementById('mobileLoginChart') as HTMLCanvasElement;
    if (!ctx || !this.mobileLogin?.daily?.length) return;
    if (this.mobileLoginChart) this.mobileLoginChart.destroy();
    const days = this.mobileLogin.daily;
    this.mobileLoginChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days.map((d: any) => d.label),
        datasets: [
          { label: 'Mobile',  data: days.map((d: any) => d.mobile),  backgroundColor: '#a78bfa', borderRadius: 4, stack: 'login' },
          { label: 'Desktop', data: days.map((d: any) => d.desktop), backgroundColor: '#38bdf8', borderRadius: 4, stack: 'login' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#d1d5db', font: { size: 12 }, padding: 16 } },
          tooltip: {
            callbacks: {
              footer: (items: any[]) => {
                const total = items.reduce((s: number, i: any) => s + i.raw, 0);
                return `Total: ${total}`;
              }
            }
          }
        },
        scales: {
          x: { stacked: true, ticks: { color: '#d1d5db', font: { size: 11 }, maxRotation: 45 }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { stacked: true, ticks: { color: '#d1d5db', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.06)' } },
        },
      },
      plugins: [this.valueLabelsPlugin],
    });
  }
}
