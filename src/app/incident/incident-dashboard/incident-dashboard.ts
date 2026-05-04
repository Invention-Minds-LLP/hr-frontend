import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { Incident } from '../../services/incident/incident';

/**
 * Incident Dashboard — single-fetch widget grid powered by
 * GET /api/incidents/dashboard. Displays KPIs + breakdowns + actionable
 * lists. Click any incident-id link to open the detail page.
 */
@Component({
  selector: 'app-incident-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, TooltipModule],
  templateUrl: './incident-dashboard.html',
  styleUrl: './incident-dashboard.css',
})
export class IncidentDashboard implements OnInit {
  /** Emit incident id when a row in any list is clicked. */
  @Output() open = new EventEmitter<number>();

  data: any = null;
  loading = false;

  private api = inject(Incident);

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getDashboard().subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  /* ── UI helpers ─────────────────────────────── */
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
  /** Width % for a bar chart relative to the largest bar. */
  pct(value: number, max: number): number {
    if (!max) return 0;
    return Math.round((value / max) * 100);
  }
  /** Largest count in a `[{count}]` list. */
  maxOf(list: { count: number }[] | undefined): number {
    if (!list?.length) return 0;
    return list.reduce((m, x) => (x.count > m ? x.count : m), 0);
  }
  /** Pretty month label for trend bars: "2026-04" → "Apr 26". */
  fmtMonth(monthKey: string): string {
    if (!monthKey) return '';
    const [y, m] = monthKey.split('-').map(Number);
    if (!y || !m) return monthKey;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[m - 1]} ${String(y).slice(2)}`;
  }
  /** Friendly label for a snake-case action ("STATUS_CHANGED" → "Status Changed"). */
  fmtAction(a: string): string {
    if (!a) return '';
    return a.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
