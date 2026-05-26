import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { Employees } from '../../services/employees/employees';
import { Designations } from '../../services/designations/designations';
import { Departments } from '../../services/departments/departments';
import { Branches } from '../../services/branches/branches';
import { Roles } from '../../services/roles/roles';
import { Shifts } from '../../services/shifts/shifts';
import { forkJoin } from 'rxjs';

/**
 * Employee Audit Log — read-only history of every change ever made to an
 * employee's record. Embedded as a card inside the employee profile / form.
 *
 * Renders human-friendly diffs:
 *   • Foreign-key fields (designationId / departmentId / roleId / branchId /
 *     shiftId / inchargeId / reportingManager) are resolved to NAMES.
 *   • Relation arrays (Address / emergencyContacts / qualifications) are
 *     diffed entry-by-entry and rendered as add / remove / changed cards
 *     instead of raw JSON.
 *   • Field labels are mapped to human form ("Designation" not "Designation Id").
 *   • Booleans render as Yes/No, dates as dd MMM yyyy.
 */

/** Shape of a parsed entry in our human-friendly change list. */
interface ChangeRow {
  field: string;
  label: string;
  /** 'scalar' = simple from→to; 'relation' = list of add/remove/changed entries */
  kind: 'scalar' | 'relation';
  // scalar
  fromText?: string;
  toText?: string;
  // relation
  relationKind?: 'address' | 'contact' | 'qual';
  added?: any[];
  removed?: any[];
  changed?: { before: any; after: any; diffs: { field: string; from: any; to: any }[] }[];
}

@Component({
  selector: 'app-employee-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, TooltipModule],
  templateUrl: './employee-audit-log.html',
  styleUrl: './employee-audit-log.css',
})
export class EmployeeAuditLog implements OnInit, OnChanges {
  @Input() employeeId!: number;

  rows: any[] = [];
  total = 0;
  loading = false;

  filters: { field: string; source: string | null } = { field: '', source: null };
  page = 1;
  pageSize = 50;

  sourceOptions = [
    { label: 'All sources',   value: null },
    { label: 'Manual edit',   value: 'WEB' },
    { label: 'Promotion',     value: 'PROMOTION' },
    { label: 'Resignation',   value: 'RESIGNATION' },
    { label: 'Onboarding',    value: 'ONBOARDING' },
    { label: 'Cron / system', value: 'CRON' },
    { label: 'Bulk import',   value: 'IMPORT' },
  ];

  /* ── Lookup maps (id → name) ─────────────────────────────── */
  private desigMap   = new Map<number, string>();
  private deptMap    = new Map<number, string>();
  private roleMap    = new Map<number, string>();
  private branchMap  = new Map<number, string>();
  private shiftMap   = new Map<number, string>();
  private empMap     = new Map<number, string>();   // for incharge / reporting manager

  private api      = inject(Employees);
  private desigSvc = inject(Designations);
  private deptSvc  = inject(Departments);
  private branchSvc = inject(Branches);
  private roleSvc  = inject(Roles);
  private shiftSvc = inject(Shifts);

