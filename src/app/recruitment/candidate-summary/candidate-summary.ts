import { Component, Input, OnInit, inject } from '@angular/core';
import { Recuriting } from '../../services/recruiting/recuriting';
import { Card } from 'primeng/card';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tag } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { Chip } from 'primeng/chip';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';

type RefStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'UNREACHABLE' | 'FLAGGED';
type BgvCheckStatus = 'PENDING' | 'CLEAR' | 'DISCREPANCY' | 'DISCREPANCY_RESOLVED' | 'FAILED' | 'SKIPPED';

@Component({
  selector: 'app-candidate-summary',
  standalone: true,
  imports: [
    Card, CommonModule, FormsModule, Tag, TimelineModule, Chip,
    ButtonModule, InputTextModule, TextareaModule, SelectModule,
    TableModule, TooltipModule, ConfirmDialogModule, ToastModule, DialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './candidate-summary.html',
  styleUrl: './candidate-summary.css'
})
export class CandidateSummary implements OnInit {
  @Input() applicationId!: number;
  summary: any;

  // ─────────── References ───────────
  references: any[] = [];
  loadingRefs = false;
  newRef = { refereeName: '', refereeRelation: '', refereeCompany: '', refereeEmail: '', refereePhone: '' };
  showAddRef = false;
  // Per-row in-progress edit state for "record check"
  refCheckEdit: Record<number, { status: RefStatus; feedback: string; rating: number | null }> = {};

  refStatusOptions = [
    { label: 'Pending',      value: 'PENDING' },
    { label: 'In Progress',  value: 'IN_PROGRESS' },
    { label: 'Done',         value: 'DONE' },
    { label: 'Unreachable',  value: 'UNREACHABLE' },
    { label: 'Flagged',      value: 'FLAGGED' },
  ];

  // ─────────── BGV ───────────
  bgv: any = null;
  loadingBgv = false;
  bgvDocs: any[] = [];
  showAddDoc = false;

  // BGV document upload — type dropdown mirrors the employee-doc taxonomy so the
  // doc links cleanly onto the employee record on join; "Other" allows free text.
  docTypeOptions = [
    { label: 'Aadhaar Card', value: 'AADHAAR' },
    { label: 'PAN Card', value: 'PAN' },
    { label: 'Passport', value: 'PASSPORT' },
    { label: 'SSLC Certificate', value: 'SSLC' },
    { label: 'PU Certificate', value: 'PU' },
    { label: 'Degree Certificate', value: 'DEGREE' },
    { label: 'Diploma Certificate', value: 'DIPLOMA' },
    { label: 'Employment Contract', value: 'EMPLOYMENT_CONTRACT' },
    { label: 'Offer Letter', value: 'OFFER_LETTER' },
    { label: 'Experience / Relieving Letter', value: 'EXPERIENCE' },
    { label: 'Registration Certificate', value: 'REGISTRATION_CERT' },
    { label: 'Salary Certificate', value: 'SALARY_CERT' },
    { label: 'Verification Certificate', value: 'VERIFICATION_CERT' },
    { label: 'Bank Document', value: 'BANK' },
    { label: 'Other…', value: 'OTHER' },
  ];
  docSelectedType = '';
  docOtherType = '';
  docFile: File | null = null;
  docUploading = false;
  // Per-check inline edit state
  bgvEdit: Record<number, { status: BgvCheckStatus; evidenceUrl: string; note: string }> = {};
  // Discrepancy resolution dialog
  resolveDialogOpen = false;
  resolveTargetCheck: any = null;
  resolveNote = '';
  // BGV completion
  completeNote = '';
  completeReportUrl = '';

  bgvCheckTypes = [
    { label: 'Identity',    value: 'IDENTITY' },
    { label: 'Education',   value: 'EDUCATION' },
    { label: 'Employment',  value: 'EMPLOYMENT' },
    { label: 'Address',     value: 'ADDRESS' },
    { label: 'Criminal',    value: 'CRIMINAL' },
    { label: 'Drug',        value: 'DRUG' },
    { label: 'Reference',   value: 'REFERENCE' },
    { label: 'Credit',      value: 'CREDIT' },
  ];
  bgvCheckStatusOptions = [
    { label: 'Pending',               value: 'PENDING' },
    { label: 'Clear',                 value: 'CLEAR' },
    { label: 'Discrepancy',           value: 'DISCREPANCY' },
    { label: 'Discrepancy Resolved',  value: 'DISCREPANCY_RESOLVED' },
    { label: 'Failed',                value: 'FAILED' },
    { label: 'Skipped',               value: 'SKIPPED' },
  ];

  private api = inject(Recuriting);
  private toast = inject(MessageService);
  private confirm = inject(ConfirmationService);

  ngOnInit() {
    this.loadAll();
  }

  private loadAll() {
    this.api.getApplicationSummary(this.applicationId).subscribe(res => {
      this.summary = res;
    });
    this.loadReferences();
    this.loadBgv();
  }

  // ═══════════════ Consent ═══════════════
  recordConsent(type: 'REFERENCES' | 'BGV' | 'BOTH') {
    this.api.recordConsent(this.applicationId, type).subscribe({
      next: (res) => {
        // Patch the summary so the banner updates instantly without a full refetch.
        if (this.summary) {
          if (res.referencesConsentAt) this.summary.referencesConsentAt = res.referencesConsentAt;
          if (res.bgvConsentAt)        this.summary.bgvConsentAt        = res.bgvConsentAt;
        }
        this.toast.add({ severity: 'success', summary: 'Consent recorded', detail: type });
      },
      error: (err) => this.showError('Failed to record consent', err),
    });
  }

  // ═══════════════ References ═══════════════
  loadReferences() {
    this.loadingRefs = true;
    this.api.listReferences(this.applicationId).subscribe({
      next: (rows) => {
        this.references = rows ?? [];
        // Pre-seed edit state for each row so the inline form binds cleanly.
        for (const r of this.references) {
          if (!this.refCheckEdit[r.id]) {
            this.refCheckEdit[r.id] = {
              status:   r.checkStatus ?? 'PENDING',
              feedback: r.feedback    ?? '',
              rating:   r.rating      ?? null,
            };
          }
        }
        this.loadingRefs = false;
      },
      error: () => { this.loadingRefs = false; },
    });
  }

  addReference() {
    if (!this.newRef.refereeName.trim() || !this.newRef.refereeRelation.trim()) {
      this.toast.add({ severity: 'warn', summary: 'Required', detail: 'Name + Relation are required.' });
      return;
    }
    this.api.addReference(this.applicationId, this.newRef).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Added', detail: 'Reference added.' });
        this.newRef = { refereeName: '', refereeRelation: '', refereeCompany: '', refereeEmail: '', refereePhone: '' };
        this.showAddRef = false;
        this.loadReferences();
      },
      error: (err) => this.showError('Failed to add reference', err),
    });
  }

  deleteReference(ref: any) {
    this.confirm.confirm({
      message: `Delete reference "${ref.refereeName}"?`,
      accept: () => {
        this.api.deleteReference(ref.id).subscribe({
          next: () => { this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Reference removed.' }); this.loadReferences(); },
          error: (err) => this.showError('Failed to delete reference', err),
        });
      },
    });
  }

  saveCheck(ref: any) {
    const edit = this.refCheckEdit[ref.id];
    if (!edit) return;
    if (!this.summary?.referencesConsentAt) {
      this.toast.add({ severity: 'warn', summary: 'Consent required', detail: 'Record candidate consent before saving the check.' });
      return;
    }
    this.api.recordReferenceCheck(ref.id, {
      status:   edit.status,
      feedback: edit.feedback || undefined,
      rating:   edit.rating ?? undefined,
    }).subscribe({
      next: () => { this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Reference check updated.' }); this.loadReferences(); },
      error: (err) => this.showError('Failed to save check', err),
    });
  }

  // ═══════════════ BGV ═══════════════
  loadBgv() {
    this.loadingBgv = true;
    this.api.getBgv(this.applicationId).subscribe({
      next: (b) => {
        this.bgv = b;
        if (b?.checks) {
          for (const c of b.checks) {
            if (!this.bgvEdit[c.id]) {
              this.bgvEdit[c.id] = {
                status:      c.status      ?? 'PENDING',
                evidenceUrl: c.evidenceUrl ?? '',
                note:        c.note        ?? '',
              };
            }
          }
        }
        this.bgvDocs = b?.documents ?? [];
        this.loadingBgv = false;
      },
      error: () => { this.loadingBgv = false; },
    });
  }

  /** BGV checks are editable only while IN_PROGRESS; once finalised
   *  (CLEAR / FLAGGED / FAILED) they're read-only, not re-prompted for entry. */
  bgvEditable(): boolean {
    return this.bgv?.status === 'IN_PROGRESS';
  }

  initiateBgv() {
    if (!this.summary?.bgvConsentAt) {
      this.toast.add({ severity: 'warn', summary: 'Consent required', detail: 'Record BGV consent first.' });
      return;
    }
    this.api.initiateBgv(this.applicationId).subscribe({
      next: () => { this.toast.add({ severity: 'success', summary: 'Started', detail: 'BGV initiated.' }); this.loadBgv(); },
      error: (err) => this.showError('Failed to initiate BGV', err),
    });
  }

  // Per-check evidence upload state (keyed by check id).
  evidenceUploading: Record<number, boolean> = {};

  onEvidenceFileSelected(check: any, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (!file || !this.bgv) return;
    this.evidenceUploading[check.id] = true;
    this.api.uploadBgvCheckEvidence(this.bgv.id, check.id, file).subscribe({
      next: (updated: any) => {
        this.evidenceUploading[check.id] = false;
        // Reflect the stored URL in the edit model + the loaded check.
        if (this.bgvEdit[check.id]) this.bgvEdit[check.id].evidenceUrl = updated?.evidenceUrl ?? '';
        check.evidenceUrl = updated?.evidenceUrl ?? check.evidenceUrl;
        this.toast.add({ severity: 'success', summary: 'Uploaded', detail: 'Evidence attached.' });
        input.value = '';
      },
      error: (err) => {
        this.evidenceUploading[check.id] = false;
        this.showError('Failed to upload evidence', err);
        input.value = '';
      },
    });
  }

  saveBgvCheck(check: any) {
    const edit = this.bgvEdit[check.id];
    if (!edit || !this.bgv) return;
    this.api.updateBgvCheck(this.bgv.id, check.id, {
      status:      edit.status,
      evidenceUrl: edit.evidenceUrl || undefined,
      note:        edit.note        || undefined,
    }).subscribe({
      next: () => { this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Check updated.' }); this.loadBgv(); },
      error: (err) => this.showError('Failed to update check', err),
    });
  }

  openResolveDialog(check: any) {
    this.resolveTargetCheck = check;
    this.resolveNote = '';
    this.resolveDialogOpen = true;
  }
  submitResolveDiscrepancy() {
    if (!this.resolveNote.trim() || !this.resolveTargetCheck || !this.bgv) return;
    this.api.resolveBgvDiscrepancy(this.bgv.id, this.resolveTargetCheck.id, this.resolveNote).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Resolved', detail: 'Discrepancy resolved.' });
        this.resolveDialogOpen = false;
        this.loadBgv();
      },
      error: (err) => this.showError('Failed to resolve', err),
    });
  }

  // Final BGV report upload state.
  reportUploading = false;

  onReportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (!file || !this.bgv) return;
    this.reportUploading = true;
    this.api.uploadBgvReport(this.bgv.id, file).subscribe({
      next: (updated: any) => {
        this.reportUploading = false;
        this.completeReportUrl = updated?.reportUrl ?? '';
        this.toast.add({ severity: 'success', summary: 'Uploaded', detail: 'Report attached.' });
        input.value = '';
      },
      error: (err) => { this.reportUploading = false; this.showError('Failed to upload report', err); input.value = ''; },
    });
  }

  completeBgv() {
    if (!this.bgv) return;
    this.confirm.confirm({
      message: 'Finalise this BGV? The system will compute overall status from all checks.',
      accept: () => {
        this.api.completeBgv(this.bgv.id, {
          reportUrl:   this.completeReportUrl || undefined,
          overallNote: this.completeNote      || undefined,
        }).subscribe({
          next: () => { this.toast.add({ severity: 'success', summary: 'Completed', detail: 'BGV finalised.' }); this.loadBgv(); },
          error: (err) => this.showError('Failed to complete', err),
        });
      },
    });
  }

  // ─── BGV Documents ───
  onDocFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.docFile = input.files && input.files.length ? input.files[0] : null;
  }

  private resetDocForm() {
    this.docSelectedType = '';
    this.docOtherType = '';
    this.docFile = null;
  }

  addBgvDocument() {
    if (!this.bgv) return;
    const docType = (this.docSelectedType === 'OTHER' ? this.docOtherType : this.docSelectedType).trim();
    if (!docType) {
      this.toast.add({ severity: 'warn', summary: 'Required', detail: 'Choose a document type.' });
      return;
    }
    if (!this.docFile) {
      this.toast.add({ severity: 'warn', summary: 'Required', detail: 'Choose a file to upload.' });
      return;
    }

    const fd = new FormData();
    fd.append('docType', docType);
    fd.append('fileName', this.docFile.name);
    fd.append('file', this.docFile);

    this.docUploading = true;
    this.api.addBgvDocument(this.bgv.id, fd).subscribe({
      next: () => {
        this.docUploading = false;
        this.toast.add({ severity: 'success', summary: 'Uploaded', detail: 'Document attached.' });
        this.resetDocForm();
        this.showAddDoc = false;
        this.loadBgv();
      },
      error: (err) => { this.docUploading = false; this.showError('Failed to upload document', err); },
    });
  }

  deleteBgvDocument(doc: any) {
    this.confirm.confirm({
      message: `Remove document "${doc.fileName}"?`,
      accept: () => {
        this.api.deleteBgvDocument(doc.id).subscribe({
          next: () => { this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Document removed.' }); this.loadBgv(); },
          error: (err) => this.showError('Failed to delete document', err),
        });
      },
    });
  }

  // ─── helpers ───
  bgvBannerSeverity(): 'success' | 'warn' | 'danger' | 'info' {
    if (!this.bgv) return 'info';
    switch (this.bgv.status) {
      case 'CLEAR':         return 'success';
      case 'FLAGGED':       return 'warn';
      case 'FAILED':        return 'danger';
      case 'IN_PROGRESS':   return 'info';
      default:              return 'info';
    }
  }
  bgvCheckTagSeverity(s: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (s) {
      case 'CLEAR':                return 'success';
      case 'DISCREPANCY':          return 'danger';
      case 'DISCREPANCY_RESOLVED': return 'success';
      case 'FAILED':               return 'danger';
      case 'SKIPPED':              return 'info';
      default:                     return 'warn';
    }
  }
  /** True when every captured reference is in a terminal "checked" state.
   *  Used by the progress strip to mark Step 2 as fully done. */
  allRefsChecked(): boolean {
    if (!this.references.length) return false;
    return this.references.every((r) =>
      r.checkStatus === 'DONE' || r.checkStatus === 'UNREACHABLE' || r.checkStatus === 'FLAGGED',
    );
  }

  refTagSeverity(s: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (s) {
      case 'DONE':         return 'success';
      case 'FLAGGED':      return 'danger';
      case 'UNREACHABLE':  return 'warn';
      case 'IN_PROGRESS':  return 'info';
      default:             return 'warn';
    }
  }

  private showError(summary: string, err: any) {
    console.error(summary, err);
    const detail = err?.error?.error || err?.message || 'Please try again.';
    this.toast.add({ severity: 'error', summary, detail });
  }
}
