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

@Component({
  selector: 'app-employee-list',
  imports: [TableModule, CommonModule, FormsModule],
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
  shifts: any[]=[];
  filterOptions = [
    { label: 'Employee Code', value: 'employeeCode' },
    { label: 'Name', value: 'name' },
    { label: 'Branch', value: 'branchId' },
    { label: 'Department', value: 'departmentId' },
    { label: 'Status', value: 'employmentStatus' },
    { label: 'Employment Type', value: 'employmentType' },
    { label: 'Shift', value: 'shiftId' }
  ];
  
  selectedFilter: any = null;
  filteredEmployees: any[] = [];
  showFilterDropdown = false;
  



  ngOnInit() {
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => {
        console.log('Employees fetched successfully:', response);
        this.employee = response;
        this.filteredEmployees = [...this.employee];
      },
      error: (err) => {
        console.error('Error fetching employees:', err);
      }
    });
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
    this.branchService.getBranches().subscribe(data => this.branches = data);
    this.roleService.getRoles().subscribe(data => this.roles = data);
    this.shiftService.getShiftTemplates().subscribe(data => this.shifts = data);
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
      if (filterKey === 'name') {
        return (
          `${emp.firstName} ${emp.lastName}`
            .toLowerCase()
            .includes(searchText.toLowerCase())
        );
      }
      return emp[filterKey]?.toString().toLowerCase().includes(searchText.toLowerCase());
    });
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
    if (byEnum === 'NIGHT')   return 'NS';
  
    const byName = (shift.name || '').toString().toUpperCase();
    if (byName.includes('MORNING')) return 'MS';
    if (byName.includes('EVENING')) return 'ES';
    if (byName.includes('NIGHT'))   return 'NS';
  
    return '—';
  }
}
