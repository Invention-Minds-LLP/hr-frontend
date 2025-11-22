import { Component, inject, signal, OnInit, Output,EventEmitter } from '@angular/core';
import { CardModule } from 'primeng/card';
import { Recuriting } from '../../services/recruiting/recuriting';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CandidateEvalForm } from '../../candidate-eval-form/candidate-eval-form';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-my-interview',
  imports: [CardModule, TableModule, CommonModule, ReactiveFormsModule, CandidateEvalForm, ButtonModule, TagModule, SkeletonModule],
  templateUrl: './my-interview.html',
  styleUrl: './my-interview.css'
})
export class MyInterview {
  private svc = inject(Recuriting);
  rows = signal<any[]>([]);
  @Output() evaluate = new EventEmitter<any>();
  selectedInterview = signal<any | null>(null);
  loading = true

  ngOnInit() { 
    setTimeout(()=>{
    this.loading = true
    this.load();
      this.loading = false
    }, 4000)
   }

  load() {
    const empId = Number(localStorage.getItem('empId'));
  
    this.svc.getPanelInterview(empId).subscribe({
      next: (data) => {
        const processed = (data || []).map((interview: any) => {
          // find feedback for this panel user
          const myFeedback = interview.InterviewFeedback?.find(
            (f: any) => Number(f.panelUserId) === empId
          );
  
          // determine status text
          const isSubmitted = (myFeedback?.status ?? '').toUpperCase() === 'SUBMITTED';
          const displayStatus = isSubmitted ? 'Interviewed' : 'Pending';
  
          // optional: compute average score
          const avgScore = myFeedback?.average ?? '—';
  
          return {
            ...interview,
            displayStatus,
            avgScore,
          };
        });
  
        this.rows.set(processed);
      },
      error: () => this.rows.set([]),
    });
  }
  

  onEvaluate(row:any){
    this.selectedInterview.set(row);
  }
}
