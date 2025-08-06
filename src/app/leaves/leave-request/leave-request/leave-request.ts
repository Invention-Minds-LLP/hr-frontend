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




interface leaveTable {
  empId: string;
  empName: string;
  department: string;
  jobTitle: string;
  leaveType: string;
  reson: string;
  noOfDays: Date[];
  email: string;
  [key: string]: any;
}

@Component({
  selector: 'app-leave-request',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule, DatePicker, TooltipModule],
  templateUrl: './leave-request.html',
  styleUrl: './leave-request.css'
})
export class LeaveRequest {
  filteredLeaveData: any[] = [];
  selectedFilter: any = null;
  showFilterDropdown: boolean = false
  filterOptions = [
    { label: 'Employee ID', value: 'empId' },
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'department' },
    { label: 'Leave Type', value: 'leaveType' },
  ];

  leaveData: leaveTable[] = [
    {
      empId: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Sick Leave', reson: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididun.', noOfDays: [], email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Sick Leave', reson: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididun.', noOfDays: [], email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Muni', department: 'HR', jobTitle: 'UI/UX Designer', leaveType: 'Casual Leave', reson: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididun.', noOfDays: [], email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Casual Leave', reson: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididun.', noOfDays: [], email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Govindaraj', department: 'Development', jobTitle: 'UI/UX Designer', leaveType: 'Sick Leave', reson: 'Personal I don’t w...', noOfDays: [], email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Muni', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Sick Leave', reson: 'Personal I don’t w...', noOfDays: [], email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Casual Leave', reson: 'Personal I don’t w...', noOfDays: [], email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Muni', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Sick Leave', reson: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididun.', noOfDays: [], email: 'govindaraj@gmail.com'
    },
    {
      empId: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', leaveType: 'Casual Leave', reson: 'Personal I don’t w...', noOfDays: [], email: 'govindaraj@gmail.com'
    },
  ]




  ngOnInit() {
    this.leaveData = [...this.leaveData];
    this.filteredLeaveData = [...this.leaveData];
    this.buildDisabledDates();
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!searchText) {
      this.filteredLeaveData = [...this.leaveData];
      return;
    }

    const filterKey = this.selectedFilter?.value as keyof leaveTable;

    this.filteredLeaveData = this.leaveData.filter((leave: leaveTable) => {
      if (filterKey === 'name') {
        return leave.empName?.toLowerCase().includes(searchText);
      }

      return leave[filterKey]?.toString().toLowerCase().includes(searchText);
    });
  }


  onFilterChange() {
    this.filteredLeaveData = [...this.leaveData];
  }

  toggleFilterDropdown(): void {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    this.showFilterDropdown = false;
    this.onFilterChange();
  }


  availableDates: Date[] = [
    new Date('2025-07-09'),
    new Date('2025-07-10'),
    new Date('2025-07-11'),
    new Date('2025-07-12'),
    new Date('2025-07-13')
  ];

  selectedDate: Date[] = [...this.availableDates]; // Show first date by default
  minDate: Date = this.availableDates[0];
  maxDate: Date = this.availableDates[this.availableDates.length - 1];
  disabledDates: Date[] = [];

  buildDisabledDates() {
    const start = new Date(this.minDate);
    const end = new Date(this.maxDate);
    const allowedTimestamps = this.availableDates.map(d => d.getTime());

    while (start <= end) {
      if (!allowedTimestamps.includes(start.getTime())) {
        this.disabledDates.push(new Date(start));
      }
      start.setDate(start.getDate() + 1);
    }
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
