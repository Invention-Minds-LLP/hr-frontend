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

  ngOnInit()       { this.loadAll(); }
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
    }, 0);
  }

  // ── Data loading ──────────────────────────────────────────
  private loadAll() {
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

  getKpiSub(key: string): string {
    if (!this.pulse) return '';
    switch (key) {
      case 'presentToday':       return `${this.pulse.attendancePct ?? 0}% attendance rate`;
      case 'pendingApprovals':   return 'Leave + Permission';
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
        title = 'Tenure Distribution';
        cols  = [{ key: 'label', label: 'Tenure Band' }, { key: 'count', label: 'Employees' }];
        rows  = this.wfInsights?.tenureBuckets ?? [];
        break;

      case 'joining-trend':
        title = 'Joinings by Year';
        cols  = [{ key: 'year', label: 'Year' }, { key: 'count', label: 'Employees Joined' }];
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

      default:
        return;
    }

    this.modalTitle   = title;
    this.modalColumns = cols;
    this.modalRows    = rows;
    this.modalVisible = true;
  }

  closeModal() { this.modalVisible = false; }

  exportModalCsv() {
    const header = this.modalColumns.map(c => c.label).join(',');
    const body   = this.modalRows.map(r =>
      this.modalColumns.map(c => {
        const v = r[c.key] ?? '';
        return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
      }).join(',')
    ).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = this.modalTitle.replace(/[^a-z0-9]/gi, '_') + '.csv';
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
      });
    }
  }

  private drawAttendanceChart() {
    const ctx = document.getElementById('attendanceChart') as HTMLCanvasElement;
    if (!ctx || !this.attendanceDays.length) return;
    if (this.attendanceChart) this.attendanceChart.destroy();
    this.attendanceChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: this.attendanceDays.map(d => d.date), datasets: [
        { label: 'Present',    data: this.attendanceDays.map(d => d.present),    backgroundColor: '#22c55e', borderRadius: 4 },
        { label: 'On Leave',   data: this.attendanceDays.map(d => d.leave),      backgroundColor: '#60a5fa', borderRadius: 4 },
        { label: 'Permission', data: this.attendanceDays.map(d => d.permission), backgroundColor: '#f59e0b', borderRadius: 4 },
        { label: 'Absent',     data: this.attendanceDays.map(d => d.absent),     backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 4 },
      ]},
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#d1d5db', font: { size: 11 }, padding: 14 } } },
        scales: { x: { stacked: true, ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.06)' } }, y: { stacked: true, ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.06)' } } } },
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
          fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#a78bfa', borderWidth: 2 },
      ]},
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#d1d5db', font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: '#d1d5db', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { min: 0, max: 10, ticks: { color: '#d1d5db', stepSize: 2 }, grid: { color: 'rgba(255,255,255,0.06)' } },
        } },
    });
  }

  private drawPerfDistChart() {
    const ctx = document.getElementById('perfDistChart') as HTMLCanvasElement;
    if (!ctx || !this.perfDist?.distribution) return;
    if (this.perfDistChart) this.perfDistChart.destroy();
    const dist = this.perfDist.distribution;
    this.perfDistChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: dist.map((d: any) => d.label), datasets: [{ data: dist.map((d: any) => d.count), backgroundColor: dist.map((d: any) => d.color), borderWidth: 0, hoverOffset: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: { legend: { position: 'right', labels: { color: '#d1d5db', font: { size: 11 }, padding: 14 } } } },
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
    });
  }

  private drawWfInsightCharts() {
    // 1. Age-Gender grouped bar
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
            { label: 'Other',  data: d.map((r: any) => r.other),  backgroundColor: '#a78bfa', borderRadius: 5 },
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
      });
    }

    // 2. Tenure distribution horizontal bar
    const tenureCtx = document.getElementById('tenureChart') as HTMLCanvasElement;
    if (tenureCtx && this.wfInsights?.tenureBuckets?.length) {
      if (this.tenureChart) this.tenureChart.destroy();
      const t = this.wfInsights.tenureBuckets;
      this.tenureChart = new Chart(tenureCtx, {
        type: 'bar',
        data: {
          labels: t.map((b: any) => b.label),
          datasets: [{ label: 'Employees', data: t.map((b: any) => b.count), backgroundColor: '#34d399', borderRadius: 5 }],
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.06)' } },
            y: { ticks: { color: '#e5e7eb', font: { size: 12 } }, grid: { display: false } },
          },
        },
      });
    }

    // 3. Joining year trend line
    const joinCtx = document.getElementById('joiningTrendChart') as HTMLCanvasElement;
    if (joinCtx && this.wfInsights?.joiningTrend?.length) {
      if (this.joiningTrendChart) this.joiningTrendChart.destroy();
      const j = this.wfInsights.joiningTrend;
      this.joiningTrendChart = new Chart(joinCtx, {
        type: 'line',
        data: {
          labels: j.map((r: any) => r.year),
          datasets: [{
            label: 'Joinings',
            data: j.map((r: any) => r.count),
            borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)',
            fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#fbbf24', borderWidth: 2,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#d1d5db', font: { size: 12 } } } },
          scales: {
            x: { ticks: { color: '#d1d5db', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
            y: { ticks: { color: '#d1d5db', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.06)' } },
          },
        },
      });
    }
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
    });
  }
}
