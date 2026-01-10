import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { Departments } from '../../services/departments/departments';
import { Entitles } from '../../services/entitles/entitles';
import { EmployeeDetails } from "../employee-details/employee-details";
import { SkeletonModule } from 'primeng/skeleton';
import { FormGroup, FormArray, Validators, FormBuilder } from '@angular/forms';
import { Leaves } from '../../services/leaves/leaves';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AbstractControl } from '@angular/forms';
import { Permission } from '../../services/permission/permission';



interface balancesTable {
  empName: string;
  number: number;
  department: number;
  jobTitle: string;
  shiftType: string;
  totalLeave: string;
  totlePerm: string;
  email: string;
  empId: string;
  [key: string]: any
}

@Component({
  selector: 'app-balances-accruals',
  imports: [InputIconModule, IconFieldModule, InputTextModule,
    FloatLabelModule, FormsModule, TableModule, CommonModule,
    EmployeeDetails, SkeletonModule, DialogModule, ButtonModule, ReactiveFormsModule],
  templateUrl: './balances-accruals.html',
  styleUrl: './balances-accruals.css'
})
export class BalancesAccruals {

  constructor(private entitleService: Entitles,
    private departmentService: Departments,
    private leaveService: Leaves,
    private permissionService: Permission,
    private fb: FormBuilder) { }

  get leaves(): FormArray {
    return this.balanceForm.get('leaves') as FormArray;
  }

  get permissions(): FormArray {
    return this.balanceForm.get('permissions') as FormArray;
  }


  filterBalancesData: any[] = [];
  balancesData: any[] = [];
  selectedFilter: any = null;
  filterDropdown: boolean = false;
  selectedEmployee: any = null;
  requests: any = null;
  departments: any[] = [];
  filterOption = [
    { label: 'Employee ID', value: 'employeeCode' },
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'department' },
    { label: 'JobTitle', value: 'designation' },
    { label: 'ShiftType', value: 'shiftType' }
  ]
  loading = true

  showBalanceDialog = false;
  selectedYear = new Date().getFullYear();
  balanceForm!: FormGroup;
  showDetailsDialog = false;
  isLoading = false;









  ngOnInit() {
    this.entitleService.getEmployeeUsageSummary().subscribe((data) => {
      this.balancesData = data;
      this.filterBalancesData = [...this.balancesData];
    });
    document.addEventListener('click', this.closeDropdownOnClickOutside);
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
    setTimeout(() => {
      this.loading = false
    }, 3000)
    this.balanceForm = this.fb.group({
      year: [this.selectedYear, Validators.required],
      leaves: this.fb.array([]),
      permissions: this.fb.array([])
    });

  }

  closeDropdownOnClickOutside = (event: any) => {
    const dropdown = document.getElementById('filterDropdown');
    const button = document.getElementById('filterButton');

    if (!dropdown || !button) return;

    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
      this.filterDropdown = false;
    }
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!searchText) {
      this.filterBalancesData = [...this.balancesData]
      return
    }

    const filterKey = this.selectedFilter?.value;

    this.filterBalancesData = this.balancesData.filter((balance: balancesTable) => {
      if (filterKey === 'department') {
        const deptName = this.getDepartmentName(balance.department)?.toLowerCase()
        return deptName.includes(searchText)
      }

      return balance[filterKey]?.toString().toLowerCase().includes(searchText)
    })


    console.log(this.balancesData)
  }


  onFilterChange() {
    this.filterBalancesData = [...this.balancesData]
  }

  toggleDropdown() {
    this.filterDropdown = !this.filterDropdown
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    this.filterDropdown = false;
    const searchBox = document.getElementById('searchBox') as HTMLInputElement;
    if (searchBox) searchBox.value = '';
    this.onFilterChange()
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
  showEmployeeDetails(employee: any) {
    this.selectedEmployee = employee;
    this.showDetailsDialog = true
  }

  handleClose() {
    this.selectedEmployee = null;   // hide child
    this.showDetailsDialog = false;
  }


  closeDetails(): void {
    this.selectedEmployee = null;
    this.showDetailsDialog = false;
    this.requests = null;
  }
  loadBalances(employeeId: number, year: number) {
    // reset form
    this.balanceForm.setControl('leaves', this.fb.array([]));
    this.balanceForm.setControl('permissions', this.fb.array([]));
    this.balanceForm.patchValue({ year });

    // 🔹 LEAVES
    this.leaveService.getLeaveBalance(employeeId, year)
      .subscribe((leaves: any[]) => {
        leaves.forEach(l => {
          const row = this.createLeaveRow(l);
          this.leaves.push(row);
          console.log(row)
          // ✅ calculate remaining immediately
          this.calculateRemaining(row);
        });
      });

    // 🔹 PERMISSIONS (using SAME API as requested)
    this.permissionService.getPermissionBalance(employeeId, year)
      .subscribe((permissions: any[]) => {
        permissions.forEach(p => {
          const row = this.createPermissionRow(p);
          this.permissions.push(row);

          // ✅ calculate remaining immediately
          this.calculateRemaining(row);
        });
      });
  }

  createLeaveRow(l: any) {
    return this.fb.group({
      leaveTypeId: [l.leaveTypeId],
      type: [l.leaveType],
      totalAllowed: [l.totalAllowed, Validators.required],
      used: [l.used, Validators.required], // ✅ editable
      remaining: [{ value: l.totalAllowed - l.used, disabled: true }]
    });
  }

  createPermissionRow(p: any) {
    return this.fb.group({
      permissionType: [p.permissionType],
      type: [p.permissionType],
      totalAllowed: [p.totalAllowed, Validators.required],
      used: [p.used, Validators.required], // ✅ editable
      remaining: [{ value: p.totalAllowed - p.used, disabled: true }]
    });
  }



  createBalanceRow(b: any) {
    return this.fb.group({
      id: [b.id],
      type: [b.leaveType?.name || b.permissionType],
      totalAllowed: [b.totalAllowed, Validators.required],
      used: [b.used],
      remaining: [{ value: b.totalAllowed - b.used, disabled: true }]
    });
  }


  openBalanceDialog(employee: any) {
    this.selectedEmployee = employee;
    this.showBalanceDialog = true;
    this.loadBalances(employee.id, this.selectedYear);
  }
  saveBalances() {
    if (this.balanceForm.invalid) return;

    const v = this.balanceForm.value;

    this.isLoading = true

    const payload = {
      employeeId: this.selectedEmployee.id,
      year: v.year,

      leaves: v.leaves.map((l: any) => ({
        leaveTypeId: l.leaveTypeId,
        totalAllowed: l.totalAllowed,
        used: l.used
      })),

      permissions: v.permissions.map((p: any) => ({
        permissionType: p.permissionType,
        totalAllowed: p.totalAllowed,
        used: p.used
      }))
    };

    this.leaveService.createLeaveAllocation(payload).subscribe(() => {
      this.showBalanceDialog = false;
      this.isLoading = false
    });
  }

  calculateRemaining(row: AbstractControl) {
    const total = Number(row.get('totalAllowed')?.value) || 0;
    const used = Number(row.get('used')?.value) || 0;

    if (used > total) {
      row.get('used')?.setErrors({ exceedsTotal: true });
      return;
    }

    row.get('remaining')?.setValue(total - used, { emitEvent: false });
  }

}

