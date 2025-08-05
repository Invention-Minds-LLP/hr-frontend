import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { DatePicker } from 'primeng/datepicker';
import { formatDate } from '@angular/common';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';
import { TooltipModule } from 'primeng/tooltip';

type FilterField = keyof leaveTable;

interface leaveTable {
  empId: string;
  empName: string;
  department: string;
  jobTitle: string;
  leaveType: string;
  reson: string;
  noOfDays: string;
  email: string;
}

@Component({
  selector: 'app-leave-request',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule, DatePicker,TooltipModule],
  templateUrl: './leave-request.html',
  styleUrl: './leave-request.css'
})
export class LeaveRequest {
  searchTerm: string = '';
  selectedFilter: FilterField = "empName";
  filterActive: boolean = false;
  dropdownVisible = false;

  leaveData: leaveTable[] = [
    {
      empId: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Sick Leave', reson: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididun.', noOfDays: '', email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Sick Leave', reson: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididun.', noOfDays: '', email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Muni', department: 'HR', jobTitle: 'UI/UX Designer', leaveType: 'Casual Leave', reson: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididun.', noOfDays: '', email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Casual Leave', reson: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididun.', noOfDays: '', email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Govindaraj', department: 'Development', jobTitle: 'UI/UX Designer', leaveType: 'Sick Leave', reson: 'Personal I don’t w...', noOfDays: '', email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Muni', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Sick Leave', reson: 'Personal I don’t w...', noOfDays: '', email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Casual Leave', reson: 'Personal I don’t w...', noOfDays: '', email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Muni', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Sick Leave', reson: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididun.', noOfDays: '', email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Casual Leave', reson: 'Personal I don’t w...', noOfDays: '', email: 'govindaraj@gmail.com'
    },
  ]

  department = [
    { label: 'Employee ID', value: 'empId' },
    { label: 'Employee Name', value: 'empName' },
  ];

  //search 
  get FilteredLeave() {
    const term = this.searchTerm?.toLowerCase() || '';
    return this.leaveData.filter(item => {
      if (!term) return true;
      const fieldValue = (item[this.selectedFilter] as string)?.toLowerCase() || '';
      return fieldValue.includes(term);
    });
  }


  

  toggleFilterDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.dropdownVisible = !this.dropdownVisible;
  }

  selectFilter(value: any, event: MouseEvent) {
    event.stopPropagation();
    this.selectedFilter = value;
    this.filterActive = true;
    this.dropdownVisible = false;
    console.log(this.dropdownVisible)
  }
  get isFilterActive(): boolean {
    return this.filterActive;
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
