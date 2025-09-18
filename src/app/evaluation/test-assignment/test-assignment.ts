import { Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tests } from '../../services/tests/tests';
import { AssignTest } from '../../services/assign-test/assign-test';
import { Employees } from '../../services/employees/employees';
import { MultiSelect, MultiSelectChangeEvent  } from 'primeng/multiselect';
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { FluidModule } from 'primeng/fluid';
import { Select } from 'primeng/select';

@Component({
  selector: 'app-test-assignment',
  imports: [CommonModule, FormsModule, MultiSelect, DatePickerModule, FluidModule, Select],
  templateUrl: './test-assignment.html',
  styleUrl: './test-assignment.css'
})
export class TestAssignment {

  @Input() test: any = null;
  @Output() closeForm = new EventEmitter<boolean>();

  tests: any[] = [];
  employees: any[] = [];

  selectedTestId: number = 0;
  selectedEmployeeIds: number[] = [];

  message: string = '';
  assignedBy = 1; // replace with logged-in admin ID in real app

  constructor(
    private testService: Tests,
    private employeeService: Employees,
    private assignedService: AssignTest,
    private messageService : MessageService) {}

  ngOnInit(): void {
    this.loadTests();
    this.loadEmployees();
    if(this.test){
      this.selectedTestId = this.test.id
    }
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
  onEmployeesChange(event: MultiSelectChangeEvent) {
    const ids = event.value as number[];
    this.selectedEmployeeIds = ids;
  }

  availFromDate = ''; // "YYYY-MM-DD"
  availToDate   = '';

  // (optional) prefill from test.activeFrom/activeTo when a test is chosen
  onTestChange(testId: number) {
    const t = this.tests.find(x => x.id === +testId);
    if (t?.activeFrom) this.availFromDate = new Date(t.activeFrom).toISOString().slice(0, 10);
    if (t?.activeTo)   this.availToDate   = new Date(t.activeTo).toISOString().slice(0, 10);
  }

  private startOfDayISO(dateStr: string): string {
    return new Date(`${dateStr}T00:00:00`).toISOString(); // local -> ISO
  }
  private endOfDayISO(dateStr: string): string {
    return new Date(`${dateStr}T23:59:59.999`).toISOString();
  }

  assign() {
    if (!this.selectedTestId || this.selectedEmployeeIds.length === 0) {
      // alert('Please select a test and at least one employee');
      this.messageService.add({
        severity:'error',
        summary:'Error',
        detail:'Please select a test and at least one employee'
      })
      return;
    }
    if (!this.availFromDate || !this.availToDate) {
      // alert('Please select both dates (From/To)');
      this.messageService.add({
        severity:'error',
        summary:'Error',
        detail:'Please select both dates (From/To)'
      })
      return;
    }

    const fromISO = new Date(this.availFromDate);
    const toISO   = new Date(this.availToDate);

    if (new Date(toISO) < new Date(fromISO)) {
      // alert('“Available To” must be the same or after “Available From”.');
      this.messageService.add({
        severity:'error',
        summary:'Error',
        detail:'“Available To” must be the same or after “Available From”.'
      })
      return;
    }

    const payload = {
      testId: this.selectedTestId,
      employeeIds: this.selectedEmployeeIds,
      assignedBy: this.assignedBy,
      testDate: fromISO,       // availability start (00:00 local)
      deadlineDate: toISO      // availability end (23:59:59.999 local)
    };

    this.assignedService.assign(payload).subscribe({
      next: () => {
        this.message = 'Test successfully assigned!';
        this.selectedTestId = 0;
        this.selectedEmployeeIds = [];
        this.availFromDate = this.availToDate = '';
      },
      error: (err) => {
        console.error('Assignment failed', err);
        this.message = 'Failed to assign test.';
      }
    });
  }
  close(){
    this.closeForm.emit();
  }
}
