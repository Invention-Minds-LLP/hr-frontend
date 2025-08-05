import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';

interface Attendance {
  empName: string;
  phoneNumber: number;
  department: string;
  jobTitle: string;
  empType: string;
  email: string;
  status: 'Present' | 'Absent' | null;
  empId:string;
}

@Component({
  selector: 'app-manage-attendance',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule],
  templateUrl: './manage-attendance.html',
  styleUrl: './manage-attendance.css'
})
export class ManageAttendance {

  attendanceData: Attendance[] = [
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382348091, department: 'Development', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
    { empName: 'Govindaraj',empId:'IM003' ,phoneNumber: 6382348091, department: 'Design', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382348091, department: 'Development', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Absent' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'HR', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Development', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Absent' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Finance', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Development', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Absent' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Design', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Development', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Absent' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Finance', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Development', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Absent' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Finance', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
  ]

  setStatus(attendanceData: Attendance, newStatus: 'Present' | 'Absent') {
    attendanceData.status = newStatus;
  }

  getDeptClass(department: string): string {
  switch (department) {
    case 'Design':
      return 'design-dept';
    case 'Development':
      return 'dev-dept';
    case 'HR':
      return 'hr-dept';
    case 'Finance':
      return 'finance-dept';
    default:
      return 'default-dept';
  }
}

getDotColor(department: string): string {
  switch (department) {
    case 'Design':
      return '#00c853'; // green
    case 'Development':
      return '#2962ff'; // blue
    case 'HR':
      return '#ff6d00'; // orange
    case 'Finance':
      return '#d500f9'; // purple
    default:
      return '#9e9e9e'; // gray
  }
}


}
