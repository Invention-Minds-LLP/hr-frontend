import { Component, Input, OnInit } from '@angular/core';
import { Recuriting } from '../../services/recruiting/recuriting';
import { Card } from 'primeng/card';
import { CommonModule } from '@angular/common';
import { Tag } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { Chip } from 'primeng/chip';


@Component({
  selector: 'app-candidate-summary',
  imports: [Card, CommonModule, Tag, TimelineModule, Chip],
  templateUrl: './candidate-summary.html',
  styleUrl: './candidate-summary.css'
})
export class CandidateSummary {
  @Input() applicationId!: number;
  summary: any;

  constructor(private api: Recuriting) {}

  ngOnInit() {
    this.api.getApplicationSummary(this.applicationId).subscribe(res => {
      this.summary = res;
    });
  }
}
