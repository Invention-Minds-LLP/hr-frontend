import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TestAttempt } from '../../services/test-attempt/test-attempt';

@Component({
  selector: 'app-hr-evaluate',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './hr-evaluate.html',
  styleUrl: './hr-evaluate.css'
})



export class HrEvaluate implements OnInit {
  attemptId!: number;
  attempt: any;
  loading = true;
  saving = false;
  error = '';
  totalScore = 0;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private TestService: TestAttempt
  ) {}

  ngOnInit(): void {
    this.attemptId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadAttempt();
  }

  loadAttempt(): void {
    this.TestService.getDetails(this.attemptId)
      .subscribe({
        next: (data: any) => {
          this.attempt = data;
          this.loading = false;

          // initialize HR scores if not already set
          this.attempt.responses.forEach((r: any) => {
            if (r.type === 'Descriptive' && r.hrScore == null) {
              r.hrScore = 0;
            }
          });
        },
        error: err => {
          this.error = 'Failed to load attempt';
          this.loading = false;
        }
      });
  }

  onScoreChange(): void {
    this.totalScore = this.attempt.responses.reduce((sum: number, r: any) => {
      return sum + (r.type === 'Descriptive' ? Number(r.hrScore || 0) : (r.autoScore || 0));
    }, 0);
  }

  saveEvaluation(): void {
    this.saving = true;
    this.http.post(`/api/tests/attempts/${this.attemptId}/review`, {
      scores: this.attempt.responses.map((r: any) => ({
        questionId: r.questionId,
        hrScore: r.hrScore ?? null
      })),
      finalScore: this.totalScore
    }).subscribe({
      next: () => {
        this.saving = false;
        alert('Evaluation saved!');
        this.router.navigate(['/hr/reviews']);
      },
      error: () => {
        this.saving = false;
        alert('Failed to save evaluation');
      }
    });
  }
}
