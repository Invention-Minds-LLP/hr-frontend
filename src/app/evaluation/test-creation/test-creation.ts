import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tests } from '../../services/tests/tests';
import { QuestionBankService } from '../../services/question-bank/question-bank';
import { QuestionsService } from '../../services/questions/questions';
import { Roles, Role } from '../../services/roles/roles';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-test-creation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-creation.html',
  styleUrl: './test-creation.css'
})
export class TestCreation {
  @Output() closeForm = new EventEmitter<boolean>();
  @Input() testData: any = null; // <-- passed in for editing

  questionBanks: any[] = [];
  previewQuestions: any[] = [];
  showPreview = false;
  selectedBankName = '';

  // visual-only fields for the new layout
  ui = {
    roleId: null as number | null,        // ⬅️ use id
    level: '',
    purpose: '',
    randomization: ''
  };
  roles: Role[] = [];
  levels = ['Junior', 'Mid', 'Senior', 'Lead'];
  purposes = ['hiring', 'training', 'assessment'];

  formData: any = {
    name: '',
    questionBankId: 0,
    duration: 30,
    passingPercent: 60,
    maxAttempts: 1
  };

  message = '';

  constructor(
    private testService: Tests,
    private questionBankService: QuestionBankService,
    private questionsService: QuestionsService,
    private rolesService: Roles,
    private messageService: MessageService) { }

  private patchFromTestData() {
    if (!this.testData) return;

    // core fields
    this.formData = {
      name: this.testData.name,
      questionBankId: this.testData.questionBankId,
      duration: this.testData.duration,
      passingPercent: this.testData.passingPercent,
      maxAttempts: this.testData.maxAttempts
    };

    // ui extras (map DB enums -> UI lowercase)
    this.ui.level = this.testData.level ?? '';
    this.ui.purpose = (this.testData.purpose?.toString().toLowerCase()) || '';           // e.g. 'HIRING' -> 'hiring'
    this.ui.randomization = (this.testData.randomization?.toString().toLowerCase()) || 'none';

    // role comes as NAME in DB; convert to ID after roles are loaded
    if (this.testData.role && this.roles?.length) {
      const match = this.roles.find(r => r.name === this.testData.role);
      this.ui.roleId = match?.id ?? null;
    }
  }

  ngOnInit(): void {
    this.loadQuestionBanks();
    this.loadRoles();
    if (this.testData) this.patchFromTestData();
  }

  loadQuestionBanks() {
    this.questionBankService.getAll().subscribe({
      next: (data) => (this.questionBanks = data || []),
      error: (err) => console.error('Failed to load banks:', err)
    });
  }

  clearPreview() {
    this.previewQuestions = [];
    this.showPreview = false;
    const bank = this.questionBanks.find(b => b.id === this.formData.questionBankId);
    this.selectedBankName = bank?.name || '';
  }

  preview() {
    if (!this.formData.questionBankId) {
      // alert('Please select a Question Bank first.');
      this.messageService.add({
        severity:'warn',
        summary:'Warning',
        detail:'Please select a Question Bank first.'

      })
      return;
    }
    const bank = this.questionBanks.find(b => b.id === this.formData.questionBankId);
    this.selectedBankName = bank?.name || '';

    this.questionsService.getByBank(this.formData.questionBankId).subscribe({
      next: (qs) => {
        this.previewQuestions = qs || [];
        this.showPreview = true;
      },
      error: (err) => {
        console.error('Failed to load questions for preview', err);
        this.previewQuestions = [];
        this.showPreview = true;
      }
    });
  }

  countCorrect(q: any): number {
    return (q?.options || []).filter((o: any) => o.isCorrect).length;
  }

  // UPDATE submit() to handle create vs update and include extras
  submit() {
    if (!this.formData.name || !this.formData.questionBankId) {
      // alert('Please fill Test Name and select a Question Bank.');
      this.messageService.add({
        severity:'warn',
        summary:'Warning',
        detail:'Please fill Test Name and select a Question Bank.'
      })
      return;
    }

    const payload = {
      name: this.formData.name,
      questionBankId: this.formData.questionBankId,
      duration: this.formData.duration,
      passingPercent: this.formData.passingPercent,
      maxAttempts: this.formData.maxAttempts,

      // NEW (persisting your UI fields)
      role: this.selectedRoleName || null,                                   // store role NAME (your DB has a string)
      level: this.ui.level || null,
      purpose: this.ui.purpose ? this.ui.purpose.toUpperCase() : null,       // 'hiring' -> 'HIRING'
      randomization: (this.ui.randomization || 'none').toUpperCase(),        // 'both' -> 'BOTH'
      // instructions, isPublished, activeFrom, activeTo — add later if needed
    };

    const req$ = this.testData
      ? this.testService.update(this.testData.id, payload)   // ← UPDATE when editing
      : this.testService.create(payload);                    // ← CREATE otherwise

    this.message = '';
    req$.subscribe({
      next: () => {
        this.message = this.testData ? 'Test updated successfully!' : 'Test created successfully!';
        this.resetForm();
        this.close(); // emit closeForm to parent
      },
      error: (err) => {
        console.error('Failed to save test', err);
        this.message = 'Error saving test';
      }
    });
  }

  close() {
    this.closeForm.emit(true);
  }

  resetForm() {
    this.formData = {
      name: '',
      questionBankId: 0,
      duration: 30,
      passingPercent: 60,
      maxAttempts: 1
    };
    this.ui = { roleId: null, level: '', purpose: '', randomization: '' };
    this.previewQuestions = [];
    this.showPreview = false;
    this.selectedBankName = '';
  }

  loadRoles() {
    this.rolesService.getRoles().subscribe({
      next: (data) => {
        this.roles = data || [];
        // if editing, try to map role name -> id now that roles arrived
        if (this.testData?.role && this.ui.roleId == null) {
          const match = this.roles.find(r => r.name === this.testData.role);
          this.ui.roleId = match?.id ?? null;
        }
      },
      error: (err) => console.error('Failed to load roles:', err)
    });
  }
  get selectedRoleName(): string {
    return this.roles.find(r => r.id === this.ui.roleId)?.name ?? '';
  }
}
