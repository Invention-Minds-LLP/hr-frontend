import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaveRequest } from "../leave-request/leave-request/leave-request";
import { WfhPopup } from "../wfh-popup/wfh-popup";
import { WorkFromHome } from "../work-from-home/work-from-home";
import { PermissionRequest } from "../permission-request/permission-request/permission-request";
import { BalancesAccruals } from "../balances-accruals/balances-accruals";

@Component({
  selector: 'app-leave-overview',
  imports: [CommonModule, LeaveRequest, WorkFromHome, PermissionRequest, BalancesAccruals],
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
