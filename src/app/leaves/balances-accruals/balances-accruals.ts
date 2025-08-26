import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { Departments } from '../../services/departments/departments';
import { Entitles } from '../../services/entitles/entitles';
import { EmployeeDetails } from "../employee-details/employee-details";

interface balancesTable {
  empName: string;
  number: number;
  department: number;
  jobTitle: string;
  shiftType: string;
  totalLeave: string;
  totlePerm: string;
  email: string;
  empId: string;
  [key: string]: any
}

@Component({
  selector: 'app-balances-accruals',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule, EmployeeDetails],
  templateUrl: './balances-accruals.html',
  styleUrl: './balances-accruals.css'
})
export class BalancesAccruals {

  constructor(private entitleService: Entitles, private departmentService: Departments) { }

  filterBalancesData: any[] = [];
  balancesData: any[] = [];
  selectedFilter: any = null;
  filterDropdown: boolean = false;
  selectedEmployee: any = null;
  requests: any = null;
  departments: any[] = [];
  filterOption = [
    { label: 'Employee ID', value: 'employeeCode' },
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'department' },
    { label: 'JobTitle', value: 'designation' },
    { label: 'ShiftType', value: 'shiftType' }
  ]







  ngOnInit() {
    this.entitleService.getEmployeeUsageSummary().subscribe((data) => {
      this.balancesData = data;
      this.filterBalancesData = [...this.balancesData];
    });
    this.departmentService.getDepartments().subscribe(data => this.departments = data);

  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!searchText) {
      this.filterBalancesData = [...this.balancesData]
      return
    }

    const filterKey = this.selectedFilter?.value;

    this.filterBalancesData = this.balancesData.filter((balance: balancesTable) => {
      if (filterKey === 'department') {
        const deptName = this.getDepartmentName(balance.department)?.toLowerCase()
        return deptName.includes(searchText)
      }

      return balance[filterKey]?.toString().toLowerCase().includes(searchText)
    })


    console.log(this.balancesData)
  }


  onFilterChange() {
    this.filterBalancesData = [...this.balancesData]
  }

  toggleDropdown() {
    this.filterDropdown = !this.filterDropdown
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    this.filterDropdown = false;
    this.onFilterChange()
  }


  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }

  getDepartmentName(id: number): string {
    return this.departments.find(dep => dep.id === id)?.name || 'N/A';
  }
  showEmployeeDetails(employee: any) {
    this.selectedEmployee = employee;
  }

  handleClose() {
    this.selectedEmployee = null;   // hide child
  }


  closeDetails(): void {
    this.selectedEmployee = null;
    this.requests = null;
  }
}

