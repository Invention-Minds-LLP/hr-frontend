import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Permission } from '../../services/permission/permission';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  employeeId: string = ''

  constructor(private permissionService: Permission) {}


  ngOnInit(){
    this.employeeId = localStorage.getItem('empId') || '';
    console.log(this.permissionData)
    if(this.permissionData){
          this.permissionType = this.permissionData.permissionType || '';
          this.timing = this.permissionData.timing || '';
          this.day = this.permissionData.day
          ? new Date(this.permissionData.day).toISOString().split('T')[0]
          : '';             
          this.startTime = this.permissionData.startTime || '';
          this.endTime = this.permissionData.endTime || '';
          this.reason = this.permissionData.reson || '';
      
    }
  }

  /** Submit Permission Request */
  submit() {
    // Validation
    if (!this.permissionType || !this.timing || !this.day || !this.reason) {
      alert('Please fill all fields');
      return;
    }

    if (this.timing === 'HOURLY' && (!this.startTime || !this.endTime)) {
      alert('Please select start and end time for hourly permission');
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

    if (this.timing === 'HOURLY') {
      payload.startTime = `${this.day}T${this.startTime}`;
      payload.endTime = `${this.day}T${this.endTime}`;
    }

    // Call API
    this.permissionService.createPermission(payload).subscribe({
      next: () => {
        alert('Permission request submitted successfully!');
        this.closePopup();
      },
      error: (err) => {
        console.error('Error creating permission request:', err);
        alert('Failed to submit permission request.');
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
}
