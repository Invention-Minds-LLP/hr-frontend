import { Component } from '@angular/core';
import { Grievance } from '../../services/grievance/grievance';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { GrievanceForm } from '../grievance-form/grievance-form';
import { Button, ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { Router } from '@angular/router';
import { CalendarTooltipDirective } from "angular-calendar";
import { ModuleGuide } from '../../shared/module-guide/module-guide';

@Component({
  selector: 'app-grievance-list',
  imports: [TableModule, CardModule, GrievanceForm, CardModule, ButtonModule, TagModule,
    DialogModule, CommonModule, SelectModule, ReactiveFormsModule, FormsModule, InputTextModule, TextareaModule, TooltipModule, SkeletonModule, CalendarTooltipDirective, ModuleGuide],
  templateUrl: './grievance-list.html',
  styleUrl: './grievance-list.css'
})
export class GrievanceList {
  grievances: any[] = [];
  showForm = false;
  showDetails = false;

  selected: any = null;
  newComment = '';
  role = '';
  empId = '';
  loading = true
  currentPath: string  = '';
  isLoading = false;

  // Committee + acknowledgement progress for the case currently in view.
  committeeInfo: any = null;
  loadingCommittee = false;
  ackingCase = false;
  iHaveAcknowledged = false;

  statuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];
  statusOptions = this.statuses.map(s => ({ label: s, value: s }));

  constructor(private grievanceService: Grievance,private router: Router) {}

  ngOnInit() {
    this.role = localStorage.getItem('role') || '';
    this.empId = localStorage.getItem('empId') || '';
    this.currentPath = this.router.url;
    this.loadGrievances();
  }

  loadGrievances() {
    this.loading = true
    this.grievanceService.getAll().subscribe(data => {
      const isHR = this.role === 'HR' || this.role === 'HR Manager';
      const onIndividualPage = this.currentPath === '/individual';

      if (isHR && !onIndividualPage) {
        // HR/HR Manager on the admin page → see every grievance
        this.grievances = data;
        setTimeout(() => { this.loading = false; }, 2000);
      } else {
        // Anyone on /individual (incl. HR), or non-HR anywhere → only their own
        this.grievances = data.filter((g: any) => g.employeeId === Number(this.empId));
        this.loading = false;
      }
    });

  }

  openForm() {
    this.showForm = true;
  }

  view(g: any) {
    this.selected = g;
    this.showDetails = true;
    this.newComment = '';
    this.loadCommitteeAcks(g.id);
  }

  loadCommitteeAcks(grievanceId: number) {
    this.committeeInfo = null;
    this.iHaveAcknowledged = false;
    this.loadingCommittee = true;
    this.grievanceService.getCommitteeAcks(grievanceId).subscribe({
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
    if (!this.selected || this.ackingCase || this.iHaveAcknowledged) return;
    this.ackingCase = true;
    this.grievanceService.createAcknowledgement({
      employeeId: Number(this.empId),
      grievanceId: this.selected.id
    }).subscribe({
      next: () => {
        this.ackingCase = false;
        this.iHaveAcknowledged = true;
        this.loadCommitteeAcks(this.selected.id);
      },
      error: () => { this.ackingCase = false; }
    });
  }

  addComment() {
    if (!this.newComment.trim()) return;
    this.isLoading = true;
    this.grievanceService.addComment(this.selected.id, {
      employeeId: localStorage.getItem('empId'), // 👈 TODO: replace with logged-in employee id
      comment: this.newComment
    }).subscribe(c => {
      this.selected.comments.push(c);
      this.newComment = '';
      this.isLoading = false;
    });
  }

  updateStatus(g: any) {
    this.grievanceService.updateStatus(g.id, g.status)
      .subscribe(updated => {
        g.status = updated.status; // sync with backend
      });
  }

  // Used by template — true if the logged-in user is an internal member
  // of the committee handling the currently-viewed case.
  iAmACommitteeMember(): boolean {
    if (!this.committeeInfo?.members?.length) return false;
    const me = Number(this.empId);
    return this.committeeInfo.members.some((m: any) => m.employeeId === me);
  }
}
