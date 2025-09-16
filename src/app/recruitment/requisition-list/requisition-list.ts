import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RequisitionService } from '../../services/requisition-service/requisition-service';
import { Tag } from 'primeng/tag';
import { RequisitionForm } from '../requisition-form/requisition-form';

@Component({
  selector: 'app-requisition-list',
  imports: [CommonModule, TableModule, ButtonModule, Tag, RequisitionForm],
  templateUrl: './requisition-list.html',
  styleUrl: './requisition-list.css'
})
export class RequisitionList {
  requisitions: any[] = [];
  selectedRequisition: any = null;
  loading = true;

  @Output() selectRequisition = new EventEmitter<any>();

  constructor(private requisitionService: RequisitionService) {}

  ngOnInit() {
    this.loadRequisitions();
  }

  loadRequisitions() {
    this.requisitionService.getRequisitions().subscribe({
      next: (data) => {
        this.requisitions = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching requisitions:', err);
        this.loading = false;
      }
    });
  }

  onSelect(req: any) {
    this.selectedRequisition = req;
    this.selectRequisition.emit(req);
  }
  closeRequisition() {
    this.selectedRequisition = null;
  }
}
