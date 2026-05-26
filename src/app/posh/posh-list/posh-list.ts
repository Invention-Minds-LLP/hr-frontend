import { Component } from '@angular/core';
import { Posh } from '../../services/posh/posh';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { PoshForm } from '../posh-form/posh-form';
import { PoshHearing } from '../posh-hearing/posh-hearing';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { Router } from '@angular/router';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { Grievance } from '../../services/grievance/grievance';

@Component({
  selector: 'app-posh-list',
  imports: [CommonModule, ReactiveFormsModule, CardModule, TableModule, ButtonModule,
     TagModule, DialogModule, PoshForm, PoshHearing, SelectModule, FormsModule, TooltipModule, SkeletonModule, ModuleGuide],
  templateUrl: './posh-list.html',
  styleUrl: './posh-list.css'
})
export class PoshList {
  cases: any[] = [];
  showForm = false;
  showHearings = false;
  showDetails = false;
  selectedCase: any;
  role = localStorage.getItem('role') || '';
  empId = '';
  loading = true
  currentPath: string = ''

  // Committee + acknowledgement progress for the case currently in view.
  committeeInfo: any = null;
  loadingCommittee = false;
  ackingCase = false;
  iHaveAcknowledged = false;

  constructor(
    private poshService: Posh,
    private router: Router,
    private grievanceService: Grievance,
  ) {}

  ngOnInit() {
    this.empId = localStorage.getItem('empId') || '';
    this.currentPath = this.router.url;
    this.loadCases();
  }

  loadCases() {
    this.loading = true
    this.poshService.getAll().subscribe(data => {
      const isHR = this.role === 'HR' || this.role === 'HR Manager';
      const onIndividualPage = this.currentPath === '/individual';

      if (isHR && !onIndividualPage) {
        // HR/HR Manager on the admin page → see every case
        this.cases = data;
        setTimeout(() => { this.loading = false; }, 2000);
      } else {
        // Anyone on /individual (incl. HR), or non-HR anywhere → only cases they filed
        this.cases = data.filter((c: any) => c.complainantId === Number(this.empId));
        this.loading = false;
      }
    });
  }

  openForm() {
    this.showForm = true;
  }

  openHearings(caseData: any) {
    console.log(caseData);
    this.selectedCase = caseData;
    this.showHearings = true;
  }

  viewCase(caseData: any) {
    this.selectedCase = caseData;
    this.showDetails = true;
    this.loadCommitteeAcks(caseData.id);
  }

  loadCommitteeAcks(caseId: number) {
    this.committeeInfo = null;
    this.iHaveAcknowledged = false;
    this.loadingCommittee = true;
    this.poshService.getCommitteeAcks(caseId).subscribe({
      next: (info) => {
        this.committeeInfo = info;
        const me = Number(this.empId);
        this.iHaveAcknowledged = (info?.members || []).some(
          (m: any) => m.employeeId === me && m.acknowledged
        );
        this.loadingCommittee = false;
      },
      error: () => { this.loadingCommittee = false; }
    });
  }

  acknowledgeCase() {
    if (!this.selectedCase || this.ackingCase || this.iHaveAcknowledged) return;
    this.ackingCase = true;
    // POSH acknowledgements reuse the grievance acknowledgement endpoint
    // with poshCaseId instead of grievanceId.
    this.grievanceService.createAcknowledgement({
      employeeId: Number(this.empId),
      poshCaseId: this.selectedCase.id
    }).subscribe({
      next: () => {
        this.ackingCase = false;
        this.iHaveAcknowledged = true;
        this.loadCommitteeAcks(this.selectedCase.id);
      },
      error: () => { this.ackingCase = false; }
    });
  }

  iAmACommitteeMember(): boolean {
    if (!this.committeeInfo?.members?.length) return false;
    const me = Number(this.empId);
    return this.committeeInfo.members.some((m: any) => m.employeeId === me);
  }

//   statusColor(status: string):
//   'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null | undefined {
//   switch (status) {
//     case 'FILED': return 'info';
//     case 'UNDER_INVESTIGATION': return 'warn';
//     case 'CLOSED': return 'success';
//     case 'REJECTED': return 'danger';
//     default: return 'secondary';
//   }
// }

statusClass(status: string) {
  switch (status) {
    case 'FILED': return 'tag-filed';
    case 'UNDER_INVESTIGATION': return 'tag-investigation';
    case 'CLOSED': return 'tag-closed';
    case 'REJECTED': return 'tag-rejected';
    default: return 'tag-default';
  }
}


  statusOptions = [
    { label: 'Filed', value: 'FILED' },
    { label: 'Under Investigation', value: 'UNDER_INVESTIGATION' },
    { label: 'Closed', value: 'CLOSED' },
    { label: 'Rejected', value: 'REJECTED' }
  ];
  
  changeStatus(caseData: any) {
    this.poshService.updateStatus(caseData.id, caseData.status).subscribe(() => {
      this.loadCases();
    });
  }
  
}
