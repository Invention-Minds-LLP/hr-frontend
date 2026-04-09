import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { WeeklyRatingService } from '../../services/weekly-rating/weekly-rating';

@Component({
  selector: 'app-my-weekly-ratings',
  imports: [CommonModule, ButtonModule, TooltipModule, DialogModule, SkeletonModule],
  templateUrl: './my-weekly-ratings.html',
  styleUrl: './my-weekly-ratings.css',
})
export class MyWeeklyRatings implements OnInit {
  private readonly PAGE_SIZE = 4;
  ratings: any[] = [];
  loading = true;
  dialogVisible = false;
  selected: any = null;
  expanded = false;

  get visibleRatings(): any[] {
    return this.expanded ? this.ratings : this.ratings.slice(0, this.PAGE_SIZE);
  }

  get hasMore(): boolean {
    return this.ratings.length > this.PAGE_SIZE;
  }

  constructor(private ratingService: WeeklyRatingService) {}

  ngOnInit() {
    this.ratingService.getMyRatings().subscribe({
      next: (data) => { this.ratings = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  view(r: any) {
    this.selected = r;
    this.dialogVisible = true;
  }

  fmtDate(d: any): string {
    if (!d) return '';
    return formatDate(d, 'dd-MM-yyyy', 'en');
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'score-high';
    if (score >= 50) return 'score-mid';
    return 'score-low';
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#4CAF50';
    if (score >= 50) return '#FF9800';
    return '#f44336';
  }
}
