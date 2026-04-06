import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { PipService } from '../../services/pip/pip.service';

@Component({
  selector: 'app-pip-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, ToastModule, DialogModule,
    InputTextModule, TextareaModule, SelectModule,
    TooltipModule, DatePickerModule, DividerModule,
    ModuleGuide,
  ],
  templateUrl: './pip-overview.html',
  styleUrl: './pip-overview.css',
  providers: [MessageService],
})
export class PipOverview implements OnInit {
  loggedEmpId = Number(localStorage.getItem('empId')) || 0;

  activeTab: 'underperformers' | 'pips' | 'logs' | 'templates' = 'underperformers';
  loading = false;

  // ── Underperformers ────────────────────────────────────────────────────────
  selectedMonth = '';
  maxMonth = '';
  monthOptions: { label: string; value: string }[] = [];
  underperformers: any[] = [];
  selectedEmployees: any[] = [];

  // ── Templates ──────────────────────────────────────────────────────────────
  templates: any[] = [];
  warningTemplates: any[] = [];
  pipTemplates: any[] = [];
  closureTemplates: any[] = [];
  extensionTemplates: any[] = [];
  terminationTemplates: any[] = [];

  // ── Warning dialog ─────────────────────────────────────────────────────────
  warningDialogVisible = false;
  selectedTemplateId: number | null = null;
  sendingWarning = false;

  // ── Preview dialog ─────────────────────────────────────────────────────────
  previewDialogVisible = false;
  previewSubject = '';
  previewBody = '';

  // ── PIP list ───────────────────────────────────────────────────────────────
  pipList: any[] = [];
  pipStatusFilter = '';
  pipStatusOptions = [
    { label: 'All', value: '' },
    { label: 'Warning Issued', value: 'WARNING_ISSUED' },
    { label: 'PIP Active', value: 'PIP_ACTIVE' },
    { label: 'PIP Extended', value: 'PIP_EXTENDED' },
    { label: 'Closed (Improved)', value: 'PIP_CLOSED_IMPROVED' },
    { label: 'Termination Initiated', value: 'TERMINATION_INITIATED' },
    { label: 'Terminated', value: 'TERMINATED' },
  ];

  // ── PIP detail dialog ──────────────────────────────────────────────────────
  detailDialogVisible = false;
  selectedPIP: any = null;

  // ── Initiate PIP dialog ────────────────────────────────────────────────────
  initiatePIPDialogVisible = false;
  initTargets: string[] = [];
  newTarget = '';
  initiateTemplateId: number | null = null;

  // ── Weekly review dialog ───────────────────────────────────────────────────
  reviewDialogVisible = false;
  reviewData = { weekNumber: 1, reviewDate: null as any, status: 'ONGOING', remarks: '' };
  reviewStatusOptions = [
    { label: 'Ongoing', value: 'ONGOING' },
    { label: 'Improved', value: 'IMPROVED' },
    { label: 'Not Improved', value: 'NOT_IMPROVED' },
  ];

  // ── Close PIP dialog ───────────────────────────────────────────────────────
  closePIPDialogVisible = false;
  closureTemplateId: number | null = null;
  sendClosureEmail = true;

  // ── Extend PIP dialog ──────────────────────────────────────────────────────
  extendPIPDialogVisible = false;
  extensionTemplateId: number | null = null;
  sendExtensionEmail = true;

  // ── Terminate dialog ───────────────────────────────────────────────────────
  terminateDialogVisible = false;
  terminationReason = '';
  noticePeriodOverride: number | null = null;
  terminationTemplateId: number | null = null;
  sendTerminationEmail = true;

  // ── Email logs ─────────────────────────────────────────────────────────────
  emailLogs: any[] = [];

  // ── Response dialogs ───────────────────────────────────────────────────────
  responsesDialogVisible = false;
  pipResponses: any[] = [];
  loadingResponses = false;
  logResponseDialogVisible = false;
  manualResponseText = '';
  savingResponse = false;

