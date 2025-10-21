import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RequisitionService } from '../../services/requisition-service/requisition-service';
import { Tag } from 'primeng/tag';
import { RequisitionForm } from '../requisition-form/requisition-form';
import { Departments } from '../../services/departments/departments';

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
  departments: any[] = [];

  @Output() selectRequisition = new EventEmitter<any>();

  constructor(private requisitionService: RequisitionService, private departmentService: Departments) {}

  ngOnInit() {
    this.loadRequisitions();
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
  }

  createNewRequisition() {
    this.selectedRequisition = {}; // or null-based blank object
  }
  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }

  getDepartmentName(id: number): string {
    return this.departments.find(dep => dep.id === id)?.name || 'N/A';
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
