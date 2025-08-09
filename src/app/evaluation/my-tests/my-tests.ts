import { Component } from '@angular/core';
import { TestAttempt } from '../../services/test-attempt/test-attempt';
import { Router } from '@angular/router';
import { DatePipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-tests',
  imports: [DatePipe, CommonModule],
  templateUrl: './my-tests.html',
  styleUrl: './my-tests.css'
})
export class MyTests {
  employeeId = 1; // Replace with logged-in user
  tests: any[] = [];

  constructor(private testService: TestAttempt, private router: Router) {}

  ngOnInit(): void {
    this.testService.getForEmployee(this.employeeId).subscribe(data => {
      this.tests = data;
    });
  }

  startTest(testId: number): void {
    this.router.navigate(['/take-test', testId]);
  }

}
