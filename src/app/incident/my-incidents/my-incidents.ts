import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { Incident } from '../../services/incident/incident';

/**
 * "Incidents involving me" — the employee-facing self-portal section.
 *
 * Shown inside the Individual page. This is a REDACTED view of the incident
 * data — the backend only returns the subject's own row, and only after the
 * case has been formally acknowledged (status > OPEN). Reporter, witnesses,
 * attachments, internal HR comments, and audit log are never returned by
 * the backend, so there is no way to leak them from here.
 *
 * Two states:
 *   • List   — table of my-as-subject cases.
 *   • Detail — single case with non-internal comments + my own statement
 *              composer + verdict (visible only after RESOLVED).
 */
@Component({
  selector: 'app-my-incidents',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, TextareaModule, TagModule, TooltipModule, ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './my-incidents.html',
  styleUrl: './my-incidents.css',
})
export class MyIncidents implements OnInit {
  private api   = inject(Incident);
  private toast = inject(MessageService);

  /* ── State ──────────────────────────────────────── */
  rows: any[] = [];
  loadingList = false;

  /** Currently-opened incident (null = list view). */
  selected: any = null;
  loadingDetail = false;

  /** Statement composer */
  newStatement = '';
  posting = false;

  ngOnInit() { this.loadList(); }

  /* ── List ───────────────────────────────────────── */
  loadList() {
    this.loadingList = true;
    this.api.listMyIncidents().subscribe({
      next: (res) => {
        this.rows = res?.rows ?? [];
        this.loadingList = false;
      },
      error: () => { this.loadingList = false; },
    });
  }

  /* ── Detail ─────────────────────────────────────── */
  open(row: any) {
    this.selected = null;
    this.loadingDetail = true;
    this.newStatement = '';
    this.api.getMyIncident(row.id).subscribe({
      next: (inc) => { this.selected = inc; this.loadingDetail = false; },
      error: () => {
        this.loadingDetail = false;
        this.toast.add({ severity: 'error', summary: 'Cannot open', detail: 'Could not load this incident.' });
      },
    });
  }

  back() {
    this.selected = null;
  }

  /* ── Subject statement ──────────────────────────── */
  postStatement() {
    if (!this.selected || !this.newStatement.trim()) return;
    this.posting = true;
    this.api.addMyComment(this.selected.id, this.newStatement.trim()).subscribe({
      next: (c) => {
        this.posting = false;
        this.selected.comments = [...(this.selected.comments ?? []), c];
        this.newStatement = '';
        this.toast.add({ severity: 'success', summary: 'Statement recorded', detail: 'HR will see your response.' });
      },
      error: (err) => {
        this.posting = false;
        this.toast.add({
          severity: 'error',
          summary: 'Could not post',
          detail: err?.error?.error ?? 'Try again in a moment.',
        });
      },
    });
  }

  /** Subject can only post while the case is between ACKNOWLEDGED and RESOLVED. */
  get canPostStatement(): boolean {
    if (!this.selected) return false;
    return ['ACKNOWLEDGED','INVESTIGATING','ESCALATED','RESOLVED'].includes(this.selected.status);
  }

  /** Outcome panel only visible after RESOLVED. */
  get hasVerdict(): boolean {
    if (!this.selected) return false;
    return ['RESOLVED','CLOSED'].includes(this.selected.status);
  }

  /* ── UI helpers ─────────────────────────────────── */
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
      case 'CLOSED':       case 'RESOLVED':   return 'st-good';
      case 'ESCALATED':                       return 'st-danger';
      case 'INVESTIGATING':                   return 'st-info';
      case 'ACKNOWLEDGED':                    return 'st-info';
      case 'REJECTED': case 'DUPLICATE':
      case 'WITHDRAWN':                       return 'st-neutral';
      default:                                return 'st-warn';
    }
  }
  outcomeLabel(o: string | null): string {
    if (!o) return '—';
    return o.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  myEmpId(): number {
    return Number(localStorage.getItem('empId')) || 0;
  }
}
