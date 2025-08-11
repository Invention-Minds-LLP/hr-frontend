import { Component } from '@angular/core';
import { AssignTest } from '../../services/assign-test/assign-test';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-assigned-test',
  imports: [CommonModule, TableModule],
  templateUrl: './assigned-test.html',
  styleUrl: './assigned-test.css'
})
export class AssignedTest {
  assignedTests: any[] = [];

  constructor(private assignedService: AssignTest) {}

  ngOnInit(): void {
    this.assignedService.getAll().subscribe({
      next: data => this.assignedTests = data,
      error: err => console.error('Failed to load assigned tests', err)
    });
  }
}
