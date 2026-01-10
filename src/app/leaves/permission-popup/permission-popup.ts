import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Permission } from '../../services/permission/permission';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Toast, ToastModule } from "primeng/toast";

@Component({
  selector: 'app-permission-popup',
  imports: [CommonModule, FormsModule, ToastModule],
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
  isLoading = false;

  constructor(private permissionService: Permission, private messageService: MessageService) { }


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
      this.reason = this.permissionData.reson || '';
      console.log(this.reason, this.permissionData)
      this.declineReason = this.permissionData.declineReason || ''

    }
    this.loadMonthlyPermissionUsage();
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

    if (!this.reason) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please provide a reason for the permission request.'
      });
      return;
    }

    if (!this.validatePermission()) return;

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

    this.isLoading = true;

    // Call API
    this.permissionService.createPermission(payload).subscribe({
      next: () => {
        // alert('Permission request submitted successfully!');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Permission request submitted successfully!'
        });
        this.isLoading = false;
        this.closePopup();
      },
      error: (err) => {
        console.error('Error creating permission request:', err);
        this.isLoading = false;
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
  remainingPermission = 0;
  usedPermissionHours = 0;
  maxPermissionHours = 2;

  loadMonthlyPermissionUsage() {
    this.permissionService
      .getMonthlyPermissionUsage(Number(this.employeeId))
      .subscribe(res => {
        this.usedPermissionHours = res.usedHours;
        this.maxPermissionHours = res.maxHours;
      });
  }

  checkPermissionBalance() {
    const year = new Date(this.day).getFullYear();
    const type = this.permissionType;

    this.permissionService.getPermissionBalance(Number(this.employeeId), year)
      .subscribe((balances: any) => {
        const bal = balances.find((b: any) => b.permissionType === type);

        if (!bal) return;

        this.remainingPermission = bal.remaining;

        if (bal.remaining <= 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'No Permission Balance',
            detail: `You do not have available permissions for ${type}.`
          });
          this.permissionType = '';
        }
      });
  }
  validatePermission(): boolean {
    const from = this.combineDateAndTime(
      new Date(this.day),
      this.startTime
    );

    const to = this.combineDateAndTime(
      new Date(this.day),
      this.endTime
    );

    const requestedHours =
      (to.getTime() - from.getTime()) / (1000 * 60 * 60);

    console.log(requestedHours)

    if (requestedHours <= 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid Time',
        detail: 'End time must be after start time'
      });
      return false;
    }

    const totalAfterRequest =
      this.usedPermissionHours + requestedHours;
    console.log(totalAfterRequest)

    if (totalAfterRequest > this.maxPermissionHours) {
      this.messageService.add({
        severity: 'error',
        summary: 'Permission Limit Exceeded',
        detail: `You already used ${this.usedPermissionHours} hrs this month.
Only ${(this.maxPermissionHours - this.usedPermissionHours).toFixed(2)} hr(s) remaining.`
      });
      return false;
    }

    return true;
  }
  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);

    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);

    return result;
  }

}
