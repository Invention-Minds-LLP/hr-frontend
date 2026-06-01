import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { SurveryService } from '../../services/surveyService/survery-service';
import { Departments, Department } from '../../services/departments/departments';

Chart.register(...registerables);

type Filters = {
  from?: string;
  to?: string;
  departmentIds?: number[];
  gender?: string;
  designationId?: number;
  sections?: string[];
};

const LIKERT_COLORS = {
  fullyAgree: '#22c55e',
  mostlyAgree: '#84cc16',
  mostlyDisagree: '#f59e0b',
  stronglyDisagree: '#ef4444',
};

// Shared Chart.js color overrides so text/grid lines stay readable on
// the dark dashboard background. Matches hr-manager-dashboard pattern.
const DARK_TICK = '#d1d5db';
const DARK_LABEL = '#e5e7eb';
const DARK_GRID = 'rgba(255,255,255,0.06)';
const DARK_LEGEND = { labels: { color: DARK_TICK, font: { size: 11 }, padding: 12 } };

@Component({
  selector: 'app-survey-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, TabsModule, ButtonModule, TagModule,
    DatePickerModule, MultiSelectModule, SelectModule, DialogModule,
    SkeletonModule, TooltipModule, CardModule, ProgressBarModule, ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './survey-dashboard.html',
  styleUrl: './survey-dashboard.css',
})
export class SurveyDashboard implements OnInit, AfterViewInit {

  // ── Filter state ───────────────────────────────────────────
  filters: Filters = {};
  dateRange: Date[] | null = null;
  departments: Department[] = [];
  selectedDeptIds: number[] = [];
  selectedGender: string | null = null;
  selectedSections: string[] = [];
  genderOptions = [
    { label: 'All', value: null },
    { label: 'Male', value: 'MALE' },
    { label: 'Female', value: 'FEMALE' },
    { label: 'Other', value: 'OTHER' },
  ];
  sectionOptions = [
    { label: 'A — Job Satisfaction', value: 'A' },
    { label: 'B — Satisfaction with the Work', value: 'B' },
    { label: 'C — Coworker Cooperation', value: 'C' },
    { label: 'D — Pay & Benefits', value: 'D' },
    { label: 'E — Promotions / Career', value: 'E' },
    { label: 'F — Supervisory Consideration', value: 'F' },
    { label: 'G — Supervisory Team Work', value: 'G' },
    { label: 'H — Communication', value: 'H' },
    { label: 'I — Productivity / Efficiency', value: 'I' },
    { label: 'J — Training & Development', value: 'J' },
    { label: 'K — Patient Care / Customer Service', value: 'K' },
    { label: 'L — Strategy / Mission', value: 'L' },
  ];

  // ── Data buckets ───────────────────────────────────────────
  loading = { summary: false, sections: false, questions: false, departments: false, atRisk: false, demographics: false, pending: false, drill: false };
  summary: any = null;
  sections: any[] = [];
  questions: any[] = [];
  questionView: 'table' | 'topBottom' = 'table';
  topPositive: any[] = [];
  topNegative: any[] = [];
  deptData: any = null;
  atRisk: any[] = [];
  demographics: any = null;
  scatter: any[] = [];
  pending: any = null;
  selectedDraftIds: number[] = [];

  // ── Drill-down ─────────────────────────────────────────────
  drillVisible = false;
  drillData: any = null;
  activeTab: number = 0;
  drillOptionTab: number = 0;

  // ── Chart instances (held so we can destroy on refresh) ────
  private charts: Record<string, Chart | null> = {};

  // ── Canvas refs ────────────────────────────────────────────
  @ViewChild('overallDonut') overallDonut?: ElementRef<HTMLCanvasElement>;
  @ViewChild('divergingBar') divergingBar?: ElementRef<HTMLCanvasElement>;
  @ViewChild('sectionStacked') sectionStacked?: ElementRef<HTMLCanvasElement>;
  @ViewChild('sectionSorted') sectionSorted?: ElementRef<HTMLCanvasElement>;
  @ViewChild('sectionRadar') sectionRadar?: ElementRef<HTMLCanvasElement>;
  @ViewChild('deptRanking') deptRanking?: ElementRef<HTMLCanvasElement>;
  @ViewChild('deptHeatmap') deptHeatmap?: ElementRef<HTMLCanvasElement>;
  @ViewChild('genderDonut') genderDonut?: ElementRef<HTMLCanvasElement>;
  @ViewChild('tenureBar') tenureBar?: ElementRef<HTMLCanvasElement>;
  @ViewChild('designationBar') designationBar?: ElementRef<HTMLCanvasElement>;
  @ViewChild('atRiskScatter') atRiskScatter?: ElementRef<HTMLCanvasElement>;
  @ViewChild('pendingByDept') pendingByDept?: ElementRef<HTMLCanvasElement>;
  @ViewChild('drillDonut') drillDonut?: ElementRef<HTMLCanvasElement>;
  @ViewChild('drillByDept') drillByDept?: ElementRef<HTMLCanvasElement>;

