import { Component } from '@angular/core';
import { TestAttempt } from '../../services/test-attempt/test-attempt';
import { Router } from '@angular/router';
import { DatePipe, CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Recuriting, CandidateAssignedTest} from '../../services/recruiting/recuriting';

@Component({
  selector: 'app-candidate-tests',
  imports: [DatePipe, CommonModule, TableModule, ButtonModule],
  templateUrl: './candidate-tests.html',
  styleUrl: './candidate-tests.css'
})
export class CandidateTests {

  // employeeId = Number(localStorage.getItem('empId')); // Replace with logged-in user
  tests: any[] = [];

  constructor(private testService: TestAttempt, private router: Router, private ct: Recuriting) {}

  ngOnInit(): void {
    const candidateId = Number(localStorage.getItem('candidateId'));
    this.ct.getCandidateAssignedTests(candidateId).subscribe(rows => this.tests = rows);
  }

  
  start(a: any) {
    console.log(a)
    this.ct.startAssignedTest(a.applicationId, a.id ).subscribe(() => this.router.navigate(['/take-test', a.id]));
  }
}
