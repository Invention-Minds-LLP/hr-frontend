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
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule, TooltipModule, PermissionPopup],
  templateUrl: './permission-request.html',
  styleUrl: './permission-request.css'
})
export class PermissionRequest {

  constructor(private permissionService: Permission, private departmentService: Departments) { }

  filterReuqusetData: any[] = [];
  selectedFilter: any = null;
  filterDropdown: boolean = false;
  declineDialogVisible: boolean = false;
  declineReason: string = '';
  currentDeclineId: number | null = null;
  departments:any[]=[];
  showPopup: boolean = false;
  selectedPermission: any = null;
  viewMode: boolean = false;


  filterOption = [
    { label: 'Employee ID', value: 'empId' },
    { label: 'Name', value: 'name' },
    { label: 'Departmnent', value: 'department' },
    { label: 'JobTitle', value: 'jobtitle' },
  ]

  requestData: requestTable[] = []


  ngOnInit() {
    this.loadPermissionRequests();
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!searchText) {
      this.filterReuqusetData = [...this.requestData]
      return
    }

    const filterKey = this.selectedFilter?.value as keyof requestTable;

    this.filterReuqusetData = this.requestData.filter((request: requestTable) => {
      if (filterKey === 'name') {
        return request.empName?.toLocaleLowerCase().includes(searchText)
      }

      return request[filterKey]?.toString().toLowerCase().includes(searchText)
    })

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
        this.requestData = data.map(req => ({
          id: req.id,
          empId: req.employee.employeeCode,
          empName: `${req.employee.firstName} ${req.employee.lastName}`,
          department: req.employee.departmentId || '',
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
        }));
        this.filterReuqusetData = [...this.requestData];
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

  approveRequest(id: number) {
    const userId = Number(localStorage.getItem('userId')) || 1;
    this.permissionService.updatePermissionStatus(id, 'APPROVED', userId).subscribe({
      next: () => this.loadPermissionRequests(),
      error: (err) => console.error('Error approving request:', err)
    });
  }

  // Open the popup
  openDeclineDialog(id: number) {
    this.currentDeclineId = id;
    this.declineDialogVisible = true;
  }

  // Confirm decline action
  confirmDecline() {
    if (!this.declineReason.trim()) {
      alert('Please enter a reason for declining');
      return;
    }

    const userId = Number(localStorage.getItem('userId')) || 1;

    this.permissionService.updatePermissionStatus(
      this.currentDeclineId!,
      'REJECTED',
      userId,
      this.declineReason
    ).subscribe({
      next: () => {
        this.declineDialogVisible = false;
        this.declineReason = '';
        this.currentDeclineId = null;
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

}
