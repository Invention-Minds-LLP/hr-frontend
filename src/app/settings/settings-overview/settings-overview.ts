import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Profile } from "../profile/profile";
import { ResetPassword } from "../reset-password/reset-password";
import { Table } from "../table/table";
import { LoginCreation } from "../login-creation/login-creation";
import { Export } from "../export/export";
import { ResignationForm } from "../../resignation/resignation-form/resignation-form";

@Component({
  selector: 'app-settings-overview',
  imports: [CommonModule, Profile, ResetPassword, Table, LoginCreation, Export, ResignationForm],
  templateUrl: './settings-overview.html',
  styleUrl: './settings-overview.css'
})
export class SettingsOverview {
  active:string = 'profile';
  selectedEmployee: any = null;
  allowedRoles = ['EXECUTIVE', 'INTERN', 'JUNIOR_EXECUTIVE', 'REPORTING_MANAGER', 'INCHARGE'];
  isRestricted = true;
  isHr = false;
  /** Login audit is HR-department, but not for its executives (roleId 2). */
  canViewLoginActivities = false;

  @ViewChild('resignationForm') resignationForm!: ResignationForm;

  show(value: string){
    this.active = value;
  }

  openResignationForm() {
    if (this.resignationForm) this.resignationForm.open();
  }
  ngOnInit(): void {
    const raw =
      localStorage.getItem('role')
    const norm = this.normalizeRole(raw);
    console.log('role raw:', raw, '→ normalized:', norm);
    this.isRestricted = this.allowedRoles.includes(norm);
    console.log(this.isRestricted)
    this.isHr = localStorage.getItem('deptId') === '1'; // Assuming deptId '1' is HR, adjust as needed
    this.canViewLoginActivities = this.isHr && Number(localStorage.getItem('roleId')) !== 2;
    // Never leave the hidden tab selected — a deep link or a stale state would
    // otherwise render the list this flag exists to hide.
    if (this.active === 'list' && !this.canViewLoginActivities) this.active = 'profile';
  }

  private normalizeRole(raw: any): string {
    const s = (raw || '').toString().trim().toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
  
    // map common variants/plurals to a canonical form
    const map: Record<string, string> = {
      'executive': 'EXECUTIVE',
      'executives': 'EXECUTIVE',
      'junior executive': 'JUNIOR_EXECUTIVE',
      'jr executive': 'JUNIOR_EXECUTIVE',
      'jr. executive': 'JUNIOR_EXECUTIVE',
      'intern': 'INTERN',
      'interns': 'INTERN',
    };
    return map[s] ?? s.toUpperCase().replace(/ /g, '_');
  }
}
