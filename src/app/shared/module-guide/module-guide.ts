import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface GuidePoint {
  label: string;
  desc: string;
}

@Component({
  selector: 'app-module-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './module-guide.html',
  styleUrl: './module-guide.css',
})
export class ModuleGuide {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() points: GuidePoint[] = [];

  expanded = false;

  toggle() {
    this.expanded = !this.expanded;
  }
}
