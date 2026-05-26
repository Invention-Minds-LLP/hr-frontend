import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { Committee, CommitteeType, CommitteeRole } from '../../services/committee/committee';
import { Employees } from '../../services/employees/employees';

/**
 * Committee admin — HR manages the POSH ICC and Grievance Redressal Committee.
 *
 * Two tabs (POSH / Grievance). For each: list of committees, create new,
 * add/remove members. POSH tab also shows a live compliance banner against
 * the POSH Act 2013 rules (Presiding Officer = woman, ≥50% women, ≥1 external,
 * term active, ≥4 members).
 */
@Component({
  selector: 'app-committee-admin',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule, TextareaModule,
    SelectModule, DatePickerModule, AutoCompleteModule,
    TagModule, TooltipModule, DialogModule, ToastModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './committee-admin.html',
  styleUrl: './committee-admin.css',
})
export class CommitteeAdmin implements OnInit {
  private api     = inject(Committee);
  private empSvc  = inject(Employees);
  private toast   = inject(MessageService);
  private confirm = inject(ConfirmationService);

  /* ── State ──────────────────────────────────────────── */
  activeTab: CommitteeType = 'POSH';
  rows: any[] = [];
  loading = false;
  selected: any = null;     // currently-opened committee
  compliance: any = null;   // POSH compliance result for the selected committee

  /* Create-committee dialog */
  showCreate = false;
  newC = { type: 'POSH' as CommitteeType, name: '', scope: 'ORG_WIDE', termStart: null as Date | null, termEnd: null as Date | null, notes: '' };
  creating = false;

  /* Add-member dialog */
  showAddMember = false;
  newM: {
    kind: 'INTERNAL' | 'EXTERNAL';
    employee: any | null;
    externalName: string;
    externalEmail: string;
    externalPhone: string;
    externalOrg: string;
    role: CommitteeRole;
  } = { kind: 'INTERNAL', employee: null, externalName: '', externalEmail: '', externalPhone: '', externalOrg: '', role: 'MEMBER' };
  addingMember = false;

  /* Employee search (autocomplete) */
  empSuggestions: any[] = [];

  /* Reference options */
  roleOptions = [
    { label: 'Presiding Officer (POSH only)', value: 'PRESIDING_OFFICER' },
    { label: 'Chair (Grievance)',             value: 'CHAIR' },
    { label: 'Member',                        value: 'MEMBER' },
    { label: 'External Member (NGO / lawyer)', value: 'EXTERNAL_MEMBER' },
    { label: 'Secretary',                     value: 'SECRETARY' },
  ];
  kindOptions = [
    { label: 'Internal employee',             value: 'INTERNAL' },
    { label: 'External (NGO / lawyer)',       value: 'EXTERNAL' },
  ];

  ngOnInit() { this.load(); }

  switchTab(t: CommitteeType) {
    this.activeTab = t;
    this.selected = null;
    this.compliance = null;
    this.load();
  }

  /* ── List + open ────────────────────────────────────── */
  load() {
    this.loading = true;
    this.api.list({ type: this.activeTab }).subscribe({
      next: (rows) => { this.rows = rows ?? []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  open(c: any) {
    this.api.get(c.id).subscribe({
      next: (row) => {
        this.selected = row;
        this.compliance = null;
        if (row.type === 'POSH') this.loadCompliance();
      },
    });
  }
  closeDetail() { this.selected = null; this.compliance = null; }

  loadCompliance() {
    if (!this.selected || this.selected.type !== 'POSH') return;
    this.api.poshCompliance(this.selected.id).subscribe({
      next: (res) => { this.compliance = res; },
      error: () => { this.compliance = null; },
    });
  }

  /* ── Create committee ───────────────────────────────── */
  openCreate() {
    this.newC = {
      type: this.activeTab,
      name: '',
      scope: 'ORG_WIDE',
      termStart: new Date(),
      termEnd: (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 3); return d; })(),
      notes: '',
    };
    this.showCreate = true;
  }
  submitCreate() {
    if (!this.newC.name?.trim() || !this.newC.termStart || !this.newC.termEnd) {
      this.toast.add({ severity: 'warn', summary: 'Required', detail: 'Name + term dates are required.' });
      return;
    }
    this.creating = true;
    this.api.create({
      type: this.newC.type,
      name: this.newC.name.trim(),
      scope: this.newC.scope || 'ORG_WIDE',
      termStart: this.newC.termStart.toISOString(),
      termEnd:   this.newC.termEnd.toISOString(),
      notes: this.newC.notes || undefined,
    }).subscribe({
      next: (created) => {
        this.toast.add({ severity: 'success', summary: 'Committee created', detail: created.name });
        this.creating = false;
        this.showCreate = false;
        this.load();
      },
      error: (err) => {
        this.creating = false;
        this.toast.add({ severity: 'error', summary: 'Failed', detail: err?.error?.error ?? 'Could not create' });
      },
    });
  }

  /* ── Members ────────────────────────────────────────── */
  openAddMember() {
    if (!this.selected) return;
    this.newM = { kind: 'INTERNAL', employee: null, externalName: '', externalEmail: '', externalPhone: '', externalOrg: '', role: 'MEMBER' };
    this.showAddMember = true;
  }

  searchEmployees(event: any) {
    this.empSvc.getEmployees(1, 100, event.query).subscribe({
      next: (res: any) => {
        const list = res.employees ?? res.data ?? res ?? [];
        this.empSuggestions = list.map((e: any) => ({
          ...e,
          label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
        }));
      },
      error: () => { this.empSuggestions = []; },
    });
  }

  submitAddMember() {
    if (!this.selected) return;
    if (this.newM.kind === 'INTERNAL' && !this.newM.employee?.id) {
      this.toast.add({ severity: 'warn', summary: 'Pick an employee' });
      return;
    }
    if (this.newM.kind === 'EXTERNAL' && !this.newM.externalName?.trim()) {
      this.toast.add({ severity: 'warn', summary: 'External name is required' });
      return;
    }
    this.addingMember = true;
    this.api.addMember(this.selected.id, {
      employeeId:    this.newM.kind === 'INTERNAL' ? this.newM.employee.id : undefined,
      externalName:  this.newM.kind === 'EXTERNAL' ? this.newM.externalName.trim() : undefined,
      externalEmail: this.newM.kind === 'EXTERNAL' ? (this.newM.externalEmail.trim() || undefined) : undefined,
      externalPhone: this.newM.kind === 'EXTERNAL' ? (this.newM.externalPhone.trim() || undefined) : undefined,
      externalOrg:   this.newM.kind === 'EXTERNAL' ? (this.newM.externalOrg.trim()   || undefined) : undefined,
      role: this.newM.role,
    }).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Member added' });
        this.addingMember = false;
        this.showAddMember = false;
        this.open(this.selected);   // refresh detail
      },
      error: (err) => {
        this.addingMember = false;
        this.toast.add({ severity: 'error', summary: 'Failed', detail: err?.error?.error ?? 'Could not add' });
      },
    });
  }

  removeMember(m: any) {
    this.confirm.confirm({
      header: 'Remove member?',
      message: `Remove ${this.memberLabel(m)} from this committee?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.removeMember(m.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Removed' });
            this.open(this.selected);
          },
          error: (err) => this.toast.add({ severity: 'error', summary: 'Failed', detail: err?.error?.error ?? '—' }),
        });
      },
    });
  }

  /* ── UI helpers ─────────────────────────────────────── */
  memberLabel(m: any): string {
    if (m.employee) return `${m.employee.firstName} ${m.employee.lastName} (${m.employee.employeeCode})`;
    return `${m.externalName ?? 'External'}${m.externalOrg ? ' — ' + m.externalOrg : ''}`;
  }
  roleLabel(r: string): string {
    return (r ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  roleSeverity(r: string): any {
    switch (r) {
      case 'PRESIDING_OFFICER': return 'warn';
      case 'CHAIR':             return 'warn';
      case 'EXTERNAL_MEMBER':   return 'info';
      case 'SECRETARY':         return 'secondary';
      default:                  return 'success';
    }
  }
  termActive(c: any): boolean {
    const now = new Date();
    return c.isActive && new Date(c.termStart) <= now && new Date(c.termEnd) >= now;
  }
}
