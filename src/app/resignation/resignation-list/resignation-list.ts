import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Resignation } from '../../services/resignation/resignation';
import { DialogModule } from 'primeng/dialog';
import { ResignPost } from '../resign-post/resign-post';
import { RouterLink, RouterModule } from '@angular/router';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';
import { IconField, IconFieldModule } from 'primeng/iconfield';
import { InputIcon, InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Departments } from '../../services/departments/departments';
import { Tooltip, TooltipModule } from "primeng/tooltip";
import { ToolbarModule } from 'primeng/toolbar';

@Component({
  selector: 'app-resignation-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, DatePipe, DialogModule, ResignPost, RouterModule, IconFieldModule, InputIconModule, InputTextModule, TooltipModule],
  templateUrl: './resignation-list.html',
  styleUrl: './resignation-list.css'
})
export class ResignationList {
  rows: any[] = [];
  role = (localStorage.getItem('role') || '');
  employeeId = Number(localStorage.getItem('empId') || 0);
  managerId = this.employeeId; // assumes logged in user is potential manager
  showPostHr = false;
  isHR = ['HR', 'HR MANAGER'].includes((localStorage.getItem('role') || '').toUpperCase());

  filteredRows: any[] = []
  showFilterDropdown = false
  selectedFilter: any = null

  filterOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Status', value: 'status' },
    { label: 'Department', value: 'department' }

  ]

  departments: any[] = [];
  departmentMap: Record<number, string> = {};

  constructor(private api: Resignation, private dept: Departments) { }

  ngOnInit() {
    // const norm = this.normalize(this.role);
    if (this.role === 'HR' || this.role === 'HR Manager' || this.role === 'Management') {
      this.api.list({ scope: 'all' }).subscribe(r => {
        this.rows = r;
        this.filteredRows = [...this.rows]
        // console.log(this.filteredRows)
      });
    } else if (this.role === 'Reporting Manager' || this.role === 'Manager') {
      this.api.list({ scope: 'manager', managerId: this.managerId }).subscribe(r => {
        this.rows = r
        this.filteredRows = [...this.rows]
        // console.log(this.filteredRows)
      });
    } else {
      this.api.list({ scope: 'mine', employeeId: this.employeeId }).subscribe(r => {
        this.rows = r
        this.filteredRows = [...this.rows]
        // console.log(this.filteredRows)
      });
    }

    this.dept.getDepartments().subscribe((depts: any[]) => {
      this.departments = depts;

      this.departmentMap = this.departments.reduce((map, dept) => {
        map[dept.id] = dept.name;
        return map;
      }, {} as Record<number, string>);
    });

    this.filteredRows = [...this.rows]
  }

  approveManager(r: any) {
    this.api.managerApprove(r.id, {}).subscribe(upd => this.replace(upd));
  }
  rejectManager(r: any) {
    const note = prompt('Rejection reason?') || '';
    this.api.managerReject(r.id, { note }).subscribe(upd => this.replace(upd));
  }
  approveHR(r: any) {
    const lwd = prompt('Actual Last Working Day (yyyy-mm-dd)? Leave blank to keep proposed.') || '';
    this.api.hrApprove(r.id, { actualLastWorkingDay: lwd || undefined }).subscribe(upd => this.replace(upd));
  }
  rejectHR(r: any) {
    const note = prompt('Rejection reason?') || '';
    this.api.hrReject(r.id, { note }).subscribe(upd => this.replace(upd));
  }
  cancelHR(r: any) {
    this.api.hrCancel(r.id).subscribe(upd => this.replace(upd));
  }

  private replace(upd: any) {
    this.rows = this.rows.map(x => x.id === upd.id ? upd : x);
  }

  private normalize(s: string) {
    const n = s.trim().replace(/[_\s]+/g, ' ');
    const map: Record<string, string> = {
      'hr': 'hr',
      'human resources': 'hr',
      'hr manager': 'hr manager',
      'hrm': 'hr manager',
      'reporting manager': 'reporting manager',
      'manager': 'reporting manager'
    };
    return map[n] || s.toLowerCase().replace(/\s+/g, '_');
  }
  holdHR(r: any) {
    const note = prompt('Reason for putting on hold?') || '';
    this.api.hrHold(r.id, { note }).subscribe(upd => this.replace(upd));
  }
  dialogOpen: Record<number, boolean> = {};

  openDialog(id: number) { this.dialogOpen[id] = true; }
  closeDialog(id: number) { this.dialogOpen[id] = false; }
  isOpen(id: number) { return !!this.dialogOpen[id]; }
  approveWithdrawHR(r: any) {
    const note = prompt('Optional note for approving withdraw?') || '';
    this.api.hrApproveWithdraw(r.id, { note, approvedBy: this.employeeId })
      .subscribe(upd => this.replace(upd));
  }

  rejectWithdrawHR(r: any) {
    const note = prompt('Reason for rejecting withdraw?') || '';
    this.api.hrRejectWithdraw(r.id, { note, rejectedBy: this.employeeId })
      .subscribe(upd => this.replace(upd));
  }



  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    this.showFilterDropdown = false;
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!this.selectedFilter || !searchText) {
      this.filteredRows = [...this.rows];
      return;
    }

    const filterKey = this.selectedFilter.value;

    this.filteredRows = this.rows.filter(r => {
      if (filterKey === 'name') {
        const fullName = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
        return fullName.includes(searchText);
      } else if (filterKey === 'department') {
        const deptName = this.departmentMap[r.employee?.departmentId] || '';
        return deptName.toLowerCase().includes(searchText);
      }
      else if (filterKey) {
        const val = r[filterKey];
        return val?.toString().toLowerCase().includes(searchText);
      }
      console.log(this.filteredRows)
    }

    )

  }

   getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }

}
