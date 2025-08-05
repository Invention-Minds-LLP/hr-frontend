import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';

interface history {
  empName: string;
  phoneNumber: number;
  department: string;
  jobTitle: string;
  empType: string;
  shiftType: string;
  leaveDetails: string;
  email: string;
  empId:string;
}

@Component({
  selector: 'app-history',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule],
  templateUrl: './history.html',
  styleUrl: './history.css'
})
export class History {

  historyData: history[] = [

    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382112242, department: 'HR', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382112242, department: 'Development', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382112242, department: 'HR', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382112242, department: 'Development', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj',empId:'IM003', phoneNumber: 6382112242, department: 'Finance', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382112242, department: 'Finance', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
  ]

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
