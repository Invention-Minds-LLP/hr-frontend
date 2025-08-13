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

export type BucketKey = 'today' | 'thisWeek' | 'nextMonth';


@Component({
  selector: 'app-leave-request',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule, TooltipModule, LeavePopup],
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
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'department' },
    { label: 'Leave Type', value: 'leaveType' },
  ];
  private isHRRole(norm: string): boolean {
    return norm === 'HR' || norm === 'HR_MANAGER';
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


  expanded: Record<BucketKey, boolean> = {
    today: false,
    thisWeek: false,
    nextMonth: false,
  };

  columnCount: number = 10;
  isHR: boolean = false;
  role: string = '';
  loggedEmployeeId: number = 0;






  constructor(private leaveService: Leaves, private departmentService: Departments) { }


  ngOnInit() {
    this.leaveData = [...this.leaveData];
    this.filteredLeaveData = [...this.leaveData];
    this.loadLeaves();
    this.role = localStorage.getItem('role') || '';
    this.loggedEmployeeId = Number(localStorage.getItem('empId') )|| 0
    this.isHR = this.isHRRole(this.role);
    this.buildDisabledDates();

    this.departmentService.getDepartments().subscribe(data => this.departments = data);
  }

  loadLeaves() {
    this.leaveService.getLeaves().subscribe({
      next: (data) => {
        this.leaveData = data.map((leave: any, index: number) => ({
          no: index + 1,
          id: leave.id,
          empId: leave.employee?.employeeCode,
          empName: `${leave.employee?.firstName} ${leave.employee?.lastName}`,
          email: leave.employee?.email || '',
          department: leave.employee?.departmentId || '',
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
        }));
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

    const filterKey = this.selectedFilter?.value as keyof any;

    this.filteredLeaveData = this.leaveData.filter((leave: any) => {
      if (filterKey === 'name') {
        return leave.empName?.toLowerCase().includes(searchText);
      }

      return leave[filterKey]?.toString().toLowerCase().includes(searchText);
    });
  }


  onFilterChange() {
    this.filteredLeaveData = [...this.leaveData];
  }

  toggleFilterDropdown(): void {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    this.showFilterDropdown = false;
    this.onFilterChange();
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

  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }

  getDepartmentName(id: number): string {
    return this.departments.find(dep => dep.id === id)?.name || 'N/A';
  }
  acceptLeave(id: number) {
    this.leaveService.updateLeaveStatus(id, 'Approved', this.currentUserId).subscribe({
      next: () => this.loadLeaves(),
      error: (err) => console.error('Error approving leave:', err)
    });
  }
  openDeclineDialog(id: number) {
    this.currentDeclineId = id;
    this.declineDialogVisible = true;
  }

  confirmDecline() {
    if (!this.declineReason.trim()) return;

    this.leaveService.updateLeaveStatus(
      this.currentDeclineId!,
      'Declined',
      this.currentUserId,
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

}
