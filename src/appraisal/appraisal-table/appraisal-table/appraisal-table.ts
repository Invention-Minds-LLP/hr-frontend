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
      email: 'govindaraj@gmail.com'

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
      email: 'govindaraj@gmail.com'
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
      email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj',
      department: 'Development',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '80',
      outCome: 'Promotion',
      status: 'Pending',
      email: 'govindaraj@gmail.com'
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
      email: 'govindaraj@gmail.com'
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
      email: 'govindaraj@gmail.com'
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
      email: 'govindaraj@gmail.com'
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
      email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj',
      department: 'Development',
      appraisalCycle: 'Annual',
      selfScore: '--',
      mgrScore: '8.5',
      hrScore: '--',
      finalScore: '50',
      outCome: 'Promotion',
      status: 'Manager Review',
      email: 'govindaraj@gmail.com'
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
      email: 'govindaraj@gmail.com'
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
      email: 'govindaraj@gmail.com'
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
      email: 'govindaraj@gmail.com'
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
      email: 'govindaraj@gmail.com'
    },
  ]


  getStatusClass(status: string): string {
  // Example logic
  if (status === 'Manager Review') {
    return 'green-color';
  } else if (status === 'Pending') {
    return 'yellow-color';
  } else {
    return 'green-color'; // default
  }
}

getDotClass(status: string): string {
  if (status === 'Manager Review') {
    return 'green-dot';
  } else if (status === 'Pending') {
    return 'yellow-dot';
  } else {
    return 'green-dot'; // default
  }
}


}
