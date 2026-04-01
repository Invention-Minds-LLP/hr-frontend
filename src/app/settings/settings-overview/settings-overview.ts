import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Profile } from "../profile/profile";
import { ResetPassword } from "../reset-password/reset-password";
import { Table } from "../table/table";
import { LoginCreation } from "../login-creation/login-creation";
import { Export } from "../export/export";
import { Masters } from "../masters/masters";

@Component({
  selector: 'app-settings-overview',
  imports: [CommonModule, Profile, ResetPassword, Table, LoginCreation, Export, Masters],
  templateUrl: './settings-overview.html',
  styleUrl: './settings-overview.css'
})
export class SettingsOverview {
  active:string = 'profile';
  selectedEmployee: any = null;
  allowedRoles = ['EXECUTIVE', 'INTERN', 'JUNIOR_EXECUTIVE', 'REPORTING_MANAGER', 'INCHARGE'];
  isRestricted = true;
  isHr = false;

  show(value: string){
    this.active = value;
  }
  ngOnInit(): void {
    const raw =
      localStorage.getItem('role')
    const norm = this.normalizeRole(raw);
    console.log('role raw:', raw, '→ normalized:', norm);
    this.isRestricted = this.allowedRoles.includes(norm);
    console.log(this.isRestricted)
    this.isHr = localStorage.getItem('deptId') === '1'; // Assuming deptId '1' is HR, adjust as needed
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
