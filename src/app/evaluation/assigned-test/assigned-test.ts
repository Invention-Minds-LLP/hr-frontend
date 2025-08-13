import { Component } from '@angular/core';
import { AssignTest } from '../../services/assign-test/assign-test';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-assigned-test',
  imports: [CommonModule, TableModule, DialogModule, BadgeModule, ButtonModule],
  templateUrl: './assigned-test.html',
  styleUrl: './assigned-test.css'
})
export class AssignedTest {
  assignedTests: any[] = [];
  overviewVisible = false;
  overview: any = null;

  constructor(private assignedService: AssignTest) {}

  ngOnInit(): void {
    this.assignedService.getAll().subscribe({
      next: data => this.assignedTests = data,
      error: err => console.error('Failed to load assigned tests', err)
    });
  }
  openOverview(a: any) {
    this.assignedService.getOverview(a.id).subscribe({
      next: data => { this.overview = data; this.overviewVisible = true; },
      error: err => alert('Failed to load overview')
    });
  }
  fmtDuration(s?: number | null) {
    if (!s && s !== 0) return '-';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
  }
}
