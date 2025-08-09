import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tests } from '../../services/tests/tests';
import { AssignTest } from '../../services/assign-test/assign-test';
import { Employees } from '../../services/employees/employees';

@Component({
  selector: 'app-test-assignment',
  imports: [CommonModule, FormsModule],
  templateUrl: './test-assignment.html',
  styleUrl: './test-assignment.css'
})
export class TestAssignment {

  tests: any[] = [];
  employees: any[] = [];

  selectedTestId: number = 0;
  selectedEmployeeIds: number[] = [];

  message: string = '';
  assignedBy = 1; // replace with logged-in admin ID in real app

  constructor(
    private testService: Tests,
    private employeeService: Employees,
    private assignedService: AssignTest
  ) {}

  ngOnInit(): void {
    this.loadTests();
    this.loadEmployees();
  }

  loadTests() {
    this.testService.getAll().subscribe({
      next: (data) => this.tests = data,
      error: (err) => console.error('Failed to load tests', err)
    });
  }

  loadEmployees() {
    this.employeeService.getEmployees().subscribe({
      next: (data) => this.employees = data,
      error: (err) => console.error('Failed to load employees', err)
    });
  }

  toggleSelection(empId: number) {
    const index = this.selectedEmployeeIds.indexOf(empId);
    if (index >= 0) {
      this.selectedEmployeeIds.splice(index, 1);
    } else {
      this.selectedEmployeeIds.push(empId);
    }
  }

  assign() {
    if (!this.selectedTestId || this.selectedEmployeeIds.length === 0) {
      alert('Please select a test and at least one employee');
      return;
    }

    const payload = {
      testId: this.selectedTestId,
      employeeIds: this.selectedEmployeeIds,
      assignedBy: this.assignedBy
    };

    this.assignedService.assign(payload).subscribe({
      next: () => {
        this.message = 'Test successfully assigned!';
        this.selectedTestId = 0;
        this.selectedEmployeeIds = [];
      },
      error: (err) => {
        console.error('Assignment failed', err);
        this.message = 'Failed to assign test.';
      }
    });
  }
}
