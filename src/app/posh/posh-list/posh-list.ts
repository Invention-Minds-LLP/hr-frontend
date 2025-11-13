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
import { Router } from '@angular/router';

@Component({
  selector: 'app-posh-list',
  imports: [CommonModule, ReactiveFormsModule, CardModule, TableModule, ButtonModule,
     TagModule, DialogModule, PoshForm, PoshHearing, SelectModule, FormsModule, TooltipModule],
  templateUrl: './posh-list.html',
  styleUrl: './posh-list.css'
})
export class PoshList {
  cases: any[] = [];
  showForm = false;
  showHearings = false;
  selectedCase: any;
  role = localStorage.getItem('role') || '';
  empId = '';
  currentPath: string = ''

  constructor(private poshService: Posh, private router: Router) {}

  ngOnInit() {
    this.loadCases();
    this.currentPath = this.router.url;
    this.empId = localStorage.getItem('empId') || '';
  }

  loadCases() {
    this.poshService.getAll().subscribe(data => {
      if (this.role === 'HR' || this.role === 'HR Manager') {
        // ✅ HR & HR Manager see all cases
        this.cases = data;
      } else {
        // ✅ Regular employees see only cases they filed
        this.cases = data.filter((c: any) => c.complainantId === Number(this.empId));
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

  statusColor(status: string):
  'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null | undefined {
  switch (status) {
    case 'FILED': return 'info';
    case 'UNDER_INVESTIGATION': return 'warn';
    case 'CLOSED': return 'success';
    case 'REJECTED': return 'danger';
    default: return 'secondary';
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
