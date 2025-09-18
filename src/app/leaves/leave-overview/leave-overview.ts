import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaveRequest } from "../leave-request/leave-request/leave-request";
import { WfhPopup } from "../wfh-popup/wfh-popup";
import { WorkFromHome } from "../work-from-home/work-from-home";
import { PermissionRequest } from "../permission-request/permission-request/permission-request";
import { BalancesAccruals } from "../balances-accruals/balances-accruals";
import { EmployeeForm } from "../../employee/employee-form/employee-form";
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-leave-overview',
  imports: [CommonModule, LeaveRequest, WorkFromHome, PermissionRequest, BalancesAccruals, IconField, InputIcon, FormsModule, InputTextModule],
  templateUrl: './leave-overview.html',
  styleUrl: './leave-overview.css'
})
export class LeaveOverview {
  active: string = 'list';
  selectedEmployee: any = null;

  tableHeading: string = 'Leave Request'
  filterOptions: any[] = ['Leave Request']
  showFilterDropdown = false;
  selectedFilter: any = null

  leaveData: any[] = [];
  wfhData: any[] = [];
  permissionData: any[] = []
  balancesData: any[] = []

  filteredLeaveData: any[] = [];
  filteredWfhData: any[] = [];
  filteredpermissionData: any[] = [];
  filteredbalancesData: any[] = [];


  show(value: string) {
    this.active = value;
    switch (value) {
      case 'list':
        this.tableHeading = 'Leave Request';
        this.filterOptions = [
          { label: 'Employee ID', value: 'empId' },
          { label: 'Name', value: 'empName' },
          { label: 'Department', value: 'deptName' },
          { label: 'Leave Type', value: 'leaveType' },
        ];
        break;
      case 'wfh':
        this.tableHeading = 'WFH Request';
        this.filterOptions = [
          { label: 'Employee Id', value: 'empID' },
          { label: 'Name', value: 'empName' },
          { label: 'Department', value: 'deptName' },
          { label: 'JobTitle', value: 'jobTitle' },
        ];
        break;
      case 'permission':
        this.tableHeading = 'Permission Request';
        this.filterOptions = [
          { label: 'Employee ID', value: 'empId' },
          { label: 'Name', value: 'empName' },
          { label: 'Departmnent', value: 'deptName' },
          { label: 'JobTitle', value: 'jobTitle' },
        ];
        break;
      case 'balances':
        this.tableHeading = 'Balances & Accruals';
        this.filterOptions = [
          { label: 'Employee ID', value: 'employeeCode' },
          { label: 'Name', value: 'name' },
          { label: 'Department', value: 'department' },
          { label: 'JobTitle', value: 'designation' },
          { label: 'ShiftType', value: 'shiftType' }];
        break;
      case 'form':
        this.tableHeading = 'Employee Form';
        this.filterOptions = []; // No filters for the form view
        break;
      default:
        this.tableHeading = 'Recruiting';
        this.filterOptions = [];
        break;
    }
  }
  onEditEmployee(employee: any) {
    this.selectedEmployee = employee;
    this.active = 'form';
  }
  onFormClose(refreshList: boolean = false) {
    this.selectedEmployee = null;
    this.active = 'list';
  }

  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown
  }

  selectFilter(option: any) {
    this.selectedFilter = option
    this.showFilterDropdown = false
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const filterElement = document.querySelector('.filter');
    if (filterElement && !filterElement.contains(event.target as Node)) {
      this.showFilterDropdown = false;
    }
  }

  onSearch(event: Event) {
    let currentData: any[];
    let currentFilteredData: any[];
    let filterKey = this.selectedFilter?.value;

    // Determine which data to use based on the active view
    switch (this.active) {
      case 'list':
        currentData = this.leaveData;
        currentFilteredData = this.filteredLeaveData;
        break;
      case 'wfh':
        currentData = this.wfhData;
        currentFilteredData = this.filteredWfhData;
        break;
      case 'permission':
        currentData = this.permissionData;
        currentFilteredData = this.filteredWfhData;
        break;
      case 'balances':
        currentData = this.balancesData;
        currentFilteredData = this.filteredWfhData;
        break;

      default:
        return;
    }

    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!searchText) {
      this.filteredLeaveData = [...this.leaveData];
      this.filteredWfhData = [...this.wfhData];
      this.filteredbalancesData = [...this.balancesData];
      this.filteredpermissionData = [...this.permissionData]
      return;
    }

    const filtered = currentData.filter((item: any) => {
      return item[filterKey]?.toString().toLowerCase().includes(searchText);
    });

    // Set the correct filtered data property
    if (this.active === 'list') {
      this.filteredLeaveData = filtered;
    } else if (this.active === 'wfh') {
      this.filteredWfhData = filtered;

    } else if (this.active === 'permission') {
      this.filteredpermissionData = filtered;

    } else if (this.active === 'balances') {
      this.filteredbalancesData = filtered;
    }
  }
}



