import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';

import { Incident } from '../../services/incident/incident';
import { Employees } from '../../services/employees/employees';
import { Shifts } from '../../services/shifts/shifts';

interface AttachmentDraft { fileName: string; fileUrl: string; }
interface WitnessDraft   {
  witnessEmpId?: number | null;
  witnessName?: string;
  contactInfo?: string;
  statement?: string;
}

@Component({
  selector: 'app-incident-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    CardModule, ToastModule, FileUploadModule, InputTextModule, TextareaModule,
    SelectModule, ButtonModule, CheckboxModule, DatePickerModule, TooltipModule,
  ],
  templateUrl: './incident-form.html',
  styleUrl: './incident-form.css',
})
export class IncidentForm implements OnInit {
  /** Notify parent when an incident is created so the list view can refresh. */
  @Output() created = new EventEmitter<any>();

  /* ── Form state ───────────────────────────────────── */
  form: {
    title: string;
    description: string;
    categoryId: number | null;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
    employeeId: number | null;
    location: string;
    incidentDate: Date | null;
    confidentiality: 'STANDARD' | 'HR_PRIVATE' | 'MGMT_ONLY';
    isAnonymous: boolean;
  } = {
    title: '',
    description: '',
    categoryId: null,
    severity: null,
    employeeId: null,
    location: '',
    incidentDate: new Date(),
    confidentiality: 'STANDARD',
    isAnonymous: false,
  };

  /* ── Reference data ───────────────────────────────── */
  categories: any[] = [];
  employees: any[]  = [];
  severityOptions = [
    { label: 'Low — informational',     value: 'LOW' },
    { label: 'Medium — needs attention', value: 'MEDIUM' },
    { label: 'High — act soon',          value: 'HIGH' },
    { label: 'Critical — act now',       value: 'CRITICAL' },
  ];
  confidentialityOptions = [
    { label: 'Standard — visible to investigators', value: 'STANDARD' },
    { label: 'HR private — HR + management only',   value: 'HR_PRIVATE' },
    { label: 'Management only',                     value: 'MGMT_ONLY' },
  ];

  attachments: AttachmentDraft[] = [];
  newAtt: AttachmentDraft = { fileName: '', fileUrl: '' };

  witnesses: WitnessDraft[] = [];
  newWit: WitnessDraft = { witnessName: '', contactInfo: '', statement: '' };

  isLoading = false;
  deptId  = Number(localStorage.getItem('deptId')) || 0;
  roleId  = Number(localStorage.getItem('roleId')) || 0;

  /** True when the chosen category disallows anonymous submission. */
  get anonymousBlocked(): boolean {
    const cat = this.categories.find((c) => c.id === this.form.categoryId);
    return !!cat && cat.isAnonymousAllowed === false;
  }

  constructor(
    private incidentService: Incident,
    private toast: MessageService,
    private employeeService: Employees,
    private shifts: Shifts,
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.fetchEmployees();
  }

  /* ─── Data loading ─────────────────────────────────── */
  private loadCategories() {
    this.incidentService.listCategories().subscribe({
      next: (rows) => { this.categories = rows ?? []; },
      error: () => {
        this.toast.add({
          severity: 'warn',
          summary: 'Categories unavailable',
          detail: 'Could not load incident categories. Refresh and try again.',
        });
      },
    });
  }

  private fetchEmployees() {
    const onSuccess = (res: any[]) => {
      this.employees = res.map((e) => ({
        label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
        value: e.id,
      }));
    };
    if (this.deptId === 1) {
      this.employeeService.getActiveEmployees().subscribe({ next: onSuccess });
    } else {
      this.shifts.getMyEmployees().subscribe({ next: onSuccess });
    }
  }

  /* ─── Category change side-effects ──────────────────
     When category changes, prefill severity from the category default
     (only if user hasn't picked one), and turn off anonymous if the new
     category disallows it. */
  onCategoryChange() {
    const cat = this.categories.find((c) => c.id === this.form.categoryId);
    if (!cat) return;
    if (!this.form.severity && cat.defaultSeverity) {
      this.form.severity = cat.defaultSeverity;
    }
    if (this.form.isAnonymous && cat.isAnonymousAllowed === false) {
      this.form.isAnonymous = false;
    }
  }

  /* ─── Attachments / Witnesses (in-form drafts) ───── */
  addAttachmentRow() {
    if (!this.newAtt.fileName.trim() || !this.newAtt.fileUrl.trim()) return;
    this.attachments.push({ ...this.newAtt });
    this.newAtt = { fileName: '', fileUrl: '' };
  }
  removeAttachmentRow(i: number) { this.attachments.splice(i, 1); }

  addWitnessRow() {
    if (!this.newWit.witnessName?.trim() && !this.newWit.witnessEmpId) return;
    this.witnesses.push({ ...this.newWit });
    this.newWit = { witnessName: '', contactInfo: '', statement: '' };
  }
  removeWitnessRow(i: number) { this.witnesses.splice(i, 1); }

  /* ─── Submit ──────────────────────────────────────── */
  submit() {
    // Field-level validation. Backend validates again, but failing fast here
    // saves a round-trip and shows clearer per-field messages.
    if (!this.form.title.trim() || this.form.title.trim().length < 4) {
      return this.warn('Title is required (min 4 chars)');
    }
    if (!this.form.description.trim() || this.form.description.trim().length < 10) {
      return this.warn('Description is required (min 10 chars)');
    }
    if (!this.form.categoryId) {
      return this.warn('Please select a category');
    }
    if (this.anonymousBlocked && this.form.isAnonymous) {
      return this.warn('Anonymous reporting is not allowed for this category');
    }

    this.isLoading = true;
    const payload: any = {
      title:       this.form.title.trim(),
      description: this.form.description.trim(),
      categoryId:  this.form.categoryId,
      severity:    this.form.severity ?? undefined,
      location:    this.form.location?.trim() || undefined,
      incidentDate: this.form.incidentDate?.toISOString(),
      confidentiality: this.form.confidentiality,
      isAnonymous:     this.form.isAnonymous,
      employeeId:      this.form.employeeId ?? undefined,
      attachments:     this.attachments.length ? this.attachments : undefined,
      witnesses:       this.witnesses.length   ? this.witnesses   : undefined,
    };

    this.incidentService.createIncident(payload).subscribe({
      next: (res) => {
        this.toast.add({
          severity: 'success',
          summary: 'Incident reported',
          detail: this.form.isAnonymous
            ? 'Submitted anonymously. HR / assignee notified.'
            : 'HR / assignee notified.',
        });
        this.created.emit(res?.data);
        this.resetForm();
        this.isLoading = false;
      },
      error: (err) => {
        this.toast.add({
          severity: 'error',
          summary: 'Submission failed',
          detail: err?.error?.error || 'Please try again.',
        });
        this.isLoading = false;
      },
    });
  }

  resetForm() {
    this.form = {
      title: '', description: '', categoryId: null, severity: null,
      employeeId: null, location: '', incidentDate: new Date(),
      confidentiality: 'STANDARD', isAnonymous: false,
    };
    this.attachments = [];
    this.witnesses = [];
    this.newAtt = { fileName: '', fileUrl: '' };
    this.newWit = { witnessName: '', contactInfo: '', statement: '' };
  }

  private warn(detail: string) {
    this.toast.add({ severity: 'warn', summary: 'Required field missing', detail });
  }
}
