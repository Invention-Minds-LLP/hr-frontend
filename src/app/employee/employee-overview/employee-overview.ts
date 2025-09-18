import { Component } from '@angular/core';
import { EmployeeForm } from "../employee-form/employee-form";
import { EmployeeList } from "../employee-list/employee-list";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-employee-overview',
  imports: [EmployeeForm, EmployeeList, CommonModule],
  templateUrl: './employee-overview.html',
  styleUrl: './employee-overview.css'
})
export class EmployeeOverview {
  active:string = 'list';
  selectedEmployee: any = null;

  show(value: string){
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
