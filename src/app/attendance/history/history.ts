import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { label } from '@primeuix/themes/aura/metergroup';

interface history {
  empName: string;
  phoneNumber: number;
  department: string;
  jobTitle: string;
  empType: string;
  shiftType: string;
  leaveDetails: string;
  email: string;
  empId: string;
  [key: string]: any;
}

@Component({
  selector: 'app-history',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule],
  templateUrl: './history.html',
  styleUrl: './history.css'
})
export class History {

  filterHistoryData: any[] = [];
  selectedFilter: any = null;
  filterDropdown: boolean = false;

  filterOption = [
    { label: 'Employee ID', value: 'empId' },
    { label: 'Name', value: 'name' },
    { label: 'Departmnent', value: 'department' },
    { label: 'JobTitle', value: 'jobtitle' },
    {label:'EmpType', value:'empType'}
  ]


  historyData: history[] = [

    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'HR', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'Development', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'HR', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'Development', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'Finance', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'Finance', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
    { empName: 'Govindaraj', empId: 'IM003', phoneNumber: 6382112242, department: 'Design', jobTitle: 'Designer', empType: 'Onsite-Fulltime', shiftType: 'Morning', leaveDetails: '22 Days', email: 'govindaraj@gmail.com' },
  ]


  ngOnInit() {
    this.historyData = [...this.historyData];
    this.filterHistoryData = [...this.historyData];
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!searchText) {
      this.filterHistoryData = [...this.historyData]
      return
    }

    const filterKey = this.selectedFilter?.value as keyof history;

    this.filterHistoryData = this.historyData.filter((history: history) => {
      if (filterKey === 'name') {
        return history.empName?.toLocaleLowerCase().includes(searchText)
      }

      return history[filterKey]?.toString().toLowerCase().includes(searchText)
    })

  }


  onFilterChange() {
    this.filterHistoryData = [...this.historyData]
  }

  toggleDropdown() {
    this.filterDropdown = !this.filterDropdown
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    this.filterDropdown = false;
    this.onFilterChange()
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
