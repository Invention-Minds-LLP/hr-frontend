// src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { Dashboard, DashboardResponse, List, ListKey, PipelineItem } from '../../services/dashboard/dashboard';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Announcements } from '../../services/announcement/announcements';
import { TableModule } from 'primeng/table';

type TileDef =
  | { key: 'leaves' | 'wfh' | 'permissions' | 'newJoiners' | 'birthdays' | 'anniversaries'; label: string; format?: undefined }
  | { key: 'late'; label: string; format: (v: DashboardResponse['today']['late']) => string }
  | { key: 'otYesterday'; label: string; format: (v: DashboardResponse['today']['otYesterday']) => string };

@Component({
  selector: 'app-hr-dashboard',
  imports: [CommonModule, FormsModule, DatePipe, TableModule],
  templateUrl: './hr-dashboard.html',
  styleUrl: './hr-dashboard.css'
})



export class HrDashboard implements OnInit {
  loading = false;
  error?: string;

  data?: DashboardResponse;
  // filters
  location = 'ALL';
  department = 'ALL';

  // modal
  modalOpen = false;
  selectedList?: List;
  selectedListKey?: ListKey;
  announcements: Array<{ id:number; title:string; ackCount:number; audienceCount:number; ackRate:number; ackPercent:number }> = [];


  today = new Date();
  private selectedAnnId?: number;

  // tiles like your sample
  tiles: TileDef[] = [
    { key: 'leaves', label: 'Leaves Today' },
    { key: 'wfh', label: 'WFH Today' },
    { key: 'permissions', label: 'Permissions Today' },
    { key: 'late', label: 'Late Arrivals', format: (v) => `${v.count} · ${v.medianMins}m med` },
    { key: 'otYesterday', label: 'OT Yesterday', format: (v) => `${v.hours}h${v.cost ? ' · ' + v.cost : ''}` },
    { key: 'newJoiners', label: 'New Joiners Today' },
    { key: 'birthdays', label: 'Birthdays' },
    { key: 'anniversaries', label: 'Work Anniversaries' },
  ];
  ackRate = 0; // 0..1
  latestAnnTitle = '';
  