  // ── Template editor dialog ─────────────────────────────────────────────────
  templateDialogVisible = false;
  editingTemplate: any = null;
  templateForm = { name: '', type: '', subject: '', body: '', cc: '', bcc: '' };
  templateTypeOptions = [
    { label: 'Warning', value: 'WARNING' },
    { label: 'PIP Initiation', value: 'PIP_INITIATION' },
    { label: 'Weekly Review', value: 'PIP_WEEKLY_REVIEW' },
    { label: 'PIP Extension', value: 'PIP_EXTENSION' },
    { label: 'PIP Closure', value: 'PIP_CLOSURE' },
    { label: 'Termination Notice', value: 'TERMINATION_NOTICE' },
  ];
  placeholders = [
    '{{employeeName}}','{{employeeCode}}','{{department}}','{{designation}}',
    '{{monthlyScore}}','{{triggerMonth}}','{{pipStartDate}}','{{pipEndDate}}',
    '{{warningDate}}','{{responseDeadline}}','{{weekNumber}}','{{reviewDate}}',
    '{{noticePeriodDays}}','{{lastWorkingDay}}','{{currentDate}}','{{hospitalName}}',
  ];

  constructor(private pipService: PipService, private msg: MessageService) {}

  ngOnInit() {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.maxMonth = this.selectedMonth;
    this.buildMonthOptions();
    this.loadTemplates();
    this.loadUnderperformers();
  }

