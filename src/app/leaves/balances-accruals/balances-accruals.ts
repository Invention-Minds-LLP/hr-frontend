import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';

interface balancesTable {
  empName: string;
  number: number;
  department: string;
  jobTitle: string;
  shiftType: string;
  totalLeave: string;
  totlePerm: string;
  email: string;
  empId:string;
}

@Component({
  selector: 'app-balances-accruals',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule],
  templateUrl: './balances-accruals.html',
  styleUrl: './balances-accruals.css'
})
export class BalancesAccruals {
  balancesData: balancesTable[] = [
    {
      empName: 'Govindaraj', empId:'IM003',number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', empId:'IM003', number: 9876543210, department: 'Development', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', empId:'IM003', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', empId:'IM003', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', empId:'IM003', number: 9876543210, department: 'HR', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', empId:'IM003', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', empId:'IM003', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj',empId:'IM003', number: 9876543210, department: 'Finance', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', empId:'IM003', number: 9876543210, department: 'Development', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', empId:'IM003', number: 9876543210, department: 'HR', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', empId:'IM003', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', empId:'IM003', number: 9876543210, department: 'HR', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', empId:'IM003', number: 9876543210, department: 'Operations', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
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