  constructor(private api: Dashboard, private announcement: Announcements) { }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = undefined;
    console.log('checking')
    this.api.getDashboard({ location: this.location, department: this.department })
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: (resp) => {
        this.data = resp;
        // if backend already returns 'announcements' + 'latestAnnouncement'
        this.announcements = resp.announcements || [];
        if (resp.latestAnnouncement) {
          this.latestAnnTitle = resp.latestAnnouncement.title;
          this.ackRate = resp.latestAnnouncement.ackRate ?? 0;
        } else {
          // fallback if not provided: derive from list
          const latest = this.announcements[0];
          this.latestAnnTitle = latest?.title || '';
          this.ackRate = latest?.ackRate || 0;
        }
      },
      error: (err) => {
        this.error = err?.error?.error || err.message || 'Failed to load dashboard';
        this.announcements = [];
        this.latestAnnTitle = '';
        this.ackRate = 0;
      },
    });
    console.log(this.data)
  }

  onLocationChange(v: string) { this.location = v; this.load(); }
  onDeptChange(v: string) { this.department = v; this.load(); }

  // ack helpers
  ackPercent(): number {
    if (!this.data) return 0;
    return Math.round((this.data.today.announcementsAck || 0) * 100);
  }
  ackBarClass(): string {
    const p = this.ackPercent();
    if (p >= 85) return 'bar good';
    if (p >= 70) return 'bar warn';
    return 'bar danger';
  }
  showBar(p: PipelineItem): boolean {
    // Jobs Open is not part of the applicant funnel
    return p.name !== 'Jobs Open';
  }

  // attention count for "My approvals" chip from attention array
  pendingApprovalsCount(): number {
    const row = this.data?.attention.find(a => a.label.toLowerCase().includes('pending approvals'));
    return row?.count || 0;
  }

  // drilldown modal
  openList(key: ListKey | string, labelFallback?: string) {
    // NEW: include the tile-specific keys we add on the server
    const map: Record<string, ListKey> = {
      'Leaves Today': 'leaves',
      'WFH Today': 'wfh',
      'Permissions Today': 'permissions',
      'Late Arrivals': 'late',
      'OT Yesterday': 'ot',
      'New Joiners Today': 'joiners',
      'Birthdays Today': 'birthdays',
      'Anniversaries Today': 'anniversaries',
  
      // keep your existing attention modals too
      'Unmarked attendance (by 11:00)': 'unmarked',
      'Pending approvals (Leave/WFH/Perm)': 'approvals',
      'Probation ending (7 days)': 'probation',
      'Documents expiring (30 days)': 'docs',
      // 'Interviews missing feedback': 'feedback',
      'Offers awaiting signature (7d)': 'offersPendingSignature',
      'Exit clearances overdue': 'clearances',
    };
  
    const known: ListKey[] = [
      'unmarked','approvals','probation','docs','offersPendingSignature','clearances',
      'leaves','wfh','permissions','late','ot','joiners','birthdays','anniversaries'
    ];
  
    const k = (known as string[]).includes(String(key))
      ? (key as ListKey)
      : (map[labelFallback || String(key)] ?? 'unmarked');
  
    this.api.getList(k).subscribe({
      next: (list) => {
        this.selectedListKey = k;
        this.selectedList = list;
        this.modalOpen = true;
      },
      error: () => { /* quiet for demo */ },
    });
  }
  
  closeModal() { this.modalOpen = false; this.selectedList = undefined; this.selectedListKey = undefined; }

  // utils for *ngFor
  trackByIndex(_i: number) { return _i; }
  trackPipeline(_i: number, x: PipelineItem) { return x.name; }

  // tiny toast for demo
  toast(msg: string) { alert(msg); }
  // inside DashboardComponent class:
  calcPipeWidth(p: PipelineItem, arr: PipelineItem[]): number {
    const applied = arr.find(x => x.name === 'Applied')?.value || 1;
    const ratio = p.name === 'Applied' ? 100 : Math.min(100, (p.value / applied) * 100);
    return Math.round(ratio);
  }
  getTileValue(t: TileDef): string {
    if (!this.data) return '';
    const T = this.data.today;
    switch (t.key) {
      case 'late':
        return `${T.late.count}`;
      case 'otYesterday':
        // return `${T.otYesterday.hours}h${T.otYesterday.cost ? ' · ' + T.otYesterday.cost : ''}`;
        return String(T.otYesterday.count ?? 0);
      case 'leaves':
        return String(T.leaves);
      case 'wfh':
        return String(T.wfh);
      case 'permissions':
        return String(T.permissions);
      case 'newJoiners':
        return String(T.newJoiners);
      case 'birthdays':
        return String(T.birthdays);
      case 'anniversaries':
        return String(T.anniversaries);
    }
  }

  ackPercentOf(a: { ackPercent:number }) { return a?.ackPercent ?? 0; }
  openAnnAckSummary(announcementId: number) {
    this.selectedAnnId = announcementId;
    this.api.getList({ key: 'annAck', id: String(announcementId) }).subscribe({
      next: (list) => {
        this.selectedListKey = 'annAck' as any;
        this.selectedList = list;
        this.modalOpen = true;
      },
    });
  }
  
  openAnnAckPending(announcementId: number, departmentId?: number) {
    const params: any = { key: 'annAckPending', id: String(announcementId) };
    if (departmentId != null) params.departmentId = String(departmentId);
    this.api.getList(params).subscribe({
      next: (list) => {
        this.selectedListKey = 'annAckPending' as any;
        this.selectedList = list;
        this.modalOpen = true;
      },
    });
  }
  
  onListAction(action: string) {
    // Route "View pending" to the pending drilldown for this announcement
    if (this.selectedListKey === ('annAck' as any) && action === 'View pending' && this.selectedAnnId) {
      this.openAnnAckPending(this.selectedAnnId); // no dept filter = whole audience
      return;
    }
    // default behavior from before
    this.toast(action);
  }
}
