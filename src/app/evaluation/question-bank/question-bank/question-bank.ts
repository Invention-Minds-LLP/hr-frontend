import { Component, OnInit } from '@angular/core';
import { Departments } from '../../../services/departments/departments';
import { QuestionBankService } from '../../../services/question-bank/question-bank';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Questions } from '../questions/questions';
import { BaseIcon } from "primeng/icons/baseicon";




@Component({
  selector: 'app-question-bank',
  imports: [CommonModule, FormsModule, TableModule, Questions],
  templateUrl: './question-bank.html',
  styleUrl: './question-bank.css'
})
export class QuestionBank {
  questionBanks: any[] = [];
  showFormPopup: boolean = false;
  isEditing: boolean = false;
  departments: any[] = [];
  selectedBankId: number | null = null;
  selectedBank: any = null;

  selectQuestionBank(bank: any) {
    this.selectedBankId = bank;
    this.selectedBank = bank; // so you can show its name in the header
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log(this.selectedBankId)
  }

  closeQuestions() {
    this.selectedBankId = null;
    this.selectedBank = null;
  }


  formData: any = {
    name: '',
    role: '',
    departmentId: undefined,
    difficulty: '',
    createdBy: 1 // Replace with actual user ID if available
  };

  constructor(private qService: QuestionBankService, private departmentService: Departments) { }

  ngOnInit(): void {
    this.fetchQuestionBanks();
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
  }

  fetchQuestionBanks(): void {
    this.qService.getAll().subscribe({
      next: (data) => {
        this.questionBanks = data;
      },
      error: (err) => {
        console.error('Failed to fetch question banks:', err);
      }
    });
  }

  openForm(bank?: QuestionBank): void {
    this.isEditing = !!bank;

    if (bank) {
      this.formData = { ...bank };
    } else {
      this.resetForm();
    }

    this.showFormPopup = true;
  }

  closeForm(): void {
    this.showFormPopup = false;
    this.resetForm();
  }

  save(): void {
    if (!this.formData.name || !this.formData.createdBy) {
      alert('Please fill required fields');
      return;
    }

    const action = this.isEditing
      ? this.qService.update(this.formData.id!, this.formData)
      : this.qService.create(this.formData);

    action.subscribe({
      next: () => {
        this.fetchQuestionBanks();
        this.closeForm();
      },
      error: (err) => {
        console.error('Failed to save question bank:', err);
      }
    });
  }

  delete(id: number): void {
    if (!confirm('Are you sure you want to delete this question bank?')) return;

    this.qService.delete(id).subscribe({
      next: () => this.fetchQuestionBanks(),
      error: (err) => console.error('Delete failed:', err)
    });
  }

  private resetForm(): void {
    this.formData = {
      name: '',
      role: '',
      departmentId: undefined,
      difficulty: '',
      createdBy: 1
    };
  }
  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }

  getDepartmentName(id: number): string {
    return this.departments.find(dep => dep.id === id)?.name || 'N/A';
  }
}