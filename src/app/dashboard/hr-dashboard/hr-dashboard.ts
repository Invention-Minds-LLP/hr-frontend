// src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { Dashboard, DashboardResponse, List, ListKey, PipelineItem } from '../../services/dashboard/dashboard';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Announcements } from '../../services/announcement/announcements';
import { TableModule } from 'primeng/table';
import { Branches, Branch } from '../../services/branches/branches'  // adjust path
import { Departments, Department } from '../../services/departments/departments';
import { MessageService } from 'primeng/api';
import { RouterLink, RouterModule } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { AnnouncementForm } from "../../announcements/announcement-form/announcement-form";
import { DialogModule } from 'primeng/dialog';
import { DatePicker, DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { Employees } from '../../services/employees/employees';
import { Select } from "primeng/select";


type TileDef =
  | { key: 'leaves' | 'wfh' | 'permissions' | 'newJoiners' | 'birthdays' | 'anniversaries'; label: string; format?: undefined }
  | { key: 'late'; label: string; format: (v: DashboardResponse['today']['late']) => string }
  | { key: 'otYesterday'; label: string; format: (v: DashboardResponse['today']['otYesterday']) => string };

@Component({
  selector: 'app-hr-dashboard',
  imports: [CommonModule, FormsModule, DatePipe, TableModule,
    DialogModule, DatePickerModule, ButtonModule,
    RouterModule, RouterLink, TooltipModule, AnnouncementForm, Select],
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
  showAnnouncementForm: boolean = false;

  // modal
  modalOpen = false;
  selectedList?: List;
  selectedListKey?: ListKey;
  announcements: Array<{ id: number; title: string; ackCount: number; audienceCount: number; ackRate: number; ackPercent: number }> = [];


  today = new Date();
  private selectedAnnId?: number;
  assignDelegateDialog = false;
selectedDelegateId: number | null = null;
employeeOptions: any[] = [];
selectedClearance: any = null; // the row we are assigning delegate for

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
  branches: Branch[] = [];
  departments: Department[] = [];


  constructor(private api: Dashboard, private announcement: Announcements,
    private branchesSvc: Branches,
    private departmentsSvc: Departments,
    private messageService: MessageService,
    private employees: Employees,
  ) { }
  branchId: number | null = null;
  departmentId: number | null = null;

  onLocationChangeById(id: number | null) {
    this.branchId = id;
    this.location = 'ALL'; // optional, unused when id present
    this.load();
  }
  onDeptChangeById(id: number | null) {
    this.departmentId = id;
    this.department = 'ALL'; // optional, unused when id present
    this.load();
  }

  ngOnInit(): void {
    this.departmentsSvc.getDepartments().subscribe({
      next: (rows) => (this.departments = rows || []),
      error: () => (this.departments = []),
    });
    this.branchesSvc.getBranches().subscribe({
      next: (rows) => (this.branches = rows || []),
      error: () => (this.branches = []),
    });
    this.employees.getEmployees().subscribe(list => {
      this.employeeOptions = list.map(e => ({
        id: e.id,
        label: `${e.firstName} ${e.lastName} (${e.employeeCode})`
      }));
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = undefined;
    console.log('checking')
    this.api.getDashboard({
      location: this.location, department: this.department, ...(this.branchId != null ? { branchId: this.branchId } : {}),
      ...(this.departmentId != null ? { departmentId: this.departmentId } : {}),
    })
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
  openAnnoucementForm() {
    this.showAnnouncementForm = true;
  }

  closePopup() {
    this.showAnnouncementForm = false;
  }

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
    console.log('openList called with:', key, labelFallback);
    console.trace();
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
      'OT pending approval (yesterday)': 'otPending',
    };

    const known: ListKey[] = [
      'unmarked', 'approvals', 'probation', 'docs', 'offersPendingSignature', 'clearances',
      'leaves', 'wfh', 'permissions', 'late', 'ot', 'joiners', 'birthdays', 'anniversaries', 'otPending'
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

  closeModal() { this.modalOpen = false; this.selectedList = undefined; this.selectedListKey = undefined; this.selectedRows = null; }

  // utils for *ngFor
  trackByIndex(_i: number) { return _i; }
  trackPipeline(_i: number, x: PipelineItem) { return x.name; }

  // tiny toast for demo
  toast(msg: string) {
    //  alert(msg); 
    this.messageService.add({
      severity: 'info',
      summary: 'Action',
      detail: msg
    })
  }
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

  ackPercentOf(a: { ackPercent: number }) { return a?.ackPercent ?? 0; }
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

  selectedRows: any = null;
  selectedRow: any;

  // onListAction(action: string) {
  //   // --- Case 1: Announcement Acks → View pending
  //   if (this.selectedListKey === ('annAck' as any) && action === 'View pending' && this.selectedAnnId) {
  //     this.openAnnAckPending(this.selectedAnnId); // no dept filter = whole audience
  //     return;
  //   }

  //   // --- Case 2: OT Approval/Rejection
  //   if ((action === 'Approve selected' || action === 'Reject selected') && this.selectedRows.length) {
  //     const ids = this.selectedRows.map(r => r.id);
  //     this.api
  //       .approveOrRejectOT(ids, action.startsWith('Approve') ? 'APPROVE' : 'REJECT')
  //       .subscribe(() => {
  //         this.closeModal();
  //         // this.reloadData(); // refresh dashboard
  //       });
  //     return;
  //   }

  //   // --- Default fallback
  //   this.toast(action);
  // }

  getTooltipMessage(tile: any): string {
    const tooltips: { [key: string]: string } = {
      leaves: "Number of employees on approved leave today.",
      wfh: "Number of employees working from home with approval today.",
      permissions: "Number of employees with approved short permissions (late arrival or early exit) today.",
      late: "Number of employees who arrived later than their scheduled start time today.",
      otYesterday: "Number of employees who worked overtime yesterday.",
      newJoiners: "Number of employees whose joining date is today.",
      birthdays: "Number of employees celebrating their birthday today.",
      anniversaries: "Number of employees completing a work anniversary today."
    };

    return tooltips[tile.key] || "";
  }
  reloadData() {
    this.load();
    this.closeModal();
    this.selectedRows = null;
  }
  extendProbationDialog = false;
  selectedDate: Date | null = null;
  minDate: Date = new Date();   // prevents picking past dates

  // Open dialog when action triggered


  // Confirm API call after choosing date
  confirmExtendProbation() {
    if (this.selectedRows && this.selectedDate) {
      const employee = this.selectedRows;
      const formattedDate = this.selectedDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

      this.api.extendProbation(employee.id, formattedDate).subscribe(() => {
        this.toast('Probation extended');
        this.reloadData();
        this.extendProbationDialog = false;
        this.selectedDate = null;
      });
    }
  }


  onListAction(action: string) {
    if (!this.selectedListKey) return;
    // --- Case 1: Announcement Acks → View pending
    if (this.selectedListKey === ('annAck' as any) && action === 'View pending' && this.selectedAnnId) {
      this.openAnnAckPending(this.selectedAnnId); // no dept filter = whole audience
      return;
    }

    // --- Case 2: OT Approval/Rejection
    if ((action === 'Approve selected' || action === 'Reject selected') && this.selectedRows.length) {
      const ids = this.selectedRows.map((r: any) => r.id);
      this.api
        .approveOrRejectOT(ids, action.startsWith('Approve') ? 'APPROVE' : 'REJECT')
        .subscribe(() => {
          // this.closeModal();
          this.reloadData(); // refresh dashboard
        });
      return;
    }

    console.log(this.selectedListKey, action, this.selectedRows);

    switch (this.selectedListKey) {
      case 'unmarked':
        if (action === 'Message all') {
          const employeeIds = this.selectedRows.map((r: any) => r.id);
          this.api.messageUnmarked(employeeIds, 'Please mark attendance').subscribe(() => {
            this.toast('Message sent to unmarked employees');
            this.reloadData();
          });
        }
        if (action === 'Mark exception') {
          const employeeIds = this.selectedRows.map((r: any) => r.id);
          this.api.markUnmarkedException(employeeIds).subscribe(() => {
            this.toast('Attendance exceptions marked');
            this.reloadData();
          });
        }
        break;

      case 'approvals':
        if (action === 'Approve all') {
          this.api.approveApprovals({ leaveIds: [], wfhIds: [], permissionIds: [] }).subscribe(() => {
            this.toast('All pending approvals approved');
            this.reloadData();
          });
        }
        if (action === 'Reject all') {
          this.api.rejectApprovals({ leaveIds: [], wfhIds: [], permissionIds: [], reason: 'Rejected by HR' }).subscribe(() => {
            this.toast('All pending approvals rejected');
            this.reloadData();
          });
        }
        break;

      case 'probation':
        if (action === 'Request feedback') {
          const employeeIds = this.selectedRows.map((r: any) => r.id);
          this.api.requestFeedback(employeeIds).subscribe(() => {
            this.toast('Feedback requested from managers');
            this.reloadData();
          });
        }
        if (action === 'Extend probation') {
          // if (!this.selectedRow || this.selectedRow.length !== 1) {
          //   this.toast('Please select exactly one employee');
          //   return;
          // }
          // const employee = this.selectedRow;
          // console.log('Extending probation for employee:', employee);
          // this.api.extendProbation(employee.id, '2025-12-31').subscribe(() => {
          //   this.toast('Probation extended');
          //   this.reloadData();
          // });
          this.extendProbationDialog = true;
        }
        break;

      case 'docs':
        if (action === 'Notify all') {
          const documentIds = this.selectedRows.map((r: any) => r.id);
          this.api.notifyDocs(documentIds).subscribe(() => {
            this.toast('Employees notified about expiring documents');
            this.reloadData();
          });
        }
        if (action === 'Create renewal tickets') {
          const documentIds = this.selectedRows.map((r: any) => r.id);
          this.api.createRenewalTickets(documentIds).subscribe(() => {
            this.toast('Renewal tickets created');
            this.reloadData();
          });
        }
        break;

      case 'feedback':
        if (action === 'Nudge panel') {
          const interviewIds = this.selectedRows.map((r: any) => r.id);
          this.api.nudgePanel(interviewIds).subscribe(() => {
            this.toast('Panels nudged for feedback');
            this.reloadData();
          });
        }
        if (action === 'Reassign reviewer') {
          const interview = this.selectedRows[0];
          this.api.reassignReviewer(interview.id, [123, 456]).subscribe(() => {
            this.toast('Reviewer reassigned');
            this.reloadData();
          });
        }
        break;
      case 'clearances':
        if (action === 'Escalate') {
          // Collect resignationId + type pairs
          const items = this.selectedRows.map((r: any) => ({
            resignationId: r.resignationId,
            type: r.data[3]
          }));

          this.api.escalateClearances(items).subscribe(() => {
            this.toast('Clearances escalated');
            this.reloadData();
          });
        }
        if (action === 'Assign delegate') {
          this.selectedClearance = this.selectedRows[0]; // store row
          this.assignDelegateDialog = true; // open dialog
        }

        break;


      default:
        this.toast(action);
    }
  }

  confirmAssignDelegate() {
    if (this.selectedClearance && this.selectedDelegateId) {
      this.api.assignDelegate(
        this.selectedClearance.resignationId,   // resignationId
        this.selectedClearance.data[3],         // clearance type
        this.selectedDelegateId                 // picked delegate
      ).subscribe(() => {
        this.toast('Delegate assigned');
        this.reloadData();
        this.assignDelegateDialog = false;
        this.selectedDelegateId = null;
      });
    }
  }
}
