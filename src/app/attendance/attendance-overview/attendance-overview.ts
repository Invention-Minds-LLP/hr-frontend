import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { History } from "../history/history";
import { UnreportedEmployee } from "../../employee/unreported-employee/unreported-employee";
import { ManageAttendance } from "../manage-attendance/manage-attendance";

@Component({
  selector: 'app-attendance-overview',
  imports: [CommonModule, History, UnreportedEmployee, ManageAttendance, ModuleGuide],
  templateUrl: './attendance-overview.html',
  styleUrl: './attendance-overview.css',
})
export class AttendanceOverview {
  active:string = 'attendance';
  selectedEmployee: any = null;
  roleId: number = Number(localStorage.getItem('roleId')) || 0;
  deptId: number = Number(localStorage.getItem('deptId')) || 0;



  show(value: string){
    this.active = value;
    
  }
}
