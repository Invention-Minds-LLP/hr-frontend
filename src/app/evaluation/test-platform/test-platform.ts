import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignTest } from '../../services/assign-test/assign-test';
import { TestAttempt } from '../../services/test-attempt/test-attempt';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test-platform',
  imports: [FormsModule, CommonModule],
  templateUrl: './test-platform.html',
  styleUrl: './test-platform.css'
})
export class TestPlatform {
  test: any;
  responses: any[] = [];
  timeLeft: number = 0;
  timerId: any;
  assignedTestId: number;

  constructor(
    private route: ActivatedRoute,
    private assignedTestService: AssignTest,
    private attemptService: TestAttempt,
    private router: Router
  ) {
    this.assignedTestId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.attemptService.getDetails(this.assignedTestId).subscribe(data => {
      this.test = data.test;
      this.timeLeft = this.test.duration * 60; // in seconds
      this.responses = this.test.questions.map((q: any) => ({
        questionId: q.id,
        answer: q.type === 'MCQ' ? [] : ''
      }));
      this.startTimer();
    });
  }

  startTimer(): void {
    this.timerId = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        clearInterval(this.timerId);
        this.submit();
      }
    }, 1000);
  }

  toggleOption(qIndex: number, optionId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const checked = input.checked;
  
    const answers = this.responses[qIndex].answer;
    if (checked) {
      answers.push(optionId);
    } else {
      this.responses[qIndex].answer = answers.filter((id: number) => id !== optionId);
    }
  }
  

  submit(): void {
    clearInterval(this.timerId);

    const correctCount = this.test.questions.reduce((count: number, q: any, i: number) => {
      if (q.type === 'MCQ') {
        const correct = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.id).sort();
        const selected = (this.responses[i].answer as number[]).sort();
        return JSON.stringify(correct) === JSON.stringify(selected) ? count + 1 : count;
      }
      return count;
    }, 0);

    const score = (correctCount / this.test.questions.length) * 100;
    const status = score >= this.test.passingPercent ? 'Pass' : 'Fail';

    const payload = {
      assignedTestId: this.assignedTestId,
      employeeId: 1,
      testId: this.test.id,
      responses: this.responses,
      score,
      status
    };

    this.attemptService.submit(payload).subscribe(() => {
      alert(`Test submitted! You ${status} with score ${score.toFixed(2)}%.`);
      this.router.navigate(['/my-tests']);
    });
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }
}
