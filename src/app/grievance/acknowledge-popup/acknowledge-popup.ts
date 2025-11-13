import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Grievance } from '../../services/grievance/grievance';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-acknowledge-popup',
  imports: [CommonModule, DialogModule, ButtonModule],
  templateUrl: './acknowledge-popup.html',
  styleUrl: './acknowledge-popup.css',
})
export class AcknowledgePopup {
  @Input() visible = false;
  @Input() complaint: any;
  @Input() employeeId!: number;
  @Output() close = new EventEmitter<boolean>();

  loading = false;
  acknowledged = false;

  constructor(private ackService: Grievance) {}

  acknowledge() {
    const payload: any = { employeeId: this.employeeId };
    console.log(this.complaint);
    if (this.complaint.type === 'POSH') payload.poshCaseId = this.complaint.id;
    if (this.complaint.type === 'GRIEVANCE') payload.grievanceId = this.complaint.id;

    this.loading = true;
    this.ackService.createAcknowledgement(payload).subscribe({
      next: () => {
        this.acknowledged = true;
        this.loading = false;
        this.onDialogHide();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.acknowledged = false;
      },
    });
  }

  onDialogHide() {
    this.close.emit(false);
    this.acknowledged = false;
  }

}
