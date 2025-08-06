import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';

interface balancesTable {
  empName: string;
  number: number;
  department: string;
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
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule],
  templateUrl: './balances-accruals.html',
  styleUrl: './balances-accruals.css'
})
export class BalancesAccruals {

  filterBalancesData: any[] = [];
  selectedFilter: any = null;
  filterDropdown: boolean = false;

  filterOption = [
    { label: 'Employee ID', value: 'empId' },
    { label: 'Name', value: 'name' },
    { label: 'Departmnent', value: 'department' },
    { label: 'JobTitle', value: 'jobtitle' },
    { label: 'ShiftType', value: 'shiftType' }
  ]


  balancesData: any[] = [];


  ngOnInit() {
    this.balancesData = [...this.balancesData];
    this.filterBalancesData = [...this.balancesData];
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!searchText) {
      this.filterBalancesData = [...this.balancesData]
      return
    }

    const filterKey = this.selectedFilter?.value as keyof balancesTable;

    this.filterBalancesData = this.balancesData.filter((balance: balancesTable) => {
      if (filterKey === 'name') {
        return balance.empName?.toLocaleLowerCase().includes(searchText)
      }

      return balance[filterKey]?.toString().toLowerCase().includes(searchText)
    })

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

