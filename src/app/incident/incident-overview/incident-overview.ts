import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { IncidentForm } from '../incident-form/incident-form';
import { IncidentTable } from '../incident-table/incident-table';
import { IncidentDetail } from '../incident-detail/incident-detail';
import { IncidentDashboard } from '../incident-dashboard/incident-dashboard';

/**
 * Incident module shell.
 *
 * Hosts four views, switched via tabs:
 *   • dashboard — KPIs / charts / actionable lists
 *   • list      — paginated table (with filters)
 *   • form      — create new incident
 *   • detail    — opened by clicking an incident in list / dashboard
 *
 * The detail view is special — it's not a tab but an overlay state set by
 * `selectedIncidentId`. Clicking back returns to whichever tab was active.
 */
@Component({
  selector: 'app-incident-overview',
  standalone: true,
  imports: [
    CommonModule,
    ModuleGuide,
    IncidentForm,
    IncidentTable,
    IncidentDetail,
    IncidentDashboard,
  ],
  templateUrl: './incident-overview.html',
  styleUrl: './incident-overview.css',
})
export class IncidentOverview implements OnInit {
  /** Active tab — 'dashboard' | 'list' | 'form' */
  active: 'dashboard' | 'list' | 'form' = 'dashboard';

  /** Set when user clicks a row → renders <app-incident-detail>. */
  selectedIncidentId: number | null = null;

  /** Forces the table to refetch (incremented after a successful create). */
  refreshTick = 0;

  reporterId: number = 0;
  isHR: boolean = false;
  isManagement: boolean = false;

  /** Dashboard is only meaningful for HR / Management — they see org-wide KPIs.
   *  Plain managers and regular employees are dropped onto "About Me" instead. */
  get canSeeDashboard(): boolean { return this.isHR || this.isManagement; }

  ngOnInit() {
    this.reporterId = Number(localStorage.getItem('empId')) || 0;
    const roleId = Number(localStorage.getItem('roleId'));
    this.isHR         = roleId === 1;
    this.isManagement = roleId === 4;

    // Default tab depends on role — HR/Mgmt land on the dashboard,
    // managers and other authorized users land on the list. Regular
    // employees see "Incidents involving me" via the Individual page,
    // not via this overview.
    this.active = this.canSeeDashboard ? 'dashboard' : 'list';
  }

  /* ─── Tab + detail navigation ─────────────── */
  show(tab: 'dashboard' | 'list' | 'form') {
    this.active = tab;
    this.selectedIncidentId = null;
  }

  /** Triggered by table / dashboard when a row is clicked. */
  openIncident(id: number) {
    this.selectedIncidentId = id;
  }

  backFromDetail() {
    this.selectedIncidentId = null;
  }

  /** Triggered when the form successfully creates an incident. */
  onCreated() {
    this.refreshTick++;
    this.active = 'list';        // jump to list so user sees their new row
  }
}
