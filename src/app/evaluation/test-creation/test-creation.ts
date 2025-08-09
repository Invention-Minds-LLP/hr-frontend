import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tests } from '../../services/tests/tests';
import { QuestionBankService } from '../../services/question-bank/question-bank';

@Component({
  selector: 'app-test-creation',
  imports: [CommonModule, FormsModule],
  templateUrl: './test-creation.html',
  styleUrl: './test-creation.css'
})
export class TestCreation {

  questionBanks: any[] = [];
  formData: any = {
    name: '',
    questionBankId: 0,
    duration: 30,
    passingPercent: 60,
    maxAttempts: 1
  };

  message: string = '';

  constructor(
    private testService: Tests,
    private questionBankService: QuestionBankService
  ) {}

  ngOnInit(): void {
    this.loadQuestionBanks();
  }

  loadQuestionBanks() {
    this.questionBankService.getAll().subscribe({
      next: (data) => (this.questionBanks = data),
      error: (err) => console.error('Failed to load banks:', err)
    });
  }

  submit() {
    if (!this.formData.name || !this.formData.questionBankId) {
      alert('Please fill all required fields');
      return;
    }

    this.testService.create(this.formData).subscribe({
      next: () => {
        this.message = 'Test created successfully!';
        this.resetForm();
      },
      error: (err) => {
        console.error('Failed to create test', err);
        this.message = 'Error creating test';
      }
    });
  }

  resetForm() {
    this.formData = {
      name: '',
      questionBankId: 0,
      duration: 30,
      passingPercent: 60,
      maxAttempts: 1
    };
  }
}
