import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Permission } from '../../services/permission/permission';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-permission-popup',
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-popup.html',
  styleUrl: './permission-popup.css'
})
export class PermissionPopup {
  @Input() showPopup: boolean = false;
  @Input() permissionData: any = {};
  @Input() isViewOnly: boolean = false;

  @Output() close = new EventEmitter<void>();


  permissionType = '';
  timing = '';
  day = '';
  startTime = '';
  endTime = '';
  reason = '';
  employeeId: string = '';
  declineReason: string = '';

  constructor(private permissionService: Permission, private messageService : MessageService) { }


  ngOnInit() {
    this.employeeId = localStorage.getItem('empId') || '';
    console.log(this.permissionData)
    if (this.permissionData) {
      this.permissionType = this.permissionData.permissionType || '';
      this.timing = this.permissionData.timing || '';
      this.day = this.permissionData.day
        ? new Date(this.permissionData.day).toISOString().split('T')[0]
        : '';
      this.startTime = this.toTimeInput(this.permissionData.startTime);
      this.endTime = this.toTimeInput(this.permissionData.endTime);
      this.reason = this.permissionData.reason || '';
      this.declineReason = this.permissionData.declineReason || ''

    }
  }

  /** Submit Permission Request */
  submit() {
    // Validation
    if (!this.permissionType || !this.timing || !this.day || !this.reason) {
      // alert('Please fill all fields');
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please fill all fields'
      });
      return;
    }

    if (this.timing === 'HOURLY' && (!this.startTime || !this.endTime)) {
      // alert('Please select start and end time for hourly permission');
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select start and end time for hourly permission'
      });
      return;
    }
    // time required for HOURLY and HALFDAY
    if ((this.timing === 'HOURLY' || this.timing === 'HALFDAY') && (!this.startTime || !this.endTime)) {
      // alert('Please select start and end time.');
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select start and end time.'
      });
      return;
    }

    // optional: ensure start < end
    if ((this.timing === 'HOURLY' || this.timing === 'HALFDAY') && this.startTime >= this.endTime) {
      // alert('End time must be after start time.');
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'End time must be after start time.'
      });
      return;
    }

    // Build payload
    const payload: any = {
      employeeId: parseInt(this.employeeId) || 1,
      permissionType: this.permissionType,
      timing: this.timing,
      day: this.day,
      reason: this.reason
    };

    if (this.timing === 'HOURLY' || this.timing === 'HALFDAY') {
      payload.startTime = `${this.day}T${this.startTime}`;
      payload.endTime = `${this.day}T${this.endTime}`;
    }

    // Call API
    this.permissionService.createPermission(payload).subscribe({
      next: () => {
        // alert('Permission request submitted successfully!');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Permission request submitted successfully!'
        });
        this.closePopup();
      },
      error: (err) => {
        console.error('Error creating permission request:', err);
        // alert('Failed to submit permission request.');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to submit permission request.'
        });
      }
    });
  }

  /** Close popup */
  closePopup() {
    this.permissionType = '';
    this.timing = '';
    this.day = '';
    this.startTime = '';
    this.endTime = '';
    this.reason = '';
    this.close.emit();
  }
  private toTimeInput(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);        // converts from Z to local
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

}
