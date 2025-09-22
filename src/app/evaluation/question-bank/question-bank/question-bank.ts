import { Component, OnInit } from '@angular/core';
import { Departments } from '../../../services/departments/departments';
import { QuestionBankService } from '../../../services/question-bank/question-bank';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Questions } from '../questions/questions';
import { BaseIcon } from "primeng/icons/baseicon";
import { QuestionBankEditor } from "../question-bank-editor/question-bank-editor";
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { RouterLink, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';




@Component({
  selector: 'app-question-bank',
  imports: [CommonModule, FormsModule, TableModule, Questions, QuestionBankEditor, ButtonModule, RouterModule, InputTextModule, InputIconModule, IconFieldModule],
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
  // NEW: editor switching state
  showEditor = false;

  filteredQuestonbank: any[] = [];
  showFilterDropdown = false;
  selectedFilter: any = null

  filterOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Role', value: 'role' },
    { label: 'Department', value: 'department' }
  ];
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

  constructor(private qService: QuestionBankService, private departmentService: Departments, private messageService: MessageService) { }

  ngOnInit(): void {
    this.fetchQuestionBanks();
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
    // this.filteredQuestonbank = [...this.questionBanks]


  }

  fetchQuestionBanks(): void {
    this.qService.getAll().subscribe({
      next: (data) => {
        this.questionBanks = data;
        this.filteredQuestonbank = [...this.questionBanks]
      },
      error: (err) => {
        console.error('Failed to fetch question banks:', err);
      }
    });

    console.log(this.filteredQuestonbank)
  }

  editingBank: any = null;

  openForm(bank?: any): void {
    this.isEditing = !!bank;
    this.editingBank = bank ?? null;
    this.showFormPopup = true;
    this.showEditor = true;
  }

  closeForm(): void {
    this.showFormPopup = false;
    this.showEditor = false;
    this.isEditing = false;
    this.editingBank = null;
  }

  onBankSaved(): void {
    this.fetchQuestionBanks();   // refresh list after save
    this.closeForm();
  }


  save(): void {
    if (!this.formData.name || !this.formData.createdBy) {
      // alert('Please fill required fields');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill required fields'
      })
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


  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    this.showFilterDropdown = false
  }

  onSearch(event: Event) {
  const input = event.target as HTMLInputElement;
  const searchText = input.value.trim().toLowerCase();

  if (!this.selectedFilter || !searchText) {
    this.filteredQuestonbank = [...this.questionBanks];
    return;
  }

  const filterKey = this.selectedFilter.value;

  this.filteredQuestonbank = this.questionBanks.filter(q => {
    if (filterKey === 'name') {
      return q.name.toLowerCase().includes(searchText);
    } else if (filterKey === 'role') {
      return q.role.toLowerCase().includes(searchText);
    } else if (filterKey === 'department') {
      return this.getDepartmentName(q.departmentId).toLowerCase().includes(searchText);
    } else if (filterKey) {
      const val = q[filterKey];
      return val?.toString().toLowerCase().includes(searchText);
    }
    return false;
  });

  console.log(this.filteredQuestonbank);
}



}