import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { DatePicker } from 'primeng/datepicker';
import { formatDate } from '@angular/common';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';
import { TooltipModule } from 'primeng/tooltip';
import { Leaves } from '../../../services/leaves/leaves';
import { Departments } from '../../../services/departments/departments';
import { LeavePopup } from '../../leave-popup/leave-popup';
import { SkeletonModule } from 'primeng/skeleton';

export type BucketKey = 'today' | 'thisWeek' | 'nextMonth';


@Component({
  selector: 'app-leave-request',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule, TooltipModule, LeavePopup, SkeletonModule],
  templateUrl: './leave-request.html',
  styleUrl: './leave-request.css'
})

export class LeaveRequest {
  filteredLeaveData: any[] = [];
  selectedFilter: any = null;
  showFilterDropdown: boolean = false;
  departments: any[] = [];
  filterOptions = [
    { label: 'Employee ID', value: 'empId' },
    { label: 'Name', value: 'empName' },
    { label: 'Department', value: 'deptName' },
    { label: 'Leave Type', value: 'leaveType' },
  ];
  private isHRRole(role: string): boolean {
    const norm = role.trim().toUpperCase();
    return norm === 'HR' || norm === 'HR MANAGER';
  }


  leaveData: any[] = [];
  currentUserId = 1; // Example, replace with actual logged-in user ID
  declineDialogVisible: boolean = false;  // Controls the dialog visibility
  declineReason: string = '';             // Stores the decline reason input
  currentDeclineId: number | null = null; // Stores the leave ID being declined
  showLeaveDetailsPopup: boolean = false;
  selectedLeaveForView: any = null;
  dashboard?: any;
  buckets: { today: any[]; thisWeek: any[]; nextMonth: any[] } = {
    today: [], thisWeek: [], nextMonth: []
  };

  loading = true;


  expanded: Record<BucketKey, boolean> = {
    today: false,
    thisWeek: false,
    nextMonth: false,
  };

  columnCount: number = 10;
  isHR: boolean = false;
  role: string = '';
  loggedEmployeeId: number = 0;
  currentDeclineRole: 'REPORTING_MANAGER' | 'HR_MANAGER' | 'MANAGEMENT' | null = null;
  loggedRoleId: number = 0;
  loggedEmpId: number = 0;
  isHRManager: boolean = false;
  isNormalEmployee: boolean = false;
  isReportingManager: boolean = false;
  isManagement: boolean = false;








  constructor(private leaveService: Leaves, private departmentService: Departments) { }


  ngOnInit() {
    this.leaveData = [...this.leaveData];
    this.filteredLeaveData = [...this.leaveData];
    this.loadLeaves();
    this.role = localStorage.getItem('role') || '';
    console.log(this.role)
    this.loggedEmployeeId = Number(localStorage.getItem('empId')) || 0
    this.loggedRoleId = Number(localStorage.getItem('roleId'));
    console.log(this.loggedRoleId)
    this.loggedEmpId = Number(localStorage.getItem('empId'));
    this.isHRManager = this.loggedRoleId === 1;
    this.isNormalEmployee = this.loggedRoleId === 2;
    this.isReportingManager = this.loggedRoleId === 3;
    this.isManagement = this.loggedRoleId === 4;


    this.isHR = this.isHRRole(this.role);
    this.buildDisabledDates();

    this.departmentService.getDepartments().subscribe(data => this.departments = data);
    this.loading = true;
    setTimeout(() => {
      this.loadLeaves();
      this.loading = false;
    }, 2000);
    document.addEventListener('click', this.closeDropdownOnClickOutside);
  }

