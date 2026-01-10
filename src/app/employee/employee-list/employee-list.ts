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
import * as XLSX from 'xlsx';
import { AttendanceCalendars } from '../../attendance/attendance-calendars/attendance-calendars';
import { debounceTime, Subject } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';



@Component({
  selector: 'app-employee-list',
  imports: [TableModule, CommonModule, FormsModule, RouterModule, RouterLink, ButtonModule,
    SkeletonModule, AttendanceCalendars, DialogModule, SelectModule, DatePickerModule],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css'
})
export class EmployeeList {
  @Output() editEmployee = new EventEmitter<any>();

  constructor(private employeeService: Employees, private departmentService: Departments, private branchService: Branches, private roleService: Roles, private shiftService: Shifts) { }

  // Logged-in user details
  loginDeptId = Number(localStorage.getItem('deptId'));
  loginEmpId = Number(localStorage.getItem('empId'));
  loginRole = (localStorage.getItem('role') || '').toUpperCase();
  


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
    { label: 'Employee Type', value: 'employeeType' },
    { label: 'Shift', value: 'shift' }
  ];

  selectedFilter: any = null;
  filteredEmployees: any[] = [];
  showFilterDropdown = false;

  loading = true
  showCalendar = false;
  selectedEmployee: any = null;
  searchSubject = new Subject<string>();

  loadingRows: { [key: number]: boolean } = {}; // key = employee.id





  ngOnInit() {
    // this.employeeService.getEmployees().subscribe({
    //   next: (response: any) => {
    //     console.log('Employees fetched successfully:', response);
    //     this.employee = response;
    //     this.filteredEmployees = [...this.employee];
    //     console.log(this.employee)
    //     this.loading = false
    //   },
    //   error: (err) => {
    //     console.error('Error fetching employees:', err);
    //     this.loading = false
    //   }
    // });
    this.loadEmployees()
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
    this.branchService.getBranches().subscribe(data => this.branches = data);
    this.roleService.getRoles().subscribe(data => this.roles = data);
    this.shiftService.getShiftTemplates().subscribe(data => this.shifts = data)
    document.addEventListener('click', this.handleOutsideClick);
    this.searchSubject
      .pipe(debounceTime(300))
      .subscribe(text => {
        this.searchText = text;
        this.page = 1;
        this.loadEmployees();
      });

    this.shiftService.getShiftTemplates().subscribe(res => {
      this.shiftOptions = res.map((s: any) => ({
        ...s,
        label: `${s.name} (${this.formatTime(s.startTime)} - ${this.formatTime(s.endTime)})`
      }));
    });

    this.shiftService.getRotationPatterns()
      .subscribe(res => this.rotationPatterns = res);

  }
  page = 1;
  totalRecords = 0;
  searchText: string = '';
  pageSize = 10;  // default user-selected size
  pageSizeOptions = [10, 20, 50];


  loadEmployees() {
    this.loading = true;

    this.employeeService
      .getEmployees(this.page, this.pageSize, this.searchText, this.selectedFilter?.value)
      .subscribe({
        next: (res: any) => {
          this.filteredEmployees = res.data;
          this.totalRecords = res.total;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private formatTime(date: string | Date) {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }


  onPageChange(event: any) {

    // When event.page is undefined (first load), compute manually
    const currentPage = event.page !== undefined
      ? event.page + 1
      : event.first / event.rows + 1;

    this.page = currentPage;
    this.pageSize = event.rows;

    console.log("Page changed to:", this.page, "with size:", this.pageSize);

    this.loadEmployees();
  }





  handleOutsideClick = (event: any) => {
    const dropdown = document.getElementById('filterDropdown');
    const button = document.getElementById('filterButton');

    if (dropdown && !dropdown.contains(event.target) &&
      button && !button.contains(event.target)) {
      this.showFilterDropdown = false;
    }
  };


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
    this.loadingRows[employee.id] = true;
    this.employeeService.getEmployeeById(employee.id).subscribe({
      next: (data: any) => {
        this.editEmployee.emit(data);
        this.loadingRows[employee.id] = false;
      },
      error: (err) => {
        console.error('Error fetching employee details:', err);
        this.loadingRows[employee.id] = false;
      }
    });
  }

  // Disable edit if same deptId and roleId as logged-in userF
  isEditDisabled(emp: any): boolean {

  // Nobody can edit himself (including HR Manager)
  if (this.loginEmpId === Number(emp.id)) {
    return true;
  }

  // HR Manager can edit other HR employees
  if (this.loginRole === 'HR MANAGER') {
    return false;
  }

  // Others cannot edit same department
  if (this.loginDeptId === Number(emp.departmentId)) {
    return true;
  }

  // ✅ All other cases allowed
  return false;
}



  // onSearch(event: Event) {
  //   if (!this.selectedFilter) return;

  //   const input = event.target as HTMLInputElement;
  //   const searchText = input.value.toLowerCase();

  //   if (!searchText) {
  //     this.filteredEmployees = [...this.employee];
  //     return;
  //   }

  //   const filterKey = this.selectedFilter.value;

  //   this.filteredEmployees = this.employee.filter(emp => {
  //     switch (filterKey) {
  //       case 'name':
  //         return (`${emp.firstName} ${emp.lastName}`.toLowerCase())
  //           .includes(searchText);

  //       case 'department':
  //         return this.getDepartmentName(emp.departmentId)
  //           .toLowerCase()
  //           .includes(searchText);

  //       case 'branch':
  //         return this.getBranchName(emp.branchId)
  //           .toLowerCase()
  //           .includes(searchText);

  //       case 'shift': {
  //         let shiftName = '';
  //         if (emp.shiftId) shiftName = this.getShiftName(emp.shiftId);
  //         else if (emp.latestShiftAssignment?.shift?.name) shiftName = emp.latestShiftAssignment.shift.name;
  //         return shiftName.toLowerCase().includes(searchText);
  //       }

  //       default:
  //         return emp[filterKey]?.toString().toLowerCase().includes(searchText);
  //     }
  //   });
  // }
  // onSearch(event: Event) {
  //   const input = event.target as HTMLInputElement;
  //   this.searchText = input.value;

  //   this.page = 1; // reset to first page
  //   this.loadEmployees(); // call server
  // }
  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
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
    console.log('Selected filter:', this.selectedFilter);

    // 👇 Clear input after selecting new filter
    const searchBox = document.getElementById('searchBox') as HTMLInputElement;
    if (searchBox) searchBox.value = '';

    this.filteredEmployees = [...this.employee];
    this.showFilterDropdown = false;
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

  formatDateOnly(date: any): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return isNaN(d.getTime()) ? 'N/A' : d.toISOString().split('T')[0];
  }


  convertBool(value: any): string {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return value; // return original if not boolean
  }

  flatten(obj: any, parent = '', res: any = {}) {
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const propName = parent ? `${parent}.${key}` : key;

      // ❌ skip nested objects we don't need
      if (['department', 'branch', 'role', 'address'].includes(key)) continue;
      if (key === 'latestShiftAssignment' || key === 'EmployeeShiftSetting') continue;

      const value = obj[key];

      if (typeof value === 'object' && value !== null) {
        this.flatten(value, propName, res);
      } else {
        res[propName] = value;
      }
    }
    return res;
  }


  getReportingManagerName(id: number): string {
    if (!id) return 'N/A';
    const mgr = this.employee?.find(e => e.id === Number(id));
    return mgr ? `${mgr.firstName} ${mgr.lastName}` : 'N/A';
  }




  getShiftReadableName(emp: any): string {
    if (emp.shiftId) return this.getShiftName(emp.shiftId);

    if (emp.latestShiftAssignment?.shift?.name)
      return emp.latestShiftAssignment.shift.name;

    return 'N/A';
  }



  downloadEmployeeData(): void {
    const sourceData =
      this.filteredEmployees && this.filteredEmployees.length > 0
        ? this.filteredEmployees
        : this.employee;

    if (!sourceData || sourceData.length === 0) return;

    const finalRows = sourceData.map((emp: any) => {
      let flat = this.flatten(emp);

      // ⭐ Department / Branch / Role Names
      flat['Department'] = this.getDepartmentName(emp.departmentId);
      flat['Branch'] = this.getBranchName(emp.branchId);
      flat['Role'] = this.getRoleName(emp.roleId);

      // ⭐ Reporting Manager Name
      flat['Reporting Manager'] = this.getReportingManagerName(emp.reportingManagerId);

      // ⭐ Shift Fields
      flat['Shift Name'] = this.getShiftReadableName(emp);
      flat['Shift Type'] = emp.latestShiftAssignment?.shift?.shiftType || 'N/A';
      flat['Shift Mode'] = emp.EmployeeShiftSetting?.mode || 'General';
      flat['Shift Start Date'] = emp.EmployeeShiftSetting?.startDate || 'N/A';
      flat['Shift End Date'] = emp.EmployeeShiftSetting?.endDate || 'N/A';

      // ⭐ Employee Name
      flat['Employee Name'] = `${emp.firstName} ${emp.lastName}`;

      // ⭐ Date of Birth
      flat['Date of Birth'] = this.formatDateOnly(emp.dateOfBirth);

      // ⭐ Employee Created Date (ROOT createdAt only)
      flat['Employee Created Date'] = this.formatDateOnly(emp.createdAt);

      // ⭐ Convert Boolean → Yes/No
      Object.keys(flat).forEach(key => {
        flat[key] = this.convertBool(flat[key]);
      });

      // ❌ Remove unwanted fields NOW (AFTER using them)
      const removePrefixes = [
        'shifts',
        'latestShiftAssignment',
        'EmployeeShiftSetting',
        'shiftId'
      ];

      Object.keys(flat).forEach(key => {

        // remove nested shift fields
        if (removePrefixes.some(prefix => key.startsWith(prefix))) delete flat[key];

        // remove raw ids EXCEPT departmentId/branchId/roleId (already mapped)
        if (key.toLowerCase().endsWith('id')) delete flat[key];

        // remove images
        if (key.includes('photo') || key.includes('image')) delete flat[key];

        // remove dateOfJoining
        if (key.includes('dateOfJoining')) delete flat[key];

        // keep only Employee Created Date
        if (key.toLowerCase().includes('createdat') && key !== 'Employee Created Date') {
          delete flat[key];
        }
      });

      return flat;
    });

    const worksheet = XLSX.utils.json_to_sheet(finalRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, 'Employee_Full_Data.xlsx');
  }
  openAttendanceCalendar(emp: any) {
    this.selectedEmployee = emp;
    this.showCalendar = true;
  }

  assignmentEditVisible = false;
  modeEditVisible = false;



  selectedShiftId!: number;
  selectedFixedShiftId!: number;
  selectedMode!: 'FIXED' | 'ROTATIONAL';
  selectedPatternId!: number;
  rotationStartDate!: Date;

  shiftModes = [
    { label: 'Fixed', value: 'FIXED' },
    { label: 'Rotational', value: 'ROTATIONAL' }
  ];

  shiftOptions: any[] = [];
  rotationPatterns: any[] = [];

  openAssignmentEdit(emp: any) {
    this.selectedEmployee = emp;
    this.selectedShiftId = emp.shiftId || emp.latestShiftAssignment?.shiftId;
    this.assignmentEditVisible = true;
  }

  openModeEdit(emp: any) {
    this.selectedEmployee = emp;

    const setting = emp.EmployeeShiftSetting;

    this.selectedMode = setting?.mode || 'FIXED';
    this.selectedFixedShiftId = setting?.fixedShiftId;
    this.selectedPatternId = setting?.rotationPatternId;
    this.rotationStartDate = setting?.startDate
      ? new Date(setting.startDate)
      : new Date();

    this.modeEditVisible = true;
  }
  updateShift() {
    this.shiftService
      .updateEmployeeShift(this.selectedEmployee.id, this.selectedShiftId)
      .subscribe(() => {
        this.assignmentEditVisible = false;
        this.loadEmployees();
      });
  }

  saveShiftMode() {
    const employeeId = this.selectedEmployee.id;

    if (this.selectedMode === 'FIXED') {
      this.shiftService.assignFixedShift({
        employeeId,
        shiftId: this.selectedFixedShiftId
      }).subscribe(() => this.afterSave());
    }

    if (this.selectedMode === 'ROTATIONAL') {
      this.shiftService.assignRotational({
        employeeId,
        patternId: this.selectedPatternId,
        startDate: this.rotationStartDate.toISOString().slice(0, 10)
      }).subscribe(() => this.afterSave());
    }
  }

  afterSave() {
    this.modeEditVisible = false;
    this.loadEmployees();
  }

}
