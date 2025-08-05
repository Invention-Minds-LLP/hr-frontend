import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';


interface WFHTable {
  empName: string;
  department: string;
  jobTitle: string;
  WFHDate: string;
  reson: string;
  email: string;
}

@Component({
  selector: 'app-work-from-home',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule,TooltipModule],
  templateUrl: './work-from-home.html',
  styleUrl: './work-from-home.css'
})
export class WorkFromHome {
  wfhData: WFHTable[] = [
    {
      empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', department: 'Development', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', department: 'HR', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', department: 'Finance', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', department: 'Development', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empName: 'Govindaraj', department: 'Finance', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
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
