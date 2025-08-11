import { Component } from '@angular/core';
import { Tests } from '../../services/tests/tests';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TestCreation } from "../test-creation/test-creation";
import { TestAssignment } from "../test-assignment/test-assignment";

@Component({
  selector: 'app-all-test',
  imports: [CommonModule, TableModule, TestCreation, TestAssignment],
  templateUrl: './all-test.html',
  styleUrl: './all-test.css'
})
export class AllTest {
  tests: any[] = [];
  showTest:boolean = false;
  selectedTest: any = null;
  showAssignPopup: boolean = false;
  assignTest:any = null;

  constructor(private testService: Tests) {}

  ngOnInit(): void {
    this.testService.getAll().subscribe({
      next: data => this.tests = data,
      error: err => console.error('Failed to load tests', err)
    });
  }
  openForm(){
    this.showTest = true;
  }

  openTest(test:any){
    this.selectedTest = test;
  }
  openAssign(test:any){
    this.showAssignPopup = true;
    this.assignTest = test
  }
}
