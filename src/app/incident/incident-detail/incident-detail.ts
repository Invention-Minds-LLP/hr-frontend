import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { Incident } from '../../services/incident/incident';
import { Employees } from '../../services/employees/employees';

/**
 * Incident Detail — the main investigation workspace.
 *
 * One component, several panels:
 *   • Header — title, severity, status, assignee
 *   • Workflow — quick-action buttons to advance status
 *   • Tabs — Overview · Comments · Witnesses · Attachments · CAPA · RCA · Links · Audit
 *
 * Loads the incident in full on init via GET /incidents/:id, then issues
 * targeted PATCH / sub-resource calls as the user acts.
 */
@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ToastModule, ConfirmDialogModule, CardModule, ButtonModule,
    InputTextModule, TextareaModule, SelectModule, CheckboxModule,
    DatePickerModule, TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './incident-detail.html',
  styleUrl: './incident-detail.css',
})
export class IncidentDetail implements OnInit, OnChanges {
  @Input() incidentId!: number;
  @Output() back = new EventEmitter<void>();

  /* ── State ─────────────────────────────────────── */
  incident: any = null;
  loading = false;

  // Tab activation
  activeTab = 0;

  // Status / outcome / assignee inline edit
  newStatus: string | null = null;
  newOutcome: string | null = null;
  newAssigneeId: number | null = null;
  rootCause = '';
  actionTaken = '';
  preventiveAction = '';

  // Comment composer
  newComment = '';
  newCommentInternal = false;

  // Witness composer
  newWitness: any = { witnessName: '', contactInfo: '', statement: '' };

  // Attachment composer
  newAttachment: any = { fileName: '', fileUrl: '' };

  // CAPA composer
  capaList: any[] = [];
  newCAPA: any = { type: 'CORRECTIVE', description: '', ownerId: null, dueDate: null };

  // RCA composer
  rca: any = null;
  rcaMethod: 'FIVE_WHY' | 'FISHBONE' = 'FIVE_WHY';
  rcaForm: any = {
    problemStatement: '',
    why1: '', why2: '', why3: '', why4: '', why5: '',
    causesPeople: '', causesProcess: '', causesEquipment: '',
    causesEnvironment: '', causesMaterial: '', causesMethod: '',
    rootCauseSummary: '',
  };

  // Linked
  links: { parent: any; children: any[] } = { parent: null, children: [] };
  newLinkParentId: number | null = null;

  // Reference data
  categories: any[] = [];
  employees: { label: string; value: number }[] = [];

  /* ── Constants ─────────────────────────────────── */
  statusOptions = [
    'OPEN','ACKNOWLEDGED','INVESTIGATING','ESCALATED','RESOLVED','CLOSED','REJECTED','DUPLICATE','WITHDRAWN',
  ].map((v) => ({ label: v, value: v }));
  outcomeOptions = [
    { label: '—',                          value: null },
    { label: 'Substantiated (proven)',     value: 'SUBSTANTIATED' },
    { label: 'Partially substantiated',    value: 'PARTIALLY_SUBSTANTIATED' },
    { label: 'Unsubstantiated (unproven)', value: 'UNSUBSTANTIATED' },
    { label: 'False report (malicious)',   value: 'FALSE_REPORT' },
    { label: 'Withdrawn',                  value: 'WITHDRAWN' },
    { label: 'Duplicate',                  value: 'DUPLICATE' },
    { label: 'Not a violation',            value: 'NOT_A_VIOLATION' },
  ];
  rcaMethodOptions = [
    { label: '5-Why (chain)',           value: 'FIVE_WHY' },
    { label: 'Fishbone (categorical)',  value: 'FISHBONE' },
  ];
  capaTypeOptions = [
    { label: 'Corrective (fix what happened)',    value: 'CORRECTIVE' },
    { label: 'Preventive (stop it from recurring)', value: 'PREVENTIVE' },
  ];
  capaStatusOptions = ['PENDING','IN_PROGRESS','DONE','CANCELLED']
    .map((v) => ({ label: v, value: v }));

  private api    = inject(Incident);
  private employeeService = inject(Employees);
  private toast  = inject(MessageService);
  private confirm = inject(ConfirmationService);

  ngOnInit() {
    this.load();
    this.loadEmployees();
  }

  /** Resolve an employee id to a friendly label, or fall back to "#id". */
  employeeLabel(id: number | null | undefined): string {
    if (!id) return '';
    const found = this.employees.find((e) => e.value === id);
    return found ? found.label : `#${id}`;
  }

