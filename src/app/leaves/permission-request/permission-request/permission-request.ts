import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { Permission } from '../../../services/permission/permission';
import { TooltipModule } from 'primeng/tooltip';
import { Departments } from '../../../services/departments/departments';
import { PermissionPopup } from '../../permission-popup/permission-popup';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';

interface requestTable {
  empName: string;
  department: string;
  jobTitle: string;
  premDate: string;
  reson: string;
  noOfHours: string;
  email: string;
  empId: string;
  [key: string]: any
}

@Component({
  selector: 'app-permission-request',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule, TooltipModule, PermissionPopup, SkeletonModule],
  templateUrl: './permission-request.html',
  styleUrl: './permission-request.css'
})
export class PermissionRequest {

  constructor(private permissionService: Permission, private departmentService: Departments, private messageService: MessageService) { }

  filterReuqusetData: any[] = [];
  selectedFilter: any = null;
  filterDropdown: boolean = false;
  declineDialogVisible: boolean = false;
  declineReason: string = '';
  currentDeclineId: number | null = null;
  departments: any[] = [];
  showPopup: boolean = false;
  selectedPermission: any = null;
  viewMode: boolean = false;
  currentDeclineRole: 'MANAGER' | 'HR' | null = null;
  loading = true


  filterOption = [
    { label: 'Employee ID', value: 'empId' },
    { label: 'Name', value: 'empName' },
    { label: 'Departmnent', value: 'deptName' },
    // { label: 'JobTitle', value: 'jobTitle' },
  ]

  requestData: requestTable[] = [];
  columnCount: number = 10;
  isHR: boolean = false;
  role: string = '';
  loggedEmployeeId: number = 0;


  ngOnInit() {
    this.loadPermissionRequests();
    this.role = localStorage.getItem('role') || '';
    this.loggedEmployeeId = Number(localStorage.getItem('empId')) || 0
    this.isHR = this.isHRRole(this.role);
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
    setTimeout(()=>{
      this.loading = false
    }, 2000)
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!searchText) {
      this.filterReuqusetData = [...this.requestData]
      return
    }

    const filterKey = this.selectedFilter?.value;

    this.filterReuqusetData = this.requestData.filter((request: requestTable) => {
      return request[filterKey]?.toString().toLowerCase().includes(searchText)
    })

    // console.log('Data', this.filterReuqusetData)

  }
  getStatusLabel(req: any): string {
    if (req.hodDecision === 'REJECTED') {
      return 'Manager Rejected';
    }
    if (req.hodDecision === 'APPROVED' && req.hrDecision === 'PENDING') {
      return 'Manager Approved (Waiting HR)';
    }
    if (req.hrDecision === 'APPROVED') {
      return 'HR Approved';
    }
    if (req.hrDecision === 'REJECTED') {
      return 'HR Rejected';
    }
    return 'Pending';
  }


  onFilterChange() {
    this.filterReuqusetData = [...this.requestData]
  }

  toggleDropdown() {
    this.filterDropdown = !this.filterDropdown
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    this.filterDropdown = false;
    this.onFilterChange()
  }
  loadPermissionRequests() {
    this.permissionService.getPermissions().subscribe({
      next: (data) => {
        const pending = data.map(req => {
          const deptId = req.employee?.departmentId;
          const dept = this.departments.find(d => d.id === deptId);

          return {
            id: req.id,
            empId: req.employee.employeeCode,
            empName: `${req.employee.firstName} ${req.employee.lastName}`,
            department: req.employee.departmentId || '',
            deptName: dept ? dept.name : '',
            jobTitle: req.employee.designation,
            premDate: new Date(req.day).toLocaleDateString(),
            reson: req.reason,
            noOfHours: this.calculateHours(req.startTime, req.endTime),
            email: req.employee.email,
            status: req.status,
            permissionType: req.permissionType,
            timing: req.timing,
            day: req.day,
            startTime: req.startTime,
            endTime: req.endTime,
            reportingManagerId: req.employee.reportingManager ?? null,
            hodDecision: req.hodDecision,
            hrDecision: req.hrDecision,
          }
        });
        this.requestData = this.isHR
          ? pending
          : pending.filter(r => r.reportingManagerId === this.loggedEmployeeId);
        this.filterReuqusetData = [...this.requestData];
        console.log(pending, this.requestData)
      },
      error: (err) => console.error('Error fetching permission requests:', err)
    });
  }

  calculateHours(start: string | null, end: string | null): string {
    if (!start || !end) return 'N/A';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60); // in minutes
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  }

  private normalizeRole(role: string): 'MANAGER' | 'HR' | null {
    const norm = role.trim().toUpperCase();

    if (norm === 'REPORTING_MANAGER' || norm === 'MANAGER') {
      return 'MANAGER';
    }

    if (norm === 'HR' || norm === 'HR MANAGER') {
      return 'HR';
    }

    return null;
  }


  approveRequest(id: number, role: 'MANAGER' | 'HR') {
    const normalized = this.normalizeRole(this.role);
    if (!normalized) return;
    const userId = Number(localStorage.getItem('userId')) || 1;
    this.permissionService.updatePermissionStatus(id, 'APPROVED', userId, normalized).subscribe({
      next: () => this.loadPermissionRequests(),
      error: (err) => console.error('Error approving request:', err)
    });
  }

  openDeclineDialog(id: number, role: 'MANAGER' | 'HR') {
    const normalized = this.normalizeRole(this.role);
    if (!normalized) return;
    this.currentDeclineId = id;
    this.currentDeclineRole = normalized;   // NEW
    this.declineDialogVisible = true;
  }

  confirmDecline() {
    if (!this.declineReason.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please enter a reason for declining'
      });
      return;
    }

    const userId = Number(localStorage.getItem('userId')) || 1;
    this.permissionService.updatePermissionStatus(
      this.currentDeclineId!,
      'REJECTED',
      userId,
      this.currentDeclineRole!,   // pass stored role
      this.declineReason
    ).subscribe({
      next: () => {
        this.declineDialogVisible = false;
        this.declineReason = '';
        this.currentDeclineId = null;
        this.currentDeclineRole = null;
        this.loadPermissionRequests();
      },
      error: (err) => console.error('Error declining request:', err)
    });
  }


  // Close popup
  closeDeclineDialog() {
    this.declineDialogVisible = false;
    this.declineReason = '';
    this.currentDeclineId = null;
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

  openDetailsPopup(request: any) {
    // Pass mapped data to popup
    this.selectedPermission = request;
    this.viewMode = true; // make popup readonly
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
    this.selectedPermission = null;
    this.viewMode = false;
  }
  private isHRRole(role: string): boolean {
    const norm = role.trim().toUpperCase();
    return norm === 'HR' || norm === 'HR MANAGER';
  }

}
