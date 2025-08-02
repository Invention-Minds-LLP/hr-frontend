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
      empName: 'Govindaraj', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', number: 9876543210, department: 'Finance', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', number: 9876543210, department: 'Development', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', number: 9876543210, department: 'HR', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', number: 9876543210, department: 'Design', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', number: 9876543210, department: 'HR', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', number: 9876543210, department: 'Operations', jobTitle: 'UI/UX Designer', shiftType: 'Morning', totalLeave: '33 Days', totlePerm: '22 Hours', email: 'govindaraj@gmail.com'
    },
  ]

  departmentColors: { [key: number]: { badge: string; dot: string } } = {
  1: { badge: 'dept-green', dot: 'dot-green' },      // Design
  2: { badge: 'dept-yellow', dot: 'dot-yellow' },    // HR
  3: { badge: 'dept-red', dot: 'dot-red' },          // Finance
  4: { badge: 'dept-blue', dot: 'dot-blue' },        // Development
  5: { badge: 'dept-purple', dot: 'dot-purple' },    // Operations
  6: { badge: 'dept-orange', dot: 'dot-orange' },    // Support
  7: { badge: 'dept-teal', dot: 'dot-teal' },        // QA
  // Add more as needed
};



}

