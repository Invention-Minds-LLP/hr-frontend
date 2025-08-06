import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaveRequest } from "../leave-request/leave-request/leave-request";

@Component({
  selector: 'app-leave-overview',
  imports: [CommonModule, LeaveRequest],
  templateUrl: './leave-overview.html',
  styleUrl: './leave-overview.css'
})
export class LeaveOverview {
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
