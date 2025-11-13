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

@Component({
  selector: 'app-grievance-list',
  imports: [TableModule, CardModule, GrievanceForm, CardModule, ButtonModule,TagModule,
     DialogModule, CommonModule, SelectModule, ReactiveFormsModule, FormsModule, InputTextModule, TextareaModule, TooltipModule, SkeletonModule],
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
  currentPath: string  = ''

  statuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];
  statusOptions = this.statuses.map(s => ({ label: s, value: s }));

  constructor(private grievanceService: Grievance,private router: Router) {}

  ngOnInit() {
    this.role = localStorage.getItem('role') || '';
    this.empId = localStorage.getItem('empId') || '';
    this.loadGrievances();
    this.currentPath = this.router.url;
  }

  loadGrievances() {
    this.loading = true
    this.grievanceService.getAll().subscribe(data => {
      if (this.role === 'HR' || this.role === 'HR Manager') {
        // ✅ HR & HR Manager see all grievances
        this.grievances = data;
        setTimeout(()=>{
          this.loading = false
        },2000)
      } else {
        // ✅ Regular employee sees only their grievances
        this.grievances = data.filter((g: any) => g.employeeId === this.empId);
        this.loading = false
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
  }

  addComment() {
    if (!this.newComment.trim()) return;
    this.grievanceService.addComment(this.selected.id, {
      employeeId: localStorage.getItem('empId'), // 👈 TODO: replace with logged-in employee id
      comment: this.newComment
    }).subscribe(c => {
      this.selected.comments.push(c);
      this.newComment = '';
    });
  }

  updateStatus(g: any) {
    this.grievanceService.updateStatus(g.id, g.status)
      .subscribe(updated => {
        g.status = updated.status; // sync with backend
      });
  }
  
}
