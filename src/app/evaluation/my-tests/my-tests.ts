import { Component } from '@angular/core';
import { TestAttempt } from '../../services/test-attempt/test-attempt';
import { Router } from '@angular/router';
import { DatePipe, CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-my-tests',
  imports: [DatePipe, CommonModule, TableModule, ButtonModule],
  templateUrl: './my-tests.html',
  styleUrl: './my-tests.css'
})
export class MyTests {
  employeeId = Number(localStorage.getItem('empId')); // Replace with logged-in user
  tests: any[] = [];

  constructor(private testService: TestAttempt, private router: Router) {}

  ngOnInit(): void {
    this.testService.getForEmployee(this.employeeId).subscribe(data => {
      this.tests = data;
    });
  }

  startTest(assignedId: number): void {
    this.testService.startAttempt(assignedId).subscribe({
      next: ({ attemptId }) => {
        this.router.navigate(['/take-test', assignedId], { queryParams: { attemptId } });
      },
      error: (e) => alert(e?.error?.error || 'Cannot start test')
    });
  }
  

}
