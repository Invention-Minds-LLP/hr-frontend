import { Component } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { IconField } from 'primeng/iconfield';
import { CommonModule } from '@angular/common';
import { ShiftRequests } from "../shift-requests/shift-requests";
import { ManagerShift } from "../manager-shift/manager-shift";
import { EmployeeDetails } from "../../leaves/employee-details/employee-details";
import { EmployeeShiftList } from "../employee-shift-list/employee-shift-list";

@Component({
  selector: 'app-shift-overview',
  imports: [IconField, InputTextModule, FormsModule, CommonModule, ShiftRequests, ManagerShift, EmployeeDetails, EmployeeShiftList],
  templateUrl: './shift-overview.html',
  styleUrl: './shift-overview.css',
})
export class ShiftOverview {
  active: string = ''; // 'requests' | 'manager-shift' | 'employee-shifts' | 'employee-details'
  selectedEmployee: any = null;
  deptId: any = Number(localStorage.getItem('deptId')) || 0

ngOnInit(){
  if(Number(localStorage.getItem('deptId')) === 1){
    this.active = 'hr'
  }
  else{
    this.active = 'manager'
  }
}

  show(value: string) {
    this.active = value;
  }
  onEditEmployee(employee: any) {
    this.selectedEmployee = employee;
    this.active = 'form';
  }
  onFormClose(refreshList: boolean = false) {
    this.selectedEmployee = null;
    this.active = 'list';
  }

}
