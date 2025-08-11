import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuestionsService } from '../../../services/questions/questions';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { Tooltip } from 'primeng/tooltip';

@Component({
  selector: 'app-questions',
  imports: [CommonModule, FormsModule,
    ToolbarModule, ButtonModule, DialogModule, SelectModule,
    InputTextModule, TextareaModule, InputNumberModule, CheckboxModule,
    TableModule, TagModule, BadgeModule, ConfirmDialogModule, ToastModule, Tooltip
  ],
  templateUrl: './questions.html',
  styleUrl: './questions.css',
  providers: [ConfirmationService, MessageService]
})
export class Questions {
  @Input() questionBankId!: number;

  questions: any[] = [];
  showForm = false;
  submitted = false;
  saving = false;
  isEditing = false;

  // form model
  newQuestion: any = this.initQuestion();

  types = [
    { label: 'MCQ', value: 'MCQ' },
    { label: 'Descriptive', value: 'Descriptive' }
  ];

  constructor(
    private questionService: QuestionsService,
    private confirm: ConfirmationService,
    private toast: MessageService
  ) {}

  ngOnInit(): void {
    if (this.questionBankId) this.loadQuestions();
  }

  ngOnChanges(): void {
    if (this.questionBankId) this.loadQuestions();
  }

  initQuestion(): any {
    return {
      id: undefined,
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

  // UI actions
  openCreate() {
    this.isEditing = false;
    this.newQuestion = this.initQuestion();
    this.showForm = true;
    this.submitted = false;
  }

  // If you add update support later:
  // openEdit(q: any) {
  //   this.isEditing = true;
  //   this.newQuestion = JSON.parse(JSON.stringify(q));
  //   this.showForm = true;
  //   this.submitted = false;
  // }

  onDialogHide() {
    this.submitted = false;
  }

  loadQuestions() {
    this.questionService.getByBank(this.questionBankId).subscribe({
      next: data => this.questions = data || [],
      error: err => {
        console.error('Failed to load questions', err);
        this.toast.add({severity:'error', summary:'Error', detail:'Failed to load questions'});
      }
    });
  }

  addOption() {
    this.newQuestion.options ??= [];
    this.newQuestion.options.push({ text: '', isCorrect: false });
  }

  removeOption(index: number) {
    this.newQuestion.options?.splice(index, 1);
  }

  // validations
  hasAtLeastOneCorrect(): boolean {
    return (this.newQuestion.options || []).some((o: any) => o.isCorrect);
  }

  hasEmptyOption(): boolean {
    return (this.newQuestion.options || []).some((o: any) => !o.text || !o.text.trim());
  }

  isValid(): boolean {
    if (!this.newQuestion.text?.trim()) return false;
    if (!this.newQuestion.weight) return false;
    if (this.newQuestion.type === 'MCQ') {
      if ((this.newQuestion.options?.length || 0) < 2) return false;
      if (this.hasEmptyOption()) return false;
      if (!this.hasAtLeastOneCorrect()) return false;
    }
    return true;
  }

  saveQuestion() {
    this.submitted = true;
    if (!this.isValid()) {
      this.toast.add({severity:'warn', summary:'Check form', detail:'Please fix the highlighted issues.'});
      return;
    }

    this.saving = true;
    this.newQuestion.questionBankId = this.questionBankId;

    // create (or update if you wire it)
    const req$ = this.questionService.create(this.newQuestion);
    // If you add update later:
    // const req$ = this.isEditing ? this.questionService.update(this.newQuestion.id, this.newQuestion)
    //                             : this.questionService.create(this.newQuestion);

    req$.subscribe({
      next: () => {
        this.toast.add({severity:'success', summary:'Saved', detail:'Question saved successfully.'});
        this.showForm = false;
        this.newQuestion = this.initQuestion();
        this.loadQuestions();
      },
      error: err => {
        console.error('Failed to save question', err);
        this.toast.add({severity:'error', summary:'Error', detail:'Failed to save question'});
      },
      complete: () => this.saving = false
    });
  }

  confirmDelete(id: number) {
    this.confirm.confirm({
      header: 'Delete Question',
      message: 'Are you sure you want to delete this question?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteQuestion(id)
    });
  }

  deleteQuestion(id: number) {
    this.questionService.delete(id).subscribe({
      next: () => {
        this.toast.add({severity:'success', summary:'Deleted', detail:'Question deleted.'});
        this.loadQuestions();
      },
      error: err => {
        console.error('Failed to delete question', err);
        this.toast.add({severity:'error', summary:'Error', detail:'Failed to delete question'});
      }
    });
  }

  // helpers for table
  countCorrect(q: any): number {
    return (q?.options || []).filter((o: any) => o.isCorrect).length;
  }
}