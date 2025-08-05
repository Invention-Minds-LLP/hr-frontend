import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';

interface Table {
  empName: string;
  department: string;
  appraisalCycle: string;
  selfScore: string;
  mgrScore: string;
  hrScore: string;
  finalScore: string;
  outCome: string;
  status: string;
  email: string;
  empId:string;
}

@Component({
  selector: 'app-appraisal-table',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule],
  templateUrl: './appraisal-table.html',
  styleUrl: './appraisal-table.css'
})
export class AppraisalTable {

  table: Table[] = [
    {
      empName: 'Govindaraj',
      department: 'Development',
      appraisalCycle: 'Annual',
      selfScore: '9',
      mgrScore: '8.5',
      hrScore: '7',
      finalScore: '90',
      outCome: 'Promotion',
      status: 'Manager Review',
      email: 'govindaraj@gmail.com',
      empId:'IM003'

    },
    {
      empName: 'Govindaraj',
      department: 'Finance',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '10',
      outCome: 'Promotion',
      status: 'Pending',
      email: 'govindaraj@gmail.com',
      empId:'IM003'
    },
    {
      empName: 'Govindaraj',
      department: 'Development',
      appraisalCycle: 'Annual',
      selfScore: '9',
      mgrScore: '--',
      hrScore: '7',
      finalScore: '10',
      outCome: 'Promotion',
      status: 'Manager Review',
      email: 'govindaraj@gmail.com',
      empId:'IM003',
    },
    {
      empName: 'Govindaraj',
      department: 'HR',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '80',
      outCome: 'Promotion',
      status: 'Pending',
      email: 'govindaraj@gmail.com',
      empId:'IM003'
    },
    {
      empName: 'Govindaraj',
      department: 'Design',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '20',
      outCome: 'Promotion',
      status: 'Pending',
      email: 'govindaraj@gmail.com',
      empId:'IM003'
    },
    {
      empName: 'Govindaraj',
      department: 'Finance',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '20',
      outCome: 'Promotion',
      status: 'Manager Review',
      email: 'govindaraj@gmail.com',
      empId:'IM003'
    },
    {
      empName: 'Govindaraj',
      department: 'Development',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '10',
      outCome: 'Promotion',
      status: 'Pending',
      email: 'govindaraj@gmail.com',
      empId:'IM003'
    },
    {
      empName: 'Govindaraj',
      department: 'Design',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '20',
      outCome: 'Promotion',
      status: 'Pending',
      email: 'govindaraj@gmail.com',
      empId:'IM003'
    },
    {
      empName: 'Govindaraj',
      department: 'HR',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '50',
      outCome: 'Promotion',
      status: 'Manager Review',
      email: 'govindaraj@gmail.com',
      empId:'IM003'
    },
    {
      empName: 'Govindaraj',
      department: 'Development',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '20',
      outCome: 'Promotion',
      status: 'Pending',
      email: 'govindaraj@gmail.com',
      empId:'IM003'
    },
    {
      empName: 'Govindaraj',
      department: 'Design',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '20',
      outCome: 'Promotion',
      status: 'Manager Review',
      email: 'govindaraj@gmail.com',
      empId:'IM003'
    },
    {
      empName: 'Govindaraj',
      department: 'Development',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '20',
      outCome: 'Promotion',
      status: 'Pending',
      email: 'govindaraj@gmail.com',
      empId:'IM003'
    },
    {
      empName: 'Govindaraj',
      department: 'Development',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '20',
      outCome: 'Promotion',
      status: 'Manager Review',
      email: 'govindaraj@gmail.com',
      empId:'IM003'
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
