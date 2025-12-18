import { Component, Output, EventEmitter } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Appraisal } from '../../../services/appraisal/appraisal';
import { Employees } from '../../../services/employees/employees';
import { Departments } from '../../../services/departments/departments';
import { Branches } from '../../../services/branches/branches';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';

interface Table {
  empName: string;
  department: string;
  appraisalCycle: string;
  selfScore: string;
  mgrScore: string;
  hrScore: string;
  finalScore: string;
  outCome: string;
  status: string;
  email: string;
  empId: string;
}

@Component({
  selector: 'app-appraisal-table',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, ReactiveFormsModule, FormsModule, TableModule, CommonModule, MultiSelectModule, SelectModule, SkeletonModule],
  templateUrl: './appraisal-table.html',
  styleUrl: './appraisal-table.css'
})
export class AppraisalTable {

  @Output() editAppraisal = new EventEmitter<any>();

  showPopup = false;
  appraisalForm!: FormGroup;
  employees: any[] = [];
  departments: any[] = [];
  branches: any[] = [];
  allEmployees: any[] = [];
  appraisals: any[] = [];
  filterOptions = [
    { label: 'Employee Code', value: 'employeeCode' },
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'departmentId' },

  ];

  selectedFilter: any = null;
  filteredEmployees: any[] = [];
  showFilterDropdown = false;
  role: string = '';
  loggedEmployeeId: number = 0;
  loading = true


  constructor(private fb: FormBuilder,
    private appraisalService: Appraisal,
    private employeeService: Employees,
    private departmentService: Departments,
    private branchService: Branches,
    private messageService: MessageService) { }

  ngOnInit() {
    this.appraisalForm = this.fb.group({
      cycle: ['', Validators.required],
      departmentId: ['', Validators.required],
      branchId: ['', Validators.required],
      employeeIds: [[], Validators.required]
    });
    document.addEventListener('click', this.closeDropdownOnClickOutside);
    this.filteredEmployees = [...this.appraisals]

    this.appraisalForm.get('departmentId')?.valueChanges.subscribe(() => this.filterEmployees());
    this.appraisalForm.get('branchId')?.valueChanges.subscribe(() => this.filterEmployees());

    this.role = localStorage.getItem('role') || '';
    this.loggedEmployeeId = Number(localStorage.getItem('empId'));

    this.loadDropdownData();
    this.getAppraisals();

  }

  closeDropdownOnClickOutside = (event: any) => {
    const dropdown = document.getElementById('filterDropdown');
    const button = document.getElementById('filterButton');

    if (!dropdown || !button) return;

    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
      this.showFilterDropdown = false;
    }
  };


  getAppraisals() {
    this.loading = true
    this.appraisalService.getAllAppraisals().subscribe({
      next: (data) => {
        if (this.role === 'HR Manager'|| this.role === 'Management') {
          this.appraisals = data;
        } else if (this.role === 'Executives' && Number(localStorage.getItem('deptId')) === 1) {
          // HR sees all OTHER departments except HR department
          this.appraisals = (data || []).filter(
            (a: any) => a.employee?.departmentId !== 1
          );
        }
        else if (this.role === 'Reporting Manager') {
          this.appraisals = (data || []).filter(
            (a: any) => a.employee?.reportingManager === this.loggedEmployeeId
          );
        }
        setTimeout(() => {
          this.filteredEmployees = [...this.appraisals];
          this.loading = false; // 👈 stop loading
        }, 800);
      },
      error: () => {
        // alert('Error loading appraisals');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error loading appraisals'
        });
        this.loading = false
      }
    });


  }

  openForm() {
    this.showPopup = true;
    this.loadEmployees();
  }
  loadEmployees() {
    this.employeeService.getActiveEmployees().subscribe(res => {
      this.allEmployees = res.map(e => ({
        label: `${e.firstName} ${e.lastName}`,
        value: e.id,
        deptId: e.departmentId,
        branchId: e.branchId
      }));
      this.employees = [...this.allEmployees];
    });
  }
  loadDropdownData() {
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
    this.branchService.getBranches().subscribe(data => this.branches = data);
  }
  onSubmit() {
    if (this.appraisalForm.valid) {
      this.appraisalService.bulkCreateAppraisals(this.appraisalForm.value).subscribe({
        next: (res: any) => {
          // alert(`${res.count} appraisal forms created`);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `${res.count} appraisal forms created`
          });
          this.showPopup = false;
        },
        error: () =>
          // alert('Error creating appraisals')
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error creating appraisals'
          })
      });
    }
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


  closePopup() {
    this.showPopup = false;
    this.appraisalForm.reset();
  }
  filterEmployees() {
    const selectedDept = this.appraisalForm.get('departmentId')?.value;
    const selectedBranch = this.appraisalForm.get('branchId')?.value;

    this.employees = this.allEmployees.filter(emp =>
      (!selectedDept || emp.deptId === selectedDept) &&
      (!selectedBranch || emp.branchId === selectedBranch)
    );

    this.filteredEmployees = [...this.appraisals]
  }
  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();


    if (!searchText) {
      this.filteredEmployees = [...this.appraisals];
      return;
    }

    const filterKey = this.selectedFilter?.value || 'name';

    this.filteredEmployees = this.appraisals.filter((emp: any) => {
      const e = emp.employee;
      if (!e) return false;

      if (filterKey === 'name') {
        return `${e.firstName} ${e.lastName}`
          .toLowerCase()
          .includes(searchText);
      }

      if (filterKey === 'employeeCode') {
        return e.employeeCode?.toLowerCase().includes(searchText);
      }

      if (filterKey === 'departmentId') {
        const deptName = this.getDepartmentName(e.departmentId)?.toLowerCase() || '';
        return deptName.includes(searchText);
      }


      return e[filterKey]?.toString().toLowerCase().includes(searchText);
    });
  }


  onFilterChange() {
    this.filteredEmployees = [...this.appraisals];
    this.showFilterDropdown = false;
    console.log(this.selectedFilter)
  }
  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }
  selectFilter(option: any) {
    this.selectedFilter = option;
    this.showFilterDropdown = false; // hide after selecting
    const searchBox = document.getElementById('searchBox') as HTMLInputElement;
    if (searchBox) searchBox.value = '';
    this.onFilterChange(); // trigger filter logic
  }

  onEditClick(appraisal: any) {
    const departmentName = this.getDepartmentName(appraisal.employee.departmentId);

    // Merge employee properties and appraisal properties into one flat object
    const mergedAppraisal = {
      ...appraisal,
      employeeId: appraisal.employee.id,
      employeeCode: appraisal.employee.employeeCode,
      fullName: `${appraisal.employee.firstName} ${appraisal.employee.lastName}`,
      designation: appraisal.employee.designation.name,
      departmentName: departmentName,
      dateOfJoining: appraisal.employee.dateOfJoining,
      email: appraisal.employee.email
    };

    delete mergedAppraisal.employee; // Remove nested employee object

    this.editAppraisal.emit(mergedAppraisal);
  }

}
