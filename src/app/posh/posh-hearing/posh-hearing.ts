import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Posh } from '../../services/posh/posh';
import { DatePicker } from "primeng/datepicker";
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { Button, ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-posh-hearing',
  imports: [DatePicker, CommonModule, CardModule, TableModule, ButtonModule, ReactiveFormsModule, FormsModule,
    InputTextModule, TextareaModule, CheckboxModule, TooltipModule],
  templateUrl: './posh-hearing.html',
  styleUrl: './posh-hearing.css'
})
export class PoshHearing {
  @Input() caseId!: number;
  hearings: any[] = [];
  form: FormGroup;
  isLoading = false;
  role = localStorage.getItem('role') || '';

  // ICC roster pulled once per case so we can render attendance rows per hearing.
  committeeMembers: any[] = [];
  committeeName = '';

  // Per-hearing editable attendance state, keyed by hearingId.
  // attendanceByHearing[hearingId] = { [committeeMemberId]: { attended, remarks } }
  attendanceByHearing: Record<number, Record<number, { attended: boolean; remarks: string | null }>> = {};
  savingAttendance: Record<number, boolean> = {};
  expandedHearingId: number | null = null;

  constructor(
    private poshService: Posh,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      date: [null, Validators.required],
      notes: [''],
      outcome: [''],
      createdAt: [new Date()]
    });
  }

  ngOnInit() {
    if (this.caseId) {
      this.loadHearings();
      this.loadCommittee();
    }
  }

  loadHearings() {
    this.poshService.getHearings(this.caseId).subscribe(data => {
      this.hearings = data;
      // Seed attendance state from any rows already saved on the backend.
      for (const h of this.hearings) {
        const map: Record<number, { attended: boolean; remarks: string | null }> = {};
        for (const a of (h.attendees || [])) {
          map[a.committeeMemberId] = { attended: !!a.attended, remarks: a.remarks ?? '' };
        }
        this.attendanceByHearing[h.id] = map;
      }
    });
  }

  loadCommittee() {
    // The ack endpoint only returns INTERNAL members; for the quorum audit trail
    // we need the full active roster (incl. externals) so HR can record them.
    // The case list already includes committee.members — we re-fetch /posh and
    // pick the matching case for a stable, single source of truth.
    this.poshService.getAll().subscribe({
      next: (cases: any[]) => {
        const c = (cases || []).find((x: any) => x.id === this.caseId);
        const members = c?.committee?.members || [];
        this.committeeMembers = members.map((m: any) => ({
          committeeMemberId: m.id,
          employeeId: m.employeeId,
          role: m.role,
          name: m.employee
            ? `${m.employee.firstName ?? ''} ${m.employee.lastName ?? ''}`.trim()
            : (m.externalName || 'External member'),
          isExternal: !m.employeeId,
        }));
        this.committeeName = c?.committee?.name || '';
      },
      error: () => { /* No ICC configured — attendees panel will simply be empty. */ }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['caseId'] && changes['caseId'].currentValue) {
      this.loadHearings();
      this.loadCommittee();
    }
  }

  submit() {
    if (this.form.valid) {
      this.isLoading = true;
      this.poshService.addHearing(this.caseId, this.form.value).subscribe(() => {
        this.loadHearings();
        this.isLoading = false;
        this.form.reset({
          createdAt : new Date()
        });
      });
    }
  }

  isHR(): boolean {
    return this.role === 'HR' || this.role === 'HR Manager';
  }

  toggleAttendance(hearingId: number) {
    this.expandedHearingId = this.expandedHearingId === hearingId ? null : hearingId;
    // Ensure every committee member has a row, even if unsaved.
    const map = this.attendanceByHearing[hearingId] || {};
    for (const m of this.committeeMembers) {
      if (!map[m.committeeMemberId]) {
        map[m.committeeMemberId] = { attended: false, remarks: '' };
      }
    }
    this.attendanceByHearing[hearingId] = map;
  }

  attendedCount(hearingId: number): number {
    const map = this.attendanceByHearing[hearingId] || {};
    return Object.values(map).filter(r => r.attended).length;
  }

  saveAttendance(hearingId: number) {
    const map = this.attendanceByHearing[hearingId] || {};
    const attendees = Object.entries(map).map(([memberId, row]) => ({
      committeeMemberId: Number(memberId),
      attended: !!row.attended,
      remarks: row.remarks || null,
    }));
    this.savingAttendance[hearingId] = true;
    this.poshService.setHearingAttendees(hearingId, attendees).subscribe({
      next: () => { this.savingAttendance[hearingId] = false; this.loadHearings(); },
      error: () => { this.savingAttendance[hearingId] = false; }
    });
  }
}