  private loadEmployees() {
    this.employeeService.getActiveEmployees().subscribe({
      next: (rows: any[]) => {
        this.employees = (rows ?? []).map((e) => ({
          label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
          value: e.id,
        }));
      },
      error: () => { this.employees = []; },
    });
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['incidentId'] && !changes['incidentId'].firstChange) this.load();
  }

  /* ─── Load all detail data ────────────────────── */
  private load() {
    if (!this.incidentId) return;
    this.loading = true;
    this.api.getIncident(this.incidentId).subscribe({
      next: (inc) => {
        this.incident = inc;
        this.newStatus    = inc?.status   ?? null;
        this.newOutcome   = inc?.outcome  ?? null;
        this.newAssigneeId = inc?.assignedTo ?? null;
        this.rootCause        = inc?.rootCause       ?? '';
        this.actionTaken      = inc?.actionTaken     ?? '';
        this.preventiveAction = inc?.preventiveAction ?? '';
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.showError('Failed to load incident', err);
      },
    });
    this.loadCAPA();
    this.loadRCA();
    this.loadLinks();
  }

  loadCAPA() {
    this.api.listCAPA(this.incidentId).subscribe({
      next: (rows) => { this.capaList = rows ?? []; },
      error: () => { this.capaList = []; },
    });
  }
  loadRCA() {
    this.api.getRCA(this.incidentId).subscribe({
      next: (rca) => {
        this.rca = rca;
        if (rca) {
          this.rcaMethod = rca.method ?? 'FIVE_WHY';
          this.rcaForm = {
            problemStatement: rca.problemStatement ?? '',
            why1: rca.why1 ?? '', why2: rca.why2 ?? '', why3: rca.why3 ?? '',
            why4: rca.why4 ?? '', why5: rca.why5 ?? '',
            causesPeople:      rca.causesPeople ?? '',
            causesProcess:     rca.causesProcess ?? '',
            causesEquipment:   rca.causesEquipment ?? '',
            causesEnvironment: rca.causesEnvironment ?? '',
            causesMaterial:    rca.causesMaterial ?? '',
            causesMethod:      rca.causesMethod ?? '',
            rootCauseSummary:  rca.rootCauseSummary ?? '',
          };
        }
      },
      error: () => { this.rca = null; },
    });
  }
  loadLinks() {
    this.api.getLinks(this.incidentId).subscribe({
      next: (l) => { this.links = l ?? { parent: null, children: [] }; },
      error: () => { this.links = { parent: null, children: [] }; },
    });
  }

  /* ─── Workflow / status / outcome ───────────── */
  saveCoreUpdate() {
    const body: any = {};
    if (this.newStatus    !== this.incident.status)     body.status   = this.newStatus;
    if (this.newOutcome   !== this.incident.outcome)    body.outcome  = this.newOutcome;
    if (this.newAssigneeId !== this.incident.assignedTo) body.assignedTo = this.newAssigneeId;
    if (this.rootCause        !== (this.incident.rootCause ?? '')) body.rootCause = this.rootCause;
    if (this.actionTaken      !== (this.incident.actionTaken ?? '')) body.actionTaken = this.actionTaken;
    if (this.preventiveAction !== (this.incident.preventiveAction ?? '')) body.preventiveAction = this.preventiveAction;

    if (Object.keys(body).length === 0) {
      this.toast.add({ severity: 'info', summary: 'Nothing to save', detail: 'No changes detected.' });
      return;
    }
    this.api.updateIncident(this.incidentId, body).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Incident updated.' });
        this.load();
      },
      error: (err) => this.showError('Save failed', err),
    });
  }

  /* ─── Comments ─────────────────────────────── */
  postComment() {
    if (!this.newComment.trim()) return;
    this.api.addComment(this.incidentId, this.newComment.trim(), this.newCommentInternal).subscribe({
      next: () => {
        this.newComment = ''; this.newCommentInternal = false;
        this.load();
        this.toast.add({ severity: 'success', summary: 'Comment posted' });
      },
      error: (err) => this.showError('Comment failed', err),
    });
  }

  /* ─── Witnesses ─────────────────────────────── */
  postWitness() {
    if (!this.newWitness.witnessName?.trim() && !this.newWitness.witnessEmpId) {
      this.toast.add({ severity: 'warn', summary: 'Witness name or employee required' });
      return;
    }
    this.api.addWitness(this.incidentId, { ...this.newWitness }).subscribe({
      next: () => {
        this.newWitness = { witnessName: '', contactInfo: '', statement: '' };
        this.load();
        this.toast.add({ severity: 'success', summary: 'Witness added' });
      },
      error: (err) => this.showError('Add failed', err),
    });
  }

  /* ─── Attachments ───────────────────────────── */
  postAttachment() {
    if (!this.newAttachment.fileName.trim() || !this.newAttachment.fileUrl.trim()) {
      this.toast.add({ severity: 'warn', summary: 'File name + URL required' });
      return;
    }
    this.api.addAttachment(this.incidentId, this.newAttachment).subscribe({
      next: () => {
        this.newAttachment = { fileName: '', fileUrl: '' };
        this.load();
        this.toast.add({ severity: 'success', summary: 'Attachment added' });
      },
      error: (err) => this.showError('Upload failed', err),
    });
  }
  deleteAttachment(id: number) {
    this.confirm.confirm({
      message: 'Remove this attachment?',
      accept: () => {
        this.api.deleteAttachment(id).subscribe({
          next: () => { this.load(); this.toast.add({ severity: 'success', summary: 'Removed' }); },
          error: (err) => this.showError('Delete failed', err),
        });
      },
    });
  }

  /* ─── CAPA ──────────────────────────────────── */
  createCAPA() {
    if (!this.newCAPA.description?.trim()) {
      this.toast.add({ severity: 'warn', summary: 'CAPA description required' });
      return;
    }
    this.api.createCAPA(this.incidentId, {
      type:        this.newCAPA.type,
      description: this.newCAPA.description.trim(),
      ownerId:     this.newCAPA.ownerId ?? undefined,
      dueDate:     this.newCAPA.dueDate ? new Date(this.newCAPA.dueDate).toISOString() : undefined,
    }).subscribe({
      next: () => {
        this.newCAPA = { type: 'CORRECTIVE', description: '', ownerId: null, dueDate: null };
        this.loadCAPA();
        this.toast.add({ severity: 'success', summary: 'CAPA added' });
      },
      error: (err) => this.showError('Add failed', err),
    });
  }
  updateCAPAStatus(c: any, status: string) {
    this.api.updateCAPA(c.id, { status }).subscribe({
      next: () => { this.loadCAPA(); this.toast.add({ severity: 'success', summary: 'CAPA updated' }); },
      error: (err) => this.showError('Update failed', err),
    });
  }
  removeCAPA(c: any) {
    this.confirm.confirm({
      message: `Delete this CAPA action?`,
      accept: () => {
        this.api.deleteCAPA(c.id).subscribe({
          next: () => { this.loadCAPA(); this.toast.add({ severity: 'success', summary: 'CAPA removed' }); },
          error: (err) => this.showError('Delete failed', err),
        });
      },
    });
  }

  /* ─── RCA ──────────────────────────────────── */
  saveRCA() {
    const payload: any = { method: this.rcaMethod, ...this.rcaForm };
    this.api.saveRCA(this.incidentId, payload).subscribe({
      next: () => { this.loadRCA(); this.toast.add({ severity: 'success', summary: 'RCA saved' }); },
      error: (err) => this.showError('Save failed', err),
    });
  }

  /* ─── Linked incidents ─────────────────────── */
  linkParent() {
    const parentId = Number(this.newLinkParentId);
    if (!parentId) return;
    this.api.linkIncident(this.incidentId, parentId).subscribe({
      next: () => {
        this.newLinkParentId = null;
        this.loadLinks();
        this.toast.add({ severity: 'success', summary: 'Linked' });
      },
      error: (err) => this.showError('Link failed', err),
    });
  }
  unlinkParent() {
    this.api.unlinkIncident(this.incidentId).subscribe({
      next: () => { this.loadLinks(); this.toast.add({ severity: 'success', summary: 'Unlinked' }); },
      error: (err) => this.showError('Unlink failed', err),
    });
  }

  /* ─── Helpers ──────────────────────────────── */
  severityClass(s: string): string {
    switch (s) {
      case 'CRITICAL': return 'sev-critical';
      case 'HIGH':     return 'sev-high';
      case 'MEDIUM':   return 'sev-medium';
      case 'LOW':      return 'sev-low';
      default:         return 'sev-medium';
    }
  }
  statusClass(s: string): string {
    switch (s) {
      case 'CLOSED':   case 'RESOLVED':   return 'st-good';
      case 'ESCALATED':                   return 'st-danger';
      case 'INVESTIGATING':
      case 'ACKNOWLEDGED':                return 'st-info';
      case 'REJECTED':  case 'DUPLICATE':
      case 'WITHDRAWN':                   return 'st-neutral';
      default:                            return 'st-warn';
    }
  }
  outcomeLabel(o: string): string {
    return this.outcomeOptions.find((x) => x.value === o)?.label ?? '—';
  }

  private showError(summary: string, err: any) {
    console.error(summary, err);
    const detail = err?.error?.error || err?.message || 'Please try again.';
    this.toast.add({ severity: 'error', summary, detail });
  }

  goBack() { this.back.emit(); }
}