  constructor(
    private api: SurveryService,
    private deptApi: Departments,
    private msg: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.deptApi.getDepartments().subscribe(d => this.departments = d || []);
    this.loadAll();
  }

  ngAfterViewInit() {
    // Charts are created after data lands, so nothing to draw on first paint.
  }

  // ====================================================================
  // Filter handling
  // ====================================================================
  private buildFilters(): Filters {
    const f: Filters = {};
    if (this.dateRange?.[0]) f.from = this.dateRange[0].toISOString();
    if (this.dateRange?.[1]) f.to = this.dateRange[1].toISOString();
    if (this.selectedDeptIds?.length) f.departmentIds = this.selectedDeptIds;
    if (this.selectedGender) f.gender = this.selectedGender;
    if (this.selectedSections?.length) f.sections = this.selectedSections;
    return f;
  }

  applyFilters() {
    this.filters = this.buildFilters();
    this.loadAll();
  }

  clearFilters() {
    this.dateRange = null;
    this.selectedDeptIds = [];
    this.selectedGender = null;
    this.selectedSections = [];
    this.filters = {};
    this.loadAll();
  }

  // ====================================================================
  // Data loading
  // ====================================================================
  private loadAll() {
    this.loadSummary();
    this.loadSections();
    this.loadQuestions();
    this.loadDepartments();
    this.loadAtRisk();
    this.loadDemographics();
    this.loadScatter();
    this.loadPending();
  }

  loadSummary() {
    this.loading.summary = true;
    this.api.getAnalyticsSummary(this.filters).subscribe({
      next: r => { this.summary = r; this.loading.summary = false; setTimeout(() => this.renderSummaryCharts()); },
      error: () => { this.loading.summary = false; },
    });
  }
  loadSections() {
    this.loading.sections = true;
    this.api.getAnalyticsBySection(this.filters).subscribe({
      next: r => { this.sections = r || []; this.loading.sections = false; setTimeout(() => this.renderSectionCharts()); },
      error: () => { this.loading.sections = false; },
    });
  }
  loadQuestions() {
    this.loading.questions = true;
    this.api.getAnalyticsByQuestion(this.filters).subscribe({
      next: r => {
        this.questions = r || [];
        // Top/Bottom 10 by avg score, only counting questions with responses
        const answered = this.questions.filter(q => q.total > 0);
        this.topPositive = [...answered].sort((a, b) => b.avgScore - a.avgScore).slice(0, 10);
        this.topNegative = [...answered].sort((a, b) => a.avgScore - b.avgScore).slice(0, 10);
        this.loading.questions = false;
      },
      error: () => { this.loading.questions = false; },
    });
  }
  loadDepartments() {
    this.loading.departments = true;
    this.api.getAnalyticsByDepartment(this.filters).subscribe({
      next: r => { this.deptData = r; this.loading.departments = false; setTimeout(() => this.renderDeptCharts()); },
      error: () => { this.loading.departments = false; },
    });
  }
  loadAtRisk() {
    this.loading.atRisk = true;
    this.api.getAnalyticsAtRisk(this.filters).subscribe({
      next: r => { this.atRisk = r || []; this.loading.atRisk = false; },
      error: () => { this.loading.atRisk = false; },
    });
  }
  loadDemographics() {
    this.loading.demographics = true;
    this.api.getAnalyticsDemographics(this.filters).subscribe({
      next: r => { this.demographics = r; this.loading.demographics = false; setTimeout(() => this.renderDemographicCharts()); },
      error: () => { this.loading.demographics = false; },
    });
  }
  loadScatter() {
    this.api.getAnalyticsScatter(this.filters).subscribe({
      next: r => { this.scatter = r || []; setTimeout(() => this.renderScatter()); },
    });
  }
  loadPending() {
    this.loading.pending = true;
    this.selectedDraftIds = [];
    this.api.getAnalyticsPending(this.filters).subscribe({
      next: r => { this.pending = r; this.loading.pending = false; setTimeout(() => this.renderPendingChart()); },
      error: () => { this.loading.pending = false; },
    });
  }