  buildMonthOptions() {
    const now = new Date();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    this.monthOptions = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
      this.monthOptions.push({ label, value });
    }
  }

  get isCurrentMonth(): boolean {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.selectedMonth === current;
  }

  switchTab(tab: typeof this.activeTab) {
    this.activeTab = tab;
    if (tab === 'pips') this.loadPIPList();
    if (tab === 'logs') this.loadEmailLogs();
  }

  // ── Templates ──────────────────────────────────────────────────────────────
  loadTemplates() {
    this.pipService.getTemplates().subscribe({
      next: (t) => {
        this.templates = t;
        this.warningTemplates     = t.filter(x => x.type === 'WARNING' && x.isActive);
        this.pipTemplates         = t.filter(x => x.type === 'PIP_INITIATION' && x.isActive);
        this.closureTemplates     = t.filter(x => x.type === 'PIP_CLOSURE' && x.isActive);
        this.extensionTemplates   = t.filter(x => x.type === 'PIP_EXTENSION' && x.isActive);
        this.terminationTemplates = t.filter(x => x.type === 'TERMINATION_NOTICE' && x.isActive);
        if (!t.length) this.pipService.seedDefaultTemplates().subscribe(() => this.loadTemplates());
        else if (this.warningTemplates.length) this.selectedTemplateId = this.warningTemplates[0].id;
      },
    });
  }

  openTemplateDialog(t?: any) {
    this.editingTemplate = t ?? null;
    this.templateForm = t
      ? { name: t.name, type: t.type, subject: t.subject, body: t.body, cc: t.cc || '', bcc: t.bcc || '' }
      : { name: '', type: '', subject: '', body: '', cc: '', bcc: '' };
    this.templateDialogVisible = true;
  }

  saveTemplate() {
    if (!this.templateForm.name || !this.templateForm.type || !this.templateForm.subject || !this.templateForm.body) {
      this.msg.add({ severity: 'warn', summary: 'Required', detail: 'All fields are required' }); return;
    }
    const call = this.editingTemplate
      ? this.pipService.updateTemplate(this.editingTemplate.id, this.templateForm)
      : this.pipService.createTemplate({ ...this.templateForm, createdBy: this.loggedEmpId });
    call.subscribe({
      next: () => { this.templateDialogVisible = false; this.loadTemplates(); this.msg.add({ severity: 'success', summary: 'Saved', detail: 'Template saved' }); },
      error: (e) => this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }),
    });
  }

  deactivateTemplate(id: number) {
    this.pipService.deleteTemplate(id).subscribe({
      next: () => { this.loadTemplates(); this.msg.add({ severity: 'success', summary: 'Done', detail: 'Template deactivated' }); },
      error: (e) => this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }),
    });
  }

  insertPlaceholder(ph: string) { this.templateForm.body += ph; }

  // ── Underperformers ────────────────────────────────────────────────────────
  loadUnderperformers() {
    this.loading = true;
    this.selectedEmployees = [];
    this.pipService.getUnderperformers(this.selectedMonth).subscribe({
      next: (d) => { this.underperformers = d; this.loading = false; },
      error: (e) => { this.loading = false; this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }); },
    });
  }

  toggleSelection(emp: any) {
    const idx = this.selectedEmployees.findIndex(e => e.id === emp.id);
    if (idx > -1) this.selectedEmployees.splice(idx, 1);
    else this.selectedEmployees.push(emp);
  }

  isSelected(emp: any) { return this.selectedEmployees.some(e => e.id === emp.id); }

  getScoreClass(score: number) {
    if (score <= 30) return 'score-danger';
    if (score <= 40) return 'score-warn';
    return 'score-ok';
  }

  getPIPStatusClass(status: string) {
    const m: Record<string,string> = {
      WARNING_ISSUED: 'badge-warning', PIP_ACTIVE: 'badge-active',
      PIP_EXTENDED: 'badge-extended', PIP_CLOSED_IMPROVED: 'badge-improved',
      TERMINATION_INITIATED: 'badge-terminated', TERMINATED: 'badge-terminated',
    };
    return m[status] ?? 'badge-default';
  }

  getPIPStatusLabel(status: string) {
    const m: Record<string,string> = {
      WARNING_ISSUED: 'Warning Issued', PIP_ACTIVE: 'PIP Active',
      PIP_EXTENDED: 'PIP Extended', PIP_CLOSED_IMPROVED: 'Closed – Improved',
      TERMINATION_INITIATED: 'Termination Initiated', TERMINATED: 'Terminated',
    };
    return m[status] ?? status;
  }

  // ── Warning email ──────────────────────────────────────────────────────────
  openSendWarningDialog() {
    if (!this.selectedEmployees.length) { this.msg.add({ severity: 'warn', summary: 'No Selection', detail: 'Select at least one employee' }); return; }
    if (!this.warningTemplates.length) { this.msg.add({ severity: 'warn', summary: 'No Templates', detail: 'No warning templates found. Go to Templates tab.' }); return; }
    this.selectedTemplateId = this.warningTemplates[0].id;
    this.warningDialogVisible = true;
  }

  previewEmail(templateId: number | null, emp: any, pip?: any) {
    if (!templateId || !emp) return;
    this.pipService.previewEmail(templateId, emp.id, emp.monthlyAvgScore, pip?.id).subscribe({
      next: (p) => { this.previewSubject = p.subject; this.previewBody = p.body; this.previewDialogVisible = true; },
      error: (e) => this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }),
    });
  }

  sendWarning() {
    if (!this.selectedTemplateId) { this.msg.add({ severity: 'warn', summary: 'Required', detail: 'Select a template' }); return; }
    this.sendingWarning = true;
    this.pipService.sendWarning({
      employees: this.selectedEmployees.map(e => ({ employeeId: e.id, triggerScore: e.monthlyAvgScore })),
      templateId: this.selectedTemplateId,
      triggerMonth: this.selectedMonth,
      sentBy: this.loggedEmpId,
    }).subscribe({
      next: (res) => {
        this.sendingWarning = false;
        this.warningDialogVisible = false;
        const s = res.sent?.length ?? 0, f = res.failed?.length ?? 0;
        this.msg.add({ severity: s > 0 ? 'success' : 'warn', summary: 'Done', detail: `${s} email(s) sent${f ? ', ' + f + ' failed' : ''}` });
        this.loadUnderperformers();
        this.selectedEmployees = [];
      },
      error: (e) => { this.sendingWarning = false; this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }); },
    });
  }

  // ── PIP list ───────────────────────────────────────────────────────────────
  loadPIPList() {
    this.loading = true;
    const filters: any = {};
    if (this.pipStatusFilter) filters.status = this.pipStatusFilter;
    this.pipService.getPIPList(filters).subscribe({
      next: (d) => { this.pipList = d; this.loading = false; },
      error: (e) => { this.loading = false; this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }); },
    });
  }

  openPIPDetail(pip: any) {
    this.pipService.getPIPDetail(pip.id).subscribe({
      next: (d) => { this.selectedPIP = d; this.detailDialogVisible = true; },
      error: (e) => this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }),
    });
  }

  // ── Initiate PIP ───────────────────────────────────────────────────────────
  openInitiatePIPDialog(pip: any) {
    this.selectedPIP = pip;
    this.initTargets = Array.isArray(pip.targets) ? [...pip.targets] : [];
    this.newTarget = '';
    this.initiateTemplateId = this.pipTemplates[0]?.id ?? null;
    this.initiatePIPDialogVisible = true;
  }

  addTarget() { if (this.newTarget.trim()) { this.initTargets.push(this.newTarget.trim()); this.newTarget = ''; } }
  removeTarget(i: number) { this.initTargets.splice(i, 1); }

  initiatePIP() {
    this.pipService.initiatePIP({ pipId: this.selectedPIP.id, targets: this.initTargets, initiatedBy: this.loggedEmpId }).subscribe({
      next: () => {
        this.initiatePIPDialogVisible = false;
        this.msg.add({ severity: 'success', summary: 'PIP Started', detail: '30-day PIP initiated' });
        if (this.initiateTemplateId) this.previewEmail(this.initiateTemplateId, this.selectedPIP.employee, this.selectedPIP);
        this.loadPIPList();
      },
      error: (e) => this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }),
    });
  }

  // ── Weekly review ──────────────────────────────────────────────────────────
  openWeeklyReviewDialog(pip: any) {
    this.selectedPIP = pip;
    this.reviewData = { weekNumber: (pip.weeklyReviews?.length ?? 0) + 1, reviewDate: new Date(), status: 'ONGOING', remarks: '' };
    this.reviewDialogVisible = true;
  }

  saveWeeklyReview() {
    if (!this.reviewData.reviewDate) { this.msg.add({ severity: 'warn', summary: 'Required', detail: 'Review date is required' }); return; }
    this.pipService.addWeeklyReview(this.selectedPIP.id, { ...this.reviewData, reviewedBy: this.loggedEmpId }).subscribe({
      next: (res) => {
        this.reviewDialogVisible = false;
        const extra = res.autoFetchedScore !== null ? ` (Auto score: ${res.autoFetchedScore}/100)` : '';
        this.msg.add({ severity: 'success', summary: 'Review Saved', detail: `Week ${this.reviewData.weekNumber} saved${extra}` });
        this.loadPIPList();
      },
      error: (e) => this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }),
    });
  }

  // ── Close PIP ──────────────────────────────────────────────────────────────
  openClosePIPDialog(pip: any) {
    this.selectedPIP = pip;
    this.closureTemplateId = this.closureTemplates[0]?.id ?? null;
    this.sendClosureEmail = true;
    this.closePIPDialogVisible = true;
  }

  confirmClosePIP() {
    this.pipService.closePIP(this.selectedPIP.id, { closedBy: this.loggedEmpId, sendEmail: this.sendClosureEmail, templateId: this.closureTemplateId }).subscribe({
      next: () => { this.closePIPDialogVisible = false; this.msg.add({ severity: 'success', summary: 'PIP Closed', detail: 'Employee marked as improved' }); this.loadPIPList(); },
      error: (e) => this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }),
    });
  }

  // ── Extend PIP ─────────────────────────────────────────────────────────────
  openExtendPIPDialog(pip: any) {
    this.selectedPIP = pip;
    this.extensionTemplateId = this.extensionTemplates[0]?.id ?? null;
    this.sendExtensionEmail = true;
    this.extendPIPDialogVisible = true;
  }

  confirmExtendPIP() {
    this.pipService.extendPIP(this.selectedPIP.id, { extendedBy: this.loggedEmpId, sendEmail: this.sendExtensionEmail, templateId: this.extensionTemplateId }).subscribe({
      next: () => { this.extendPIPDialogVisible = false; this.msg.add({ severity: 'success', summary: 'Extended', detail: '30 more days added' }); this.loadPIPList(); },
      error: (e) => this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }),
    });
  }

  // ── Terminate ──────────────────────────────────────────────────────────────
  openTerminateDialog(pip: any) {
    this.selectedPIP = pip;
    this.terminationReason = '';
    this.noticePeriodOverride = null;
    this.terminationTemplateId = this.terminationTemplates[0]?.id ?? null;
    this.sendTerminationEmail = true;
    this.terminateDialogVisible = true;
  }

  confirmTerminate() {
    if (!this.terminationReason.trim()) { this.msg.add({ severity: 'warn', summary: 'Required', detail: 'Termination reason is required' }); return; }
    this.pipService.terminatePIP(this.selectedPIP.id, {
      terminationReason: this.terminationReason, sentBy: this.loggedEmpId,
      sendEmail: this.sendTerminationEmail, templateId: this.terminationTemplateId,
      noticePeriodDaysOverride: this.noticePeriodOverride,
    }).subscribe({
      next: (res) => {
        this.terminateDialogVisible = false;
        this.msg.add({ severity: 'info', summary: 'Termination Initiated', detail: `Notice: ${res.noticePeriodDays} days. Last working day: ${res.lastWorkingDay}` });
        this.loadPIPList();
      },
      error: (e) => this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }),
    });
  }

  // ── Email logs ─────────────────────────────────────────────────────────────
  loadEmailLogs() {
    this.loading = true;
    this.pipService.getEmailLogs().subscribe({
      next: (d) => { this.emailLogs = d; this.loading = false; },
      error: (e) => { this.loading = false; this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }); },
    });
  }

  // ── PIP Responses ──────────────────────────────────────────────────────────
  openResponsesDialog(pip: any) {
    this.selectedPIP = pip;
    this.pipResponses = [];
    this.responsesDialogVisible = true;
    this.loadPIPResponses(pip.id);
  }

  loadPIPResponses(pipId: number) {
    this.loadingResponses = true;
    this.pipService.getPIPResponses(pipId).subscribe({
      next: (d) => { this.pipResponses = d; this.loadingResponses = false; },
      error: (e) => { this.loadingResponses = false; this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }); },
    });
  }

  openLogResponseDialog(pip: any) {
    this.selectedPIP = pip;
    this.manualResponseText = '';
    this.logResponseDialogVisible = true;
  }

  saveManualResponse() {
    if (!this.manualResponseText.trim()) {
      this.msg.add({ severity: 'warn', summary: 'Required', detail: 'Response text is required' }); return;
    }
    this.savingResponse = true;
    this.pipService.logManualResponse(this.selectedPIP.id, {
      employeeId: this.selectedPIP.employeeId,
      responseText: this.manualResponseText,
    }).subscribe({
      next: () => {
        this.savingResponse = false;
        this.logResponseDialogVisible = false;
        this.msg.add({ severity: 'success', summary: 'Logged', detail: 'Employee response recorded' });
        if (this.responsesDialogVisible) this.loadPIPResponses(this.selectedPIP.id);
      },
      error: (e) => { this.savingResponse = false; this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }); },
    });
  }

  acknowledgeResponse(response: any) {
    this.pipService.acknowledgeResponse(response.id, this.loggedEmpId).subscribe({
      next: () => {
        response.acknowledgedBy = this.loggedEmpId;
        response.acknowledgedAt = new Date().toISOString();
        this.msg.add({ severity: 'success', summary: 'Acknowledged', detail: 'Response marked as read' });
      },
      error: (e) => this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.error }),
    });
  }

  fmtDate(d: string | Date | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getReviewStatusClass(status: string) {
    if (status === 'IMPROVED') return 'badge-improved';
    if (status === 'NOT_IMPROVED') return 'badge-terminated';
    return 'badge-warning';
  }
}