  closeDropdownOnClickOutside = (event: any) => {
    const dropdown = document.getElementById('filterDropdown');
    const button = document.getElementById('filterButton');

    if (!dropdown || !button) return;

    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
      this.showFilterDropdown = false;
    }
  };

  loadLeaves() {
    this.leaveService.getLeaves().subscribe({
      next: (data) => {
        this.leaveData = data.map((leave: any, index: number) => {
          const deptId = leave.employee?.departmentId
          const dept = this.departments.find((d: any) => d.id === deptId);

          return {
            no: index + 1,
            id: leave.id,
            empId: leave.employee?.employeeCode,
            empName: `${leave.employee?.firstName} ${leave.employee?.lastName}`,
            email: leave.employee?.email || '',
            department: leave.employee?.departmentId || '',
            deptName: dept ? dept.name : '',
            jobTitle: leave.employee?.designation || '',
            leaveType: leave.leaveType?.name,
            reson: leave.reason,
            startDate: leave.startDate,
            endDate: leave.endDate,
            status: leave.status,
            empID: leave.employee.id,
            declineReason: leave.declineReason,
            reportingManagerId: leave.employee?.reportingManager ?? null,
            leaveDate: `${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}`,
            hodDecision: leave.hodDecision,
            hrDecision: leave.hrDecision,
            roleId: leave.employee?.roleId,
          }
        });
        // Only pending rows are actionable in this screen
        const pending = this.leaveData.filter(r => (r.status || '').toUpperCase() === 'PENDING');

        // HR/HR Manager see all; reporting managers see only their team
        this.leaveData = this.isHR
          ? pending
          : pending.filter(r => r.reportingManagerId === this.loggedEmployeeId);
        this.filteredLeaveData = [...this.leaveData];
      },
      error: (err) => {
        console.error('Error fetching leaves:', err);
      }
    });
  }



  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!searchText) {
      this.filteredLeaveData = [...this.leaveData];
      return;
    }

    const filterKey = this.selectedFilter?.value;

    this.filteredLeaveData = this.leaveData.filter((leave: any) => {
      return leave[filterKey]?.toString().toLowerCase().includes(searchText);
    });
    console.log('Filtered Data:', this.filteredLeaveData);
  }


  onFilterChange() {
    this.filteredLeaveData = [...this.leaveData];
  }

  toggleFilterDropdown(): void {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  selectFilter(option: any) {
    this.selectedFilter = option;

    // Clear the search input
    const searchBox = document.getElementById('searchBox') as HTMLInputElement;
    if (searchBox) searchBox.value = '';

    // Reset table
    this.filteredLeaveData = [...this.leaveData];

    // Close dropdown
    this.showFilterDropdown = false;
  }



  availableDates: Date[] = [
    new Date('2025-07-09'),
    new Date('2025-07-10'),
    new Date('2025-07-11'),
    new Date('2025-07-12'),
    new Date('2025-07-13')
  ];

  selectedDate: Date[] = [...this.availableDates]; // Show first date by default
  minDate: Date = this.availableDates[0];
  maxDate: Date = this.availableDates[this.availableDates.length - 1];
  disabledDates: Date[] = [];

  buildDisabledDates() {
    const start = new Date(this.minDate);
    const end = new Date(this.maxDate);
    const allowedTimestamps = this.availableDates.map(d => d.getTime());

    while (start <= end) {
      if (!allowedTimestamps.includes(start.getTime())) {
        this.disabledDates.push(new Date(start));
      }
      start.setDate(start.getDate() + 1);
    }
  }
  getStatusLabel(leave: any): string {
    if (leave.hodDecision === 'REJECTED') {
      return 'Manager Rejected';
    }
    if (leave.hodDecision === 'APPROVED' && leave.hrDecision === 'PENDING') {
      return 'Manager Approved (Waiting HR)';
    }
    if (leave.hrDecision === 'APPROVED') {
      return 'HR Approved';
    }
    if (leave.hrDecision === 'REJECTED') {
      return 'HR Rejected';
    }
    return 'Pending';
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
  // acceptLeave(id: number) {
  //   this.leaveService.updateLeaveStatus(id, 'Approved', this.currentUserId).subscribe({
  //     next: () => this.loadLeaves(),
  //     error: (err) => console.error('Error approving leave:', err)
  //   });
  // }
  // openDeclineDialog(id: number) {
  //   this.currentDeclineId = id;
  //   this.declineDialogVisible = true;
  // }

  // confirmDecline() {
  //   if (!this.declineReason.trim()) return;

  //   this.leaveService.updateLeaveStatus(
  //     this.currentDeclineId!,
  //     'Declined',
  //     this.currentUserId,
  //     this.declineReason
  //   ).subscribe({
  //     next: () => {
  //       this.declineDialogVisible = false;
  //       this.declineReason = '';
  //       this.currentDeclineId = null;
  //       this.loadLeaves();
  //     },
  //     error: (err) => console.error('Error declining leave:', err)
  //   });
  // }
  // acceptLeave(id: number, role: 'MANAGER' | 'HR') {
  //   const normalized = this.normalizeRole(this.role);
  //   console.log(normalized, this.role)
  //   if (!normalized) return;


  //   this.leaveService.updateLeaveStatus(id, 'Approved', this.currentUserId, normalized).subscribe({
  //     next: () => this.loadLeaves(),
  //     error: (err) => console.error('Error approving leave:', err)
  //   });
  // }
  acceptLeave(id: number, level: 'LEVEL1' | 'LEVEL2') {

    let backendRole: 'REPORTING_MANAGER' | 'HR_MANAGER' | 'MANAGEMENT' | null = null;
  
    if (level === 'LEVEL1') {
  
      if (this.isReportingManager) backendRole = 'REPORTING_MANAGER';
      else if (this.isHRManager) backendRole = 'HR_MANAGER';
      else if (this.isManagement) backendRole = 'MANAGEMENT';
  
    } else if (level === 'LEVEL2') {
      backendRole = 'HR_MANAGER';
    }
  
    this.leaveService.updateLeaveStatus(id,'Approved', this.loggedEmpId, backendRole!)
        .subscribe(() => this.loadLeaves());
  }
  
  private normalizeRole(role: string): 'MANAGER' | 'HR' | null {
    const norm = role.trim().toUpperCase();

    if (norm === 'REPORTING MANAGER' || norm === 'MANAGER') {
      return 'MANAGER';
    }

    if (norm === 'HR' || norm === 'HR MANAGER') {
      return 'HR';
    }

    return null;
  }



  // openDeclineDialog(id: number, role: 'MANAGER' | 'HR') {
  //   const normalized = this.normalizeRole(this.role);
  //   if (!normalized) return;
  //   this.currentDeclineId = id;
  //   this.currentDeclineRole = normalized;   // NEW
  //   this.declineDialogVisible = true;
  // }
  openDeclineDialog(id: number, level: 'LEVEL1' | 'LEVEL2') {
    let backendRole: 'REPORTING_MANAGER' | 'HR_MANAGER' | 'MANAGEMENT' | null = null;
  
    // LEVEL 1 approvals
    if (level === 'LEVEL1') {
  
      if (this.isReportingManager) backendRole = 'REPORTING_MANAGER';
      else if (this.isHRManager) backendRole = 'HR_MANAGER';
      else if (this.isManagement) backendRole = 'MANAGEMENT';
  
    }
  
    // LEVEL 2 approvals → always HR Manager
    else if (level === 'LEVEL2') {
      backendRole = 'HR_MANAGER';
    }
  
    this.currentDeclineId = id;
    this.currentDeclineRole = backendRole;
    this.declineDialogVisible = true;
  }
  

  confirmDecline() {
    if (!this.declineReason.trim()) return;
    this.leaveService.updateLeaveStatus(
      this.currentDeclineId!,
      'Declined',
      this.currentUserId,
      this.currentDeclineRole!,
      this.declineReason
    ).subscribe({
      next: () => {
        this.declineDialogVisible = false;
        this.declineReason = '';
        this.currentDeclineId = null;
        this.loadLeaves();
      },
      error: (err) => console.error('Error declining leave:', err)
    });
  }

  closeDeclineDialog() {
    this.declineDialogVisible = false;
    this.declineReason = '';
    this.currentDeclineId = null;
  }
  openLeaveDetails(leave: any) {
    this.selectedLeaveForView = {
      ...leave,
      startDate: leave.startDate, // Ensure these fields exist from backend
      endDate: leave.endDate,
      leaveType: leave.leaveType,
      reason: leave.reson,
      declineReason: leave.declineReason
    };
    this.leaveService.getDashboard(leave.empID).subscribe(d => this.dashboard = d);

    this.leaveService.getWhoIsOnLeaveToday().subscribe(b => this.buckets = b);
    this.showLeaveDetailsPopup = true;
  }
  visible(list: any[], key: BucketKey) {
    return this.expanded[key] ? list : list.slice(0, 2);
  }
  moreCount(list: any[]) {
    return Math.max(0, list.length - 2);
  }
  toggle(key: BucketKey) {
    this.expanded[key] = !this.expanded[key];
  }
  showLevel1Approve(leave: any): boolean {

    // console.log('Checking Level 1 approval for leave:', leave);

    // HR Employee (dept = HR AND roleId ≠ HR Manager)
    if (leave.department === 1 && leave.roleId !== 1) {
      console.log('HR Employee - No Level 1 approval', this.isHRManager, leave.hodDecision);
      return this.isHRManager && leave.hodDecision === 'PENDING';
    }

    // HR Manager → only Management approves
    if (leave.roleId === 1) {
      return this.isManagement && leave.hodDecision === 'PENDING';
    }

    // Reporting Manager & HOD → Management approves
    if (leave.roleId === 3 || leave.roleId === 5 /* if HOD role exists */) {
      return this.isManagement && leave.hodDecision === 'PENDING';
    }

    // Normal Employee → Reporting Manager approves
    if (leave.roleId === 2) {
      return this.isReportingManager && leave.hodDecision === 'PENDING';
    }

    return false;
  }
  showLevel2Approve(leave: any): boolean {

    // HR Employees → NO Level 2 approval
    if (leave.department === 1 && leave.roleId !== 1) {
        return false;
    }
  
    // HR Manager → NO Level 2 approval
    if (leave.roleId === 1) {
        return false;
    }
  
    // Reporting Manager & HOD → HR Manager at Level 2
    if (leave.roleId === 3 || leave.roleId === 5) {
        return this.isHRManager && leave.hodDecision === 'APPROVED' && leave.hrDecision === 'PENDING';
    }
  
    // Normal Employee → HR Manager at Level 2
    if (leave.roleId === 2) {
        return this.isHR && leave.hodDecision === 'APPROVED' && leave.hrDecision === 'PENDING';
    }
  
    return false;
  }
  
}