  // ====================================================================
  // Question drill-down
  // ====================================================================
  openDrill(q: any) {
    this.drillVisible = true;
    this.drillData = null;
    this.loading.drill = true;
    this.api.getAnalyticsQuestionDrilldown(q.id, this.filters).subscribe({
      next: r => { this.drillData = r; this.loading.drill = false; setTimeout(() => this.renderDrillCharts()); },
      error: () => { this.loading.drill = false; },
    });
  }
  closeDrill() {
    this.drillVisible = false;
    this.destroyChart('drillDonut');
    this.destroyChart('drillByDept');
  }

  // ====================================================================
  // Pending reminders
  // ====================================================================
  toggleDraft(id: number, checked: boolean) {
    if (checked) {
      if (!this.selectedDraftIds.includes(id)) this.selectedDraftIds.push(id);
    } else {
      this.selectedDraftIds = this.selectedDraftIds.filter(x => x !== id);
    }
  }
  sendRemindersForSelected() {
    if (!this.selectedDraftIds.length) return;
    this.api.sendPendingReminders(this.selectedDraftIds).subscribe({
      next: (r: any) => {
        this.msg.add({ severity: 'success', summary: 'Reminders sent', detail: `${r.notified}/${r.requested} notified` });
        this.selectedDraftIds = [];
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed', detail: 'Could not send reminders' }),
    });
  }
  sendReminderForOne(surveyId: number) {
    this.api.sendPendingReminders([surveyId]).subscribe({
      next: () => this.msg.add({ severity: 'success', summary: 'Reminder sent', detail: '' }),
      error: () => this.msg.add({ severity: 'error', summary: 'Failed', detail: 'Could not send reminder' }),
    });
  }

  // ====================================================================
  // Chart rendering
  // ====================================================================
  private destroyChart(key: string) {
    const c = this.charts[key];
    if (c) { c.destroy(); this.charts[key] = null; }
  }

  private renderSummaryCharts() {
    if (!this.summary) return;
    this.destroyChart('overallDonut');
    this.destroyChart('divergingBar');

    if (this.overallDonut?.nativeElement) {
      const d = this.summary.distribution;
      this.charts['overallDonut'] = new Chart(this.overallDonut.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Fully Agree', 'Mostly Agree', 'Mostly Disagree', 'Strongly Disagree'],
          datasets: [{
            data: [d.fullyAgree, d.mostlyAgree, d.mostlyDisagree, d.stronglyDisagree],
            backgroundColor: [LIKERT_COLORS.fullyAgree, LIKERT_COLORS.mostlyAgree, LIKERT_COLORS.mostlyDisagree, LIKERT_COLORS.stronglyDisagree],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', ...DARK_LEGEND } },
          cutout: '60%',
        },
      });
    }

    if (this.divergingBar?.nativeElement) {
      const d = this.summary.distribution;
      this.charts['divergingBar'] = new Chart(this.divergingBar.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Overall'],
          datasets: [
            { label: 'Strongly Disagree', data: [-d.stronglyDisagree], backgroundColor: LIKERT_COLORS.stronglyDisagree, stack: 's' },
            { label: 'Mostly Disagree', data: [-d.mostlyDisagree], backgroundColor: LIKERT_COLORS.mostlyDisagree, stack: 's' },
            { label: 'Mostly Agree', data: [d.mostlyAgree], backgroundColor: LIKERT_COLORS.mostlyAgree, stack: 's' },
            { label: 'Fully Agree', data: [d.fullyAgree], backgroundColor: LIKERT_COLORS.fullyAgree, stack: 's' },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true, ticks: { color: DARK_TICK, callback: v => Math.abs(Number(v)).toString() }, grid: { color: DARK_GRID } },
            y: { stacked: true, ticks: { color: DARK_TICK }, grid: { color: DARK_GRID } },
          },
          plugins: {
            legend: { position: 'bottom', ...DARK_LEGEND },
            tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Math.abs(ctx.parsed.x ?? 0)}` } },
          },
        },
      });
    }
  }

  private renderSectionCharts() {
    if (!this.sections.length) return;
    this.destroyChart('sectionStacked');
    this.destroyChart('sectionSorted');
    this.destroyChart('sectionRadar');

    const labels = this.sections.map(s => s.section);
    if (this.sectionStacked?.nativeElement) {
      this.charts['sectionStacked'] = new Chart(this.sectionStacked.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Fully Agree', data: this.sections.map(s => s.counts.fullyAgree), backgroundColor: LIKERT_COLORS.fullyAgree, stack: 's' },
            { label: 'Mostly Agree', data: this.sections.map(s => s.counts.mostlyAgree), backgroundColor: LIKERT_COLORS.mostlyAgree, stack: 's' },
            { label: 'Mostly Disagree', data: this.sections.map(s => s.counts.mostlyDisagree), backgroundColor: LIKERT_COLORS.mostlyDisagree, stack: 's' },
            { label: 'Strongly Disagree', data: this.sections.map(s => s.counts.stronglyDisagree), backgroundColor: LIKERT_COLORS.stronglyDisagree, stack: 's' },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true, ticks: { color: DARK_TICK }, grid: { color: DARK_GRID } },
            y: { stacked: true, ticks: { color: DARK_TICK }, grid: { color: DARK_GRID } },
          },
          plugins: { legend: { position: 'bottom', ...DARK_LEGEND } },
        },
      });
    }

    if (this.sectionSorted?.nativeElement) {
      const sorted = [...this.sections].sort((a, b) => b.avgScore - a.avgScore);
      this.charts['sectionSorted'] = new Chart(this.sectionSorted.nativeElement, {
        type: 'bar',
        data: {
          labels: sorted.map(s => s.section),
          datasets: [{
            label: 'Avg score (1–4)',
            data: sorted.map(s => s.avgScore),
            backgroundColor: sorted.map(s => s.avgScore >= 3 ? LIKERT_COLORS.fullyAgree : s.avgScore >= 2.5 ? LIKERT_COLORS.mostlyAgree : s.avgScore >= 2 ? LIKERT_COLORS.mostlyDisagree : LIKERT_COLORS.stronglyDisagree),
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: DARK_TICK }, grid: { color: DARK_GRID } },
            y: { min: 0, max: 4, ticks: { color: DARK_TICK }, grid: { color: DARK_GRID } },
          },
          plugins: { legend: { display: false } },
        },
      });
    }

    if (this.sectionRadar?.nativeElement) {
      this.charts['sectionRadar'] = new Chart(this.sectionRadar.nativeElement, {
        type: 'radar',
        data: {
          labels: this.sections.map(s => s.section),
          datasets: [{
            label: 'Avg score',
            data: this.sections.map(s => s.avgScore),
            backgroundColor: 'rgba(96,165,250,0.25)',
            borderColor: '#60a5fa',
            pointBackgroundColor: '#60a5fa',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              min: 0, max: 4,
              angleLines: { color: DARK_GRID },
              grid: { color: DARK_GRID },
              pointLabels: { color: DARK_LABEL, font: { size: 11 } },
              ticks: { color: DARK_TICK, backdropColor: 'transparent' },
            },
          },
          plugins: { legend: { ...DARK_LEGEND } },
        },
      });
    }
  }

  private renderDeptCharts() {
    if (!this.deptData) return;
    this.destroyChart('deptRanking');
    this.destroyChart('deptHeatmap');

    if (this.deptRanking?.nativeElement) {
      const depts = [...(this.deptData.departments || [])];
      this.charts['deptRanking'] = new Chart(this.deptRanking.nativeElement, {
        type: 'bar',
        data: {
          labels: depts.map(d => d.name),
          datasets: [{
            label: 'Avg score',
            data: depts.map(d => d.avgScore),
            backgroundColor: depts.map(d => d.avgScore >= 3 ? LIKERT_COLORS.fullyAgree : d.avgScore >= 2.5 ? LIKERT_COLORS.mostlyAgree : d.avgScore >= 2 ? LIKERT_COLORS.mostlyDisagree : LIKERT_COLORS.stronglyDisagree),
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { min: 0, max: 4, ticks: { color: DARK_TICK }, grid: { color: DARK_GRID } },
            y: { ticks: { color: DARK_LABEL }, grid: { color: DARK_GRID } },
          },
          plugins: { legend: { display: false } },
        },
      });
    }

    // Heatmap built with a matrix-style stacked bar (rows = depts, cells = sections)
    if (this.deptHeatmap?.nativeElement) {
      const depts = this.deptData.departments || [];
      const sectionKeys = (this.deptData.sections || []).map((s: any) => s.section);
      const datasets = sectionKeys.map((sec: string, idx: number) => ({
        label: sec,
        data: depts.map((d: any) => {
          const row = (this.deptData.heatmap || []).find((h: any) => h.departmentId === d.departmentId);
          return row?.sectionScores?.[sec] ?? 0;
        }),
        backgroundColor: this.heatColorPalette(idx, sectionKeys.length),
        stack: undefined,
      }));
      this.charts['deptHeatmap'] = new Chart(this.deptHeatmap.nativeElement, {
        type: 'bar',
        data: { labels: depts.map((d: any) => d.name), datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: { min: 0, max: 4, ticks: { color: DARK_TICK }, grid: { color: DARK_GRID } },
            y: { ticks: { color: DARK_LABEL }, grid: { color: DARK_GRID } },
          },
          plugins: {
            legend: { position: 'bottom', ...DARK_LEGEND },
            title: { display: true, text: 'Section avg score per department', color: DARK_LABEL },
          },
        },
      });
    }
  }

  private heatColorPalette(i: number, n: number): string {
    const hue = Math.round((i / Math.max(1, n - 1)) * 220);
    return `hsl(${hue}, 70%, 55%)`;
  }

  private renderDemographicCharts() {
    if (!this.demographics) return;
    this.destroyChart('genderDonut');
    this.destroyChart('tenureBar');
    this.destroyChart('designationBar');

    if (this.genderDonut?.nativeElement) {
      const g = this.demographics.byGender || [];
      this.charts['genderDonut'] = new Chart(this.genderDonut.nativeElement, {
        type: 'doughnut',
        data: {
          labels: g.map((x: any) => x.key),
          datasets: [{ data: g.map((x: any) => x.employees), backgroundColor: ['#60a5fa', '#f472b6', '#c084fc'] }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', ...DARK_LEGEND } } },
      });
    }

    if (this.tenureBar?.nativeElement) {
      const t = this.demographics.byTenure || [];
      this.charts['tenureBar'] = new Chart(this.tenureBar.nativeElement, {
        type: 'bar',
        data: {
          labels: t.map((x: any) => x.key),
          datasets: [{ label: 'Avg score', data: t.map((x: any) => x.avgScore), backgroundColor: '#38bdf8' }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: DARK_TICK }, grid: { color: DARK_GRID } },
            y: { min: 0, max: 4, ticks: { color: DARK_TICK }, grid: { color: DARK_GRID } },
          },
          plugins: { legend: { display: false } },
        },
      });
    }

    if (this.designationBar?.nativeElement) {
      const d = (this.demographics.byDesignation || []).slice(0, 12);
      this.charts['designationBar'] = new Chart(this.designationBar.nativeElement, {
        type: 'bar',
        data: {
          labels: d.map((x: any) => x.key),
          datasets: [{ label: 'Avg score', data: d.map((x: any) => x.avgScore), backgroundColor: '#a78bfa' }],
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          scales: {
            x: { min: 0, max: 4, ticks: { color: DARK_TICK }, grid: { color: DARK_GRID } },
            y: { ticks: { color: DARK_LABEL }, grid: { color: DARK_GRID } },
          },
          plugins: { legend: { display: false } },
        },
      });
    }
  }

  private renderScatter() {
    if (!this.scatter.length || !this.atRiskScatter?.nativeElement) return;
    this.destroyChart('atRiskScatter');
    // Color by department: assign each unique dept a stable hue.
    const deptIds = Array.from(new Set(this.scatter.map(p => p.departmentId ?? -1)));
    const colorFor = (id: number) => `hsl(${(deptIds.indexOf(id) * 47) % 360}, 70%, 55%)`;
    this.charts['atRiskScatter'] = new Chart(this.atRiskScatter.nativeElement, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Employees',
          data: this.scatter.map(p => ({ x: p.tenureYears, y: p.avgScore, _meta: p })) as any,
          backgroundColor: this.scatter.map(p => colorFor(p.departmentId ?? -1)),
          pointRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: 'Tenure (years)', color: DARK_LABEL },
            ticks: { color: DARK_TICK }, grid: { color: DARK_GRID },
          },
          y: {
            title: { display: true, text: 'Avg score (1–4)', color: DARK_LABEL },
            min: 0, max: 4,
            ticks: { color: DARK_TICK }, grid: { color: DARK_GRID },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const m = ctx.raw?._meta;
                return m ? `${m.name} • ${m.department} • ${m.avgScore}` : '';
              },
            },
          },
        },
      },
    });
  }

  private renderPendingChart() {
    if (!this.pending || !this.pendingByDept?.nativeElement) return;
    this.destroyChart('pendingByDept');
    const rows = this.pending.perDepartment || [];
    this.charts['pendingByDept'] = new Chart(this.pendingByDept.nativeElement, {
      type: 'bar',
      data: {
        labels: rows.map((x: any) => x.name),
        datasets: [{ label: 'Pending drafts', data: rows.map((x: any) => x.count), backgroundColor: '#f59e0b' }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: DARK_TICK }, grid: { color: DARK_GRID } },
          y: { ticks: { color: DARK_LABEL }, grid: { color: DARK_GRID } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  private renderDrillCharts() {
    if (!this.drillData) return;
    this.destroyChart('drillDonut');
    this.destroyChart('drillByDept');

    if (this.drillDonut?.nativeElement) {
      const c = this.drillData.counts;
      this.charts['drillDonut'] = new Chart(this.drillDonut.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Fully Agree', 'Mostly Agree', 'Mostly Disagree', 'Strongly Disagree'],
          datasets: [{
            data: [c.fullyAgree, c.mostlyAgree, c.mostlyDisagree, c.stronglyDisagree],
            backgroundColor: [LIKERT_COLORS.fullyAgree, LIKERT_COLORS.mostlyAgree, LIKERT_COLORS.mostlyDisagree, LIKERT_COLORS.stronglyDisagree],
          }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', ...DARK_LEGEND } } },
      });
    }

    if (this.drillByDept?.nativeElement) {
      const depts = this.drillData.byDepartment || [];
      this.charts['drillByDept'] = new Chart(this.drillByDept.nativeElement, {
        type: 'bar',
        data: {
          labels: depts.map((d: any) => d.name),
          datasets: [
            { label: 'Fully Agree', data: depts.map((d: any) => d.counts.fullyAgree), backgroundColor: LIKERT_COLORS.fullyAgree, stack: 's' },
            { label: 'Mostly Agree', data: depts.map((d: any) => d.counts.mostlyAgree), backgroundColor: LIKERT_COLORS.mostlyAgree, stack: 's' },
            { label: 'Mostly Disagree', data: depts.map((d: any) => d.counts.mostlyDisagree), backgroundColor: LIKERT_COLORS.mostlyDisagree, stack: 's' },
            { label: 'Strongly Disagree', data: depts.map((d: any) => d.counts.stronglyDisagree), backgroundColor: LIKERT_COLORS.stronglyDisagree, stack: 's' },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true, ticks: { color: DARK_TICK }, grid: { color: DARK_GRID } },
            y: { stacked: true, ticks: { color: DARK_LABEL }, grid: { color: DARK_GRID } },
          },
          plugins: { legend: { position: 'bottom', ...DARK_LEGEND } },
        },
      });
    }
  }

  // ====================================================================
  // UI helpers
  // ====================================================================
  scoreColor(s: number): 'success' | 'info' | 'warn' | 'danger' {
    if (s >= 3) return 'success';
    if (s >= 2.5) return 'info';
    if (s >= 2) return 'warn';
    return 'danger';
  }

  deltaIcon(delta: number | null): string {
    if (delta == null) return '';
    if (delta > 0) return '▲';
    if (delta < 0) return '▼';
    return '◆';
  }
  deltaClass(delta: number | null): string {
    if (delta == null) return 'text-gray-500';
    if (delta > 0) return 'text-green-600';
    if (delta < 0) return 'text-red-600';
    return 'text-gray-500';
  }

  defaultPhoto(gender?: string | null): string {
    return (gender?.toUpperCase?.() === 'FEMALE') ? '/img-women.png' : '/img.png';
  }
}
