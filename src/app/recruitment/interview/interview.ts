import { Component, inject, signal, OnInit, Output,EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Recuriting } from '../../services/recruiting/recuriting';

// PrimeNG (optional)
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-interview',
  imports: [CommonModule, DatePipe, TableModule, CardModule, ButtonModule],
  templateUrl: './interview.html',
  styleUrl: './interview.css'
})
export class Interview {
  private svc = inject(Recuriting);
  private router = inject(Router);
  @Output() evaluate = new EventEmitter<any>();

  rows = signal<any[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.svc.getAllInterview().subscribe({
      next: (data) => this.rows.set(data || []),
      error: () => this.rows.set([]),
    });
  }
  onEvaluate(row: any) {
    this.evaluate.emit(row);           // <-- emit to parent
  }

}
