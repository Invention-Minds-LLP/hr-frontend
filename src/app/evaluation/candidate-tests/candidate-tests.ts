import { Component } from '@angular/core';
import { TestAttempt } from '../../services/test-attempt/test-attempt';
import { Router } from '@angular/router';
import { DatePipe, CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Recuriting, CandidateAssignedTest} from '../../services/recruiting/recuriting';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-candidate-tests',
  imports: [DatePipe, CommonModule, TableModule, ButtonModule, ToastModule],
  templateUrl: './candidate-tests.html',
  styleUrl: './candidate-tests.css',
  providers: [MessageService]
})
export class CandidateTests {

  // employeeId = Number(localStorage.getItem('empId')); // Replace with logged-in user
  tests: any[] = [];
  isOpen: boolean = false;
  username: string = localStorage.getItem('name') || 'Candidate';

  constructor(private testService: TestAttempt, private router: Router, private ct: Recuriting, private messageService: MessageService) {}

  ngOnInit(): void {
    const candidateId = Number(localStorage.getItem('candidateId'));
    this.ct.getCandidateAssignedTests(candidateId).subscribe(rows => this.tests = rows);
  }

  
  start(a: any) {
    const now = new Date();
    const startTime = new Date(a.testDate);
    const endTime = new Date(a.deadlineDate);
  
    if (now < startTime) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Test Not Started',
        detail: `This test will be available after ${startTime.toLocaleString()}`
      });
      return;
    }
  
    if (now > endTime) {
      this.messageService.add({
        severity: 'error',
        summary: 'Test Expired',
        detail: `The test window closed at ${endTime.toLocaleString()}`
      });
      return;
    }
  
    // ✅ Valid time → Allow test start
    this.ct.startAssignedTest(a.applicationId, a.id)
      .subscribe(() => {
        this.router.navigate(['/take-test', a.id]);
      });
  }
  
}
