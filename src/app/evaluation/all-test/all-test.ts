import { Component } from '@angular/core';
import { Tests } from '../../services/tests/tests';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TestCreation } from "../test-creation/test-creation";
import { TestAssignment } from "../test-assignment/test-assignment";
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-all-test',
  imports: [CommonModule, TableModule, TestCreation, TestAssignment, IconFieldModule, InputTextModule, InputIconModule],
  templateUrl: './all-test.html',
  styleUrl: './all-test.css'
})
export class AllTest {
  tests: any[] = [];
  showTest: boolean = false;
  selectedTest: any = null;
  showAssignPopup: boolean = false;
  assignTest: any = null;
  editingTest: any = null;

  filteredTest: any[] = []
  showFilterDropdown = false;
  selectedFilter: any = null

  filterOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Questions', value: 'question' }
  ]

  constructor(private testService: Tests) { }

  ngOnInit(): void {
    this.testService.getAll().subscribe({
      next: data => {
        this.tests = data
        this.filteredTest = [...this.tests]
      },
      error: err => console.error('Failed to load tests', err)
    });
  }

  fetchTests() {
    this.testService.getAll().subscribe({
      next: data => this.tests = data,
      error: err => console.error('Failed to load tests', err)
    });

    this.filteredTest = [...this.tests]
  }
  openTest(test: any) {
    this.editingTest = test;
    this.showTest = true;
  }

  // when child emits close
  onCloseCreation() {
    this.showTest = false;
    this.editingTest = null;
    this.fetchTests();      // refresh list after save/cancel
  }

  openAssign(test: any) {
    this.assignTest = test;
    this.showAssignPopup = true;
  }

  newForm() {
    this.showTest = true;
    this.editingTest = null
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
      this.filteredTest = [...this.tests];
      return;
    }

    const filterKey = this.selectedFilter.value;

    this.filteredTest = this.tests.filter(q => {
      if (filterKey === 'name') {
        return q.name.toLowerCase().includes(searchText);
      } else if (filterKey === 'question') {
        return q.questionBankName?.toLowerCase().includes(searchText);
      }
      return false;
    });

    console.log(this.filteredTest);
  }
}