  /* ── Field label map — friendly names instead of camelCase ─── */
  private readonly LABELS: Record<string, string> = {
    designationId:     'Designation',
    departmentId:      'Department',
    roleId:            'Role',
    branchId:          'Branch',
    shiftId:           'Shift',
    inchargeId:        'Incharge',
    reportingManager:  'Reporting Manager',
    employeeCode:      'Employee Code',
    employeeType:      'Employee Type',
    employmentType:    'Employment Type',
    employmentStatus:  'Employment Status',
    firstName:         'First Name',
    lastName:          'Last Name',
    fatherName:        'Father\'s Name',
    motherName:        'Mother\'s Name',
    dateOfJoining:     'Date of Joining',
    dob:               'Date of Birth',
    probationStartDate:    'Probation Start',
    probationEndDate:      'Probation End',
    probationStatus:       'Probation Status',
    probationConfirmedOn:  'Probation Confirmed On',
    probationConfirmedBy:  'Probation Confirmed By',
    probationRemarks:      'Probation Remarks',
    aadharNumber:      'Aadhaar Number',
    panNumber:         'PAN Number',
    uanNumber:         'UAN Number',
    licenseNumber:     'License Number',
    licenseRegDate:    'License Reg Date',
    licenseExpiryDate: 'License Expiry Date',
    bloodGroup:        'Blood Group',
    bloodPressure:     'Blood Pressure',
    bloodSugar:        'Blood Sugar',
    bmi:               'BMI',
    cholesterol:       'Cholesterol',
    chronicConditions: 'Chronic Conditions',
    pastSurgeries:     'Past Surgeries',
    exerciseFrequency: 'Exercise Frequency',
    preferredHospital: 'Preferred Hospital',
    primaryPhysician:  'Primary Physician',
    emergencyNotes:    'Emergency Notes',
    geoTrackingEnabled: 'Geo Tracking',
    overtimeEnabled:   'Overtime Enabled',
    attendanceMode:    'Attendance Mode',
    sameAsPermanent:   'Same as Permanent Address',
    hasDisability:     'Has Disability',
    disabilityType:    'Disability Type',
    disabilityDescription: 'Disability Description',
    visionType:        'Vision Type',
    usesGlasses:       'Uses Glasses',
    visionRemarks:     'Vision Remarks',
    Address:           'Addresses',
    emergencyContacts: 'Emergency Contacts',
    qualifications:    'Qualifications',
    totalYearsOfExperience: 'Total Experience (years)',
    experience:        'Experience (years)',
    experienceType:    'Experience Type',
    referenceCode:     'Reference Code',
    photoUrl:          'Photo',
    alternatePhone:    'Alternate Phone',
    preEmploymentCheckDate: 'Pre-Employment Check',
  };

  /** Date-like fields (so we render them as dates not raw ISO strings). */
  private readonly DATE_FIELDS = new Set([
    'dob', 'dateOfJoining',
    'probationStartDate', 'probationEndDate', 'probationConfirmedOn',
    'licenseRegDate', 'licenseExpiryDate', 'preEmploymentCheckDate',
  ]);

  /** Boolean fields (so true/false → Yes/No). */
  private readonly BOOL_FIELDS = new Set([
    'sameAsPermanent', 'smoking', 'alcohol', 'usesGlasses', 'hasDisability',
    'geoTrackingEnabled', 'overtimeEnabled', 'geoTrackingConsent',
  ]);

  /** Map of "this Id field" → which lookup to use for resolving the name. */
  private readonly ID_RESOLVERS: Record<string, () => Map<number, string>> = {
    designationId:    () => this.desigMap,
    departmentId:     () => this.deptMap,
    roleId:           () => this.roleMap,
    branchId:         () => this.branchMap,
    shiftId:          () => this.shiftMap,
    inchargeId:       () => this.empMap,
    reportingManager: () => this.empMap,
    probationConfirmedBy: () => this.empMap,
  };

  ngOnInit() {
    this.loadLookups();
    this.load();
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['employeeId'] && !changes['employeeId'].firstChange) this.load();
  }

  /** Pull lookup tables once so we can resolve IDs to names. */
  private loadLookups() {
    forkJoin({
      desigs:  this.desigSvc.getDesignations().pipe(),
      depts:   this.deptSvc.getDepartments(),
      roles:   this.roleSvc.getRoles(),
      branches: this.branchSvc.getBranches(),
      shifts:  this.shiftSvc.getShiftTemplates(),
    }).subscribe({
      next: ({ desigs, depts, roles, branches, shifts }) => {
        for (const d of desigs as any[])  this.desigMap.set(d.id, d.title || d.name || `#${d.id}`);
        for (const d of depts as any[])   this.deptMap.set(d.id,  d.name || `#${d.id}`);
        for (const r of roles as any[])   this.roleMap.set(r.id!, r.name || `#${r.id}`);
        for (const b of branches as any[])this.branchMap.set(b.id!, b.name || `#${b.id}`);
        for (const s of shifts as any[])  this.shiftMap.set(s.id,  s.name || `#${s.id}`);
      },
      error: () => { /* lookups are best-effort; falls back to "#id" */ },
    });
    // Employee map for incharge / reporting-manager resolution
    this.api.getActiveEmployees().subscribe({
      next: (rows: any[]) => {
        for (const e of rows ?? []) {
          this.empMap.set(e.id, `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.employeeCode);
        }
      },
      error: () => {},
    });
  }

  load() {
    if (!this.employeeId) return;
    this.loading = true;
    this.api.getEmployeeAuditLog(this.employeeId, {
      field:    this.filters.field || undefined,
      source:   this.filters.source || undefined,
      page:     this.page,
      pageSize: this.pageSize,
    }).subscribe({
      next: (res) => {
        this.rows = res?.rows ?? [];
        this.total = res?.total ?? 0;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  applyFilters() { this.page = 1; this.load(); }
  reset() {
    this.filters = { field: '', source: null };
    this.page = 1;
    this.load();
  }

  authorName(r: any): string {
    if (!r.changedBy) return 'System';
    const a = r.changedByEmployee;
    return a ? `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() : `#${r.changedBy}`;
  }

  /** Friendly label for a field. Falls back to camelCase split. */
  fieldLabel(f: string): string {
    if (this.LABELS[f]) return this.LABELS[f];
    return f.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
  }

  /** Format a single scalar value into a human-readable string. */
  private formatScalar(field: string, v: any): string {
    if (v === null || v === undefined || v === '') return '—';

    // ID resolver — replace number with the looked-up name when we have one
    if (this.ID_RESOLVERS[field]) {
      const map = this.ID_RESOLVERS[field]();
      const id = Number(v);
      if (Number.isFinite(id)) {
        const name = map.get(id);
        return name ? name : `#${id}`;
      }
    }

    // Boolean — Yes/No
    if (this.BOOL_FIELDS.has(field) || typeof v === 'boolean') {
      return v ? 'Yes' : 'No';
    }

    // Date
    if (this.DATE_FIELDS.has(field) || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v))) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }

    if (v instanceof Date) return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  /** Top-level method called from the template. */
  parseChanges(r: any): ChangeRow[] {
    const c = r?.changes;
    if (!c || typeof c !== 'object') return [];

    const out: ChangeRow[] = [];
    for (const [field, value] of Object.entries(c) as [string, any][]) {
      if (field === 'Address')           out.push(this.diffRelation(field, value, 'address'));
      else if (field === 'emergencyContacts') out.push(this.diffRelation(field, value, 'contact'));
      else if (field === 'qualifications')    out.push(this.diffRelation(field, value, 'qual'));
      else {
        out.push({
          field,
          label: this.fieldLabel(field),
          kind: 'scalar',
          fromText: this.formatScalar(field, value?.from),
          toText:   this.formatScalar(field, value?.to),
        });
      }
    }
    return out;
  }

  /** Diff two normalised relation arrays into add / remove / changed buckets. */
  private diffRelation(field: string, value: { from: any[]; to: any[] }, kind: 'address' | 'contact' | 'qual'): ChangeRow {
    const before = Array.isArray(value?.from) ? value.from : [];
    const after  = Array.isArray(value?.to)   ? value.to   : [];

    // Match strategy:
    //  - Address: by `type` (PERMANENT / TEMPORARY) — only one of each typically
    //  - emergencyContacts: by `name`
    //  - qualifications: by `degree+institution`
    const keyOf = (e: any): string => {
      if (kind === 'address') return String(e?.type ?? '');
      if (kind === 'contact') return String(e?.name ?? '').toLowerCase();
      return `${e?.degree ?? ''}|${e?.institution ?? ''}`.toLowerCase();
    };

    const beforeMap = new Map<string, any>();
    for (const e of before) beforeMap.set(keyOf(e), e);
    const afterMap = new Map<string, any>();
    for (const e of after)  afterMap.set(keyOf(e), e);

    const added: any[] = [];
    const removed: any[] = [];
    const changed: { before: any; after: any; diffs: { field: string; from: any; to: any }[] }[] = [];

    for (const [k, a] of afterMap) {
      const b = beforeMap.get(k);
      if (!b) { added.push(a); continue; }
      // Compute per-field differences within the matched pair
      const diffs: { field: string; from: any; to: any }[] = [];
      const fields = new Set([...Object.keys(b), ...Object.keys(a)]);
      for (const f of fields) {
        if (f === 'id' || f === 'createdAt' || f === 'updatedAt' || f === 'employeeId') continue;
        if (JSON.stringify(b[f] ?? null) !== JSON.stringify(a[f] ?? null)) {
          diffs.push({ field: f, from: b[f] ?? null, to: a[f] ?? null });
        }
      }
      if (diffs.length) changed.push({ before: b, after: a, diffs });
    }
    for (const [k, b] of beforeMap) {
      if (!afterMap.has(k)) removed.push(b);
    }

    return {
      field,
      label: this.fieldLabel(field),
      kind: 'relation',
      relationKind: kind,
      added, removed, changed,
    };
  }

  /** One-line summary for an Address / Contact / Qualification entry. */
  describeEntry(entry: any, kind: 'address' | 'contact' | 'qual' | undefined): string {
    if (!entry) return '—';
    if (kind === 'address') {
      const bits = [entry.line1, entry.line2, entry.city, entry.state, entry.country]
        .filter((x: any) => x && String(x).trim() !== '');
      const type = entry.type ? ` (${entry.type})` : '';
      return (bits.join(', ') || '—') + type;
    }
    if (kind === 'contact') {
      return [entry.name, entry.relationship && `(${entry.relationship})`, entry.phone]
        .filter(Boolean).join(' ');
    }
    // qualification
    return [entry.degree, entry.institution, entry.year && `(${entry.year})`]
      .filter(Boolean).join(' — ');
  }

  /** Friendly field label inside a relation entry's diff (e.g. "line1" → "Line 1"). */
  subFieldLabel(f: string): string {
    const map: Record<string, string> = {
      line1: 'Line 1', line2: 'Line 2', city: 'City', state: 'State',
      zipCode: 'Zip Code', country: 'Country', type: 'Type',
      name: 'Name', phone: 'Phone', relationship: 'Relationship',
      degree: 'Degree', institution: 'Institution', year: 'Year',
    };
    return map[f] || this.fieldLabel(f);
  }
  subValue(v: any): string {
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
  }

  sourceClass(s: string | null): string {
    switch (s) {
      case 'PROMOTION':   return 'src-prom';
      case 'RESIGNATION': return 'src-resign';
      case 'ONBOARDING':  return 'src-onb';
      case 'CRON':
      case 'SYSTEM':      return 'src-sys';
      case 'IMPORT':      return 'src-import';
      default:            return 'src-web';
    }
  }
  sourceLabel(s: string | null): string {
    switch (s) {
      case 'PROMOTION':   return 'Promotion';
      case 'RESIGNATION': return 'Resignation';
      case 'ONBOARDING':  return 'Onboarding';
      case 'CRON':        return 'Cron';
      case 'SYSTEM':      return 'System';
      case 'IMPORT':      return 'Bulk import';
      case 'MIGRATION':   return 'Migration';
      default:            return 'Manual edit';
    }
  }
  actionClass(a: string): string {
    switch (a) {
      case 'CREATE': return 'act-create';
      case 'DELETE': return 'act-delete';
      default:       return 'act-update';
    }
  }
}
