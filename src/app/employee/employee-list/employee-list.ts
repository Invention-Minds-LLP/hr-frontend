import { Component, Output, EventEmitter } from '@angular/core';
import { IconField } from 'primeng/iconfield';
import { TableModule } from 'primeng/table';
import { InputIcon } from 'primeng/inputicon';
import { CommonModule } from '@angular/common';
import { Employees } from '../../services/employees/employees';
import { Departments } from '../../services/departments/departments';
import { Branches } from '../../services/branches/branches';
import { Roles } from '../../services/roles/roles';
import { Shifts } from '../../services/shifts/shifts';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';
import { RouterLink, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-employee-list',
  imports: [TableModule, CommonModule, FormsModule, RouterModule, RouterLink, ButtonModule, SkeletonModule],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css'
})
export class EmployeeList {
  @Output() editEmployee = new EventEmitter<any>();

  constructor(private employeeService: Employees, private departmentService: Departments, private branchService: Branches, private roleService: Roles, private shiftService: Shifts) { }

  employee: any[] = [];
  departments: any[] = [];
  branches: any[] = [];
  roles: any[] = [];
  shifts: any[] = [];
  filterOptions = [
    { label: 'Employee Code', value: 'employeeCode' },
    { label: 'Name', value: 'name' },
    { label: 'Branch', value: 'branch' },
    { label: 'Department', value: 'department' },
    { label: 'Status', value: 'employmentStatus' },
    { label: 'Employment Type', value: 'employmentType' },
    { label: 'Shift', value: 'shift' }
  ];

  selectedFilter: any = null;
  filteredEmployees: any[] = [];
  showFilterDropdown = false;

  loading = true



  ngOnInit() {
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => {
        console.log('Employees fetched successfully:', response);
        this.employee = response;
        this.filteredEmployees = [...this.employee];
        this.loading = false
      },
      error: (err) => {
        console.error('Error fetching employees:', err);
        this.loading = false
      }
    });
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
    this.branchService.getBranches().subscribe(data => this.branches = data);
    this.roleService.getRoles().subscribe(data => this.roles = data);
    this.shiftService.getShiftTemplates().subscribe(data => this.shifts = data)
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

  getBranchName(id: number): string {
    return this.branches.find(branch => branch.id === id)?.name || 'N/A';
  }

  getRoleName(id: number): string {
    return this.roles.find(role => role.id === id)?.name || 'N/A';
  }
  getShiftName(id: number): string {
    return this.shifts.find(shifts => shifts.id === id)?.name || 'N/A'
  }
  openEdit(employee: any) {
    this.editEmployee.emit(employee);
  }
  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value;

    if (!searchText) {
      this.filteredEmployees = [...this.employee];
      return;
    }

    const filterKey = this.selectedFilter.value;

    this.filteredEmployees = this.employee.filter(emp => {
      // if (filterKey === 'name') {
      //   return (
      //     `${emp.firstName} ${emp.lastName}`
      //       .toLowerCase()
      //       .includes(searchText.toLowerCase())
      //   );
      // }
      // return emp[filterKey]?.toString().toLowerCase().includes(searchText.toLowerCase());
      switch (filterKey) {
        case 'name':
          return `${emp.firstName} ${emp.lastName}`
            .toLowerCase()
            .includes(searchText.toLowerCase());
        case 'department':
          return this.getDepartmentName(emp.departmentId)
            .toLowerCase()
            .includes(searchText.toLowerCase());

        case 'branch':
          return this.getBranchName(emp.branchId)
            .toLocaleLowerCase()
            .includes(searchText.toLocaleLowerCase());
        case 'shift': {
          let shiftName = ''; if (emp.shiftId) { shiftName = this.getShiftName(emp.shiftId) || ''; }
          else if (emp.latestShiftAssignment?.shift?.name) { shiftName = emp.latestShiftAssignment.shift.name; }
          else if (emp.EmployeeShiftSetting?.mode) { shiftName = emp.EmployeeShiftSetting.mode; }
          return shiftName.toLowerCase().includes(searchText.toLowerCase());
        }
        default:
          return emp[filterKey]?.toString().toLowerCase().includes(searchText.toLowerCase());
      }
    });
    console.log(this.filteredEmployees)
  }

  onFilterChange() {
    this.filteredEmployees = [...this.employee];
    this.showFilterDropdown = false;
    console.log(this.selectedFilter)
  }
  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }
  selectFilter(option: any) {
    this.selectedFilter = option;
    this.showFilterDropdown = false; // hide after selecting
    this.onFilterChange(); // trigger filter logic
  }
  isRotational(emp: any): boolean {
    return emp?.EmployeeShiftSetting?.mode === 'ROTATIONAL';
  }

  getShiftModeLabel(emp: any): string {
    const mode = emp?.EmployeeShiftSetting?.mode;
    return mode === 'ROTATIONAL' ? 'Rotational' : 'General';
  }

  getRotationalTypeLabel(emp: any): string {
    const st = emp?.latestShiftAssignment?.shift;
    if (!st) return '—';
    // Prefer template name; fallback to enum like MORNING -> Morning
    return st.name || this.toTitle(st.shiftType);
  }

  private toTitle(s?: string) {
    return s ? s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '';
  }

  getRotationalAbbrev(emp: any): string {
    // Prefer enum; fallback to name text
    const shift = emp?.latestShiftAssignment?.shift;
    if (!shift) return '—';

    const byEnum = (shift.shiftType || '').toString().toUpperCase();
    if (byEnum === 'MORNING') return 'MS';
    if (byEnum === 'EVENING') return 'ES';
    if (byEnum === 'NIGHT') return 'NS';

    const byName = (shift.name || '').toString().toUpperCase();
    if (byName.includes('MORNING')) return 'MS';
    if (byName.includes('EVENING')) return 'ES';
    if (byName.includes('NIGHT')) return 'NS';

    return '—';
  }
  getDefaultImage(gender?: string | null): string {
    const g = gender?.toUpperCase?.() || 'MALE';
    return g === 'FEMALE'
      ? '/img-women.png'
      : '/img.png';
  }
}
