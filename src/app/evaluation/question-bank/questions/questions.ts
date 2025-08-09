import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuestionsService } from '../../../services/questions/questions';

@Component({
  selector: 'app-questions',
  imports: [CommonModule, FormsModule],
  templateUrl: './questions.html',
  styleUrl: './questions.css'
})
export class Questions {
  @Input() questionBankId!: number;

  questions: any[] = [];
  newQuestion: any = this.initQuestion();
  showForm = false;

  constructor(private questionService: QuestionsService) {}

  ngOnInit(): void {
    if (this.questionBankId) this.loadQuestions();
  }

  ngOnChanges(): void {
    if (this.questionBankId) this.loadQuestions();
  }

  initQuestion(): any {
    return {
      questionBankId: this.questionBankId,
      text: '',
      type: 'MCQ',
      weight: 1,
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    };
  }

  loadQuestions() {
    this.questionService.getByBank(this.questionBankId).subscribe({
      next: data => this.questions = data,
      error: err => console.error('Failed to load questions', err)
    });
  }

  addOption() {
    this.newQuestion.options?.push({ text: '', isCorrect: false });
  }

  removeOption(index: number) {
    this.newQuestion.options?.splice(index, 1);
  }

  saveQuestion() {
    if (!this.newQuestion.text || !this.newQuestion.weight) return;

    if (this.newQuestion.type === 'MCQ' && this.newQuestion.options?.length! < 2) {
      alert('MCQ should have at least 2 options.');
      return;
    }

    this.newQuestion.questionBankId = this.questionBankId;

    this.questionService.create(this.newQuestion).subscribe({
      next: () => {
        this.loadQuestions();
        this.newQuestion = this.initQuestion();
        this.showForm = false;
      },
      error: err => console.error('Failed to create question', err)
    });
  }

  deleteQuestion(id: number) {
    if (!confirm('Delete this question?')) return;
    this.questionService.delete(id).subscribe({
      next: () => this.loadQuestions(),
      error: err => console.error('Failed to delete question', err)
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (this.showForm) this.newQuestion = this.initQuestion();
  }

}



