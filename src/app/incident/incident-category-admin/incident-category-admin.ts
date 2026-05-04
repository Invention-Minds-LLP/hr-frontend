import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { Incident } from '../../services/incident/incident';
import { Roles } from '../../services/roles/roles';

/**
 * Admin UI for managing IncidentCategory rows.
 *
 * Categories drive the entire incident workflow — they decide:
 *   • who an incident is auto-assigned to (defaultAssigneeRoleId)
 *   • how soon HR has to act (defaultSlaHours)
 *   • the default severity prefilled on the form (defaultSeverity)
 *   • whether anonymous reports are allowed (isAnonymousAllowed)
 *   • whether RCA / external authority reporting is mandatory
 *
 * Without this UI, HR had to ask a developer to seed/update categories
 * manually in the database. Now they self-serve.
 */
@Component({
  selector: 'app-incident-category-admin',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule, TextareaModule,
    SelectModule, CheckboxModule, TagModule, TooltipModule,
    DialogModule, ToastModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './incident-category-admin.html',
  styleUrl: './incident-category-admin.css',
})
export class IncidentCategoryAdmin implements OnInit {
  private api     = inject(Incident);
  private rolesApi = inject(Roles);
  private toast   = inject(MessageService);
  private confirm = inject(ConfirmationService);

  /* ── State ──────────────────────────────────────── */
  rows: any[] = [];
  loading = false;

  showForm = false;
  editing: any = null;            // null = new, otherwise existing row
  saving = false;

  /** Current draft in the modal form. */
  form: {
    id: number | null;
    name: string;
    description: string;
    defaultSeverity: string | null;
    defaultSlaHours: number | null;
    defaultAssigneeRoleId: number | null;
    isAnonymousAllowed: boolean;
    requiresRCAByDefault: boolean;
    requiresExternalReportByDefault: boolean;
    isActive: boolean;
    sortOrder: number;
  } = this.emptyForm();

  /* ── Reference data ─────────────────────────────── */
  severityOptions = [
    { label: '— Use system default —',  value: null },
    { label: 'Low',      value: 'LOW' },
    { label: 'Medium',   value: 'MEDIUM' },
    { label: 'High',     value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' },
  ];
  roleOptions: { label: string; value: number | null }[] = [
    { label: '— No auto-assignee —', value: null },
  ];

  ngOnInit() {
    this.load();
    this.loadRoles();
  }

  /* ── Data ───────────────────────────────────────── */
  load() {
    this.loading = true;
    this.api.listCategories(true).subscribe({
      next: (rows) => { this.rows = rows ?? []; this.loading = false; },
      error: () => {
        this.loading = false;
        this.toast.add({ severity: 'error', summary: 'Load failed', detail: 'Could not load categories.' });
      },
    });
  }

  private loadRoles() {
    this.rolesApi.getRoles().subscribe({
      next: (roles) => {
        this.roleOptions = [
          { label: '— No auto-assignee —', value: null },
          ...(roles ?? []).map((r) => ({ label: r.name, value: r.id ?? null })),
        ];
      },
      error: () => { /* keep the default empty placeholder */ },
    });
  }

  /* ── Form open/close ────────────────────────────── */
  private emptyForm() {
    return {
      id: null, name: '', description: '',
      defaultSeverity: null, defaultSlaHours: 72,
      defaultAssigneeRoleId: null,
      isAnonymousAllowed: true,
      requiresRCAByDefault: false,
      requiresExternalReportByDefault: false,
      isActive: true, sortOrder: 0,
    };
  }

  openNew() {
    this.editing = null;
    this.form = this.emptyForm();
    this.showForm = true;
  }

  openEdit(row: any) {
    this.editing = row;
    this.form = {
      id: row.id,
      name: row.name ?? '',
      description: row.description ?? '',
      defaultSeverity: row.defaultSeverity ?? null,
      defaultSlaHours: row.defaultSlaHours ?? null,
      defaultAssigneeRoleId: row.defaultAssigneeRoleId ?? null,
      isAnonymousAllowed: !!row.isAnonymousAllowed,
      requiresRCAByDefault: !!row.requiresRCAByDefault,
      requiresExternalReportByDefault: !!row.requiresExternalReportByDefault,
      isActive: !!row.isActive,
      sortOrder: row.sortOrder ?? 0,
    };
    this.showForm = true;
  }

  cancel() {
    this.showForm = false;
    this.editing = null;
  }

  /* ── Save / archive ─────────────────────────────── */
  save() {
    if (!this.form.name.trim()) {
      this.toast.add({ severity: 'warn', summary: 'Name required', detail: 'Category name cannot be empty.' });
      return;
    }
    this.saving = true;
    this.api.upsertCategory({
      ...this.form,
      name: this.form.name.trim(),
      description: this.form.description.trim() || null,
      defaultSlaHours: this.form.defaultSlaHours ?? null,
      sortOrder: Number(this.form.sortOrder) || 0,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.toast.add({
          severity: 'success',
          summary: this.editing ? 'Category updated' : 'Category created',
          detail: this.form.name,
        });
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.toast.add({
          severity: 'error',
          summary: 'Save failed',
          detail: err?.error?.error ?? 'Could not save the category.',
          life: 6000,
        });
      },
    });
  }

  /** Toggle isActive — we don't actually delete categories because incidents
   *  reference them. Archiving keeps history intact while hiding from the
   *  pickup list.  */
  toggleActive(row: any) {
    const next = !row.isActive;
    this.confirm.confirm({
      header: next ? 'Re-enable category?' : 'Archive category?',
      message: next
        ? `"${row.name}" will appear in the report-form picker again.`
        : `"${row.name}" will no longer appear in the report-form picker (existing incidents are kept).`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.upsertCategory({ ...row, isActive: next }).subscribe({
          next: () => {
            this.toast.add({
              severity: 'success',
              summary: next ? 'Re-enabled' : 'Archived',
              detail: row.name,
            });
            this.load();
          },
          error: () => {
            this.toast.add({ severity: 'error', summary: 'Update failed', detail: 'Could not toggle category.' });
          },
        });
      },
    });
  }

  /* ── UI helpers ─────────────────────────────────── */
  severityClass(s: string | null): string {
    switch (s) {
      case 'CRITICAL': return 'sev-critical';
      case 'HIGH':     return 'sev-high';
      case 'MEDIUM':   return 'sev-medium';
      case 'LOW':      return 'sev-low';
      default:         return 'sev-none';
    }
  }
  roleLabel(roleId: number | null): string {
    if (!roleId) return '—';
    const r = this.roleOptions.find((o) => o.value === roleId);
    return r ? r.label : `#${roleId}`;
  }
}
