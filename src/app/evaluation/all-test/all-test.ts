import { Component } from '@angular/core';
import { Tests } from '../../services/tests/tests';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-all-test',
  imports: [CommonModule],
  templateUrl: './all-test.html',
  styleUrl: './all-test.css'
})
export class AllTest {
  tests: any[] = [];

  constructor(private testService: Tests) {}

  ngOnInit(): void {
    this.testService.getAll().subscribe({
      next: data => this.tests = data,
      error: err => console.error('Failed to load tests', err)
    });
  }
}
