import { Component } from '@angular/core';
import { Resignation } from '../../services/resignation/resignation';
import { ExitInterview } from '../exit-interview/exit-interview';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';


@Component({
  selector: 'app-exit-interview-list',
  imports: [ExitInterview, CommonModule, TableModule, FormsModule,ButtonModule],
  templateUrl: './exit-interview-list.html',
  styleUrl: './exit-interview-list.css'
})
export class ExitInterviewList {
  exitInterviews: any[] = [];
  loading = false;
  selectedInterview: any = null;

  constructor(private exitService: Resignation) {}

  ngOnInit() {
    this.loading = true;
    this.exitService.listExitInterview().subscribe(data => {
      this.exitInterviews = data;
      this.loading = false;
    });
  }

  openInterview(interview: any) {
    this.selectedInterview = interview;
  }

  closeForm() {
    this.selectedInterview = null;
  }
}
