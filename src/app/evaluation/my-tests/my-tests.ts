import { Component } from '@angular/core';
import { TestAttempt } from '../../services/test-attempt/test-attempt';
import { Router } from '@angular/router';
import { DatePipe, CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Recuriting, CandidateAssignedTest} from '../../services/recruiting/recuriting';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-my-tests',
  imports: [DatePipe, CommonModule, TableModule, ButtonModule],
  templateUrl: './my-tests.html',
  styleUrl: './my-tests.css'

})
export class MyTests {
  employeeId = Number(localStorage.getItem('empId')); // Replace with logged-in user
  tests: any[] = [];

  constructor(private testService: TestAttempt, private router: Router, private ct: Recuriting , private messageService : MessageService) {}

  ngOnInit(): void {
    if(this.employeeId){
      this.testService.getForEmployee(this.employeeId).subscribe(data => {
        this.tests = data;
      });
      return;
    }
    // const candidateId = Number(localStorage.getItem('candidateId'));
    // this.ct.getCandidateAssignedTests(candidateId).subscribe(rows => this.tests = rows);
  }

  startTest(assignedId: any): void {
    console.log(assignedId)
    this.testService.startAttempt(assignedId.id).subscribe({
      next: ({ attemptId }) => {
        this.router.navigate(['/recruitment/take-test', assignedId.id], {
          queryParams: { attemptId }
        });
        
      },
      error: (e) => 
        // alert(e?.error?.error || 'Cannot start test')
        this.messageService.add({
          severity:'error',
          summary:'Error',
          detail:e?.error?.error || 'Cannot start test'
        })
    });
  }
  
  // start(a: any) {
  //   console.log(a)
  //   this.ct.startAssignedTest(a.applicationId, a.id ).subscribe(() => this.router.navigate(['/take-test', a.id]));
  // }
}
