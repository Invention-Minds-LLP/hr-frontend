import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { AttendanceCalendar } from '../../services/attendance-calendar/attendance-calendar';
import { SkeletonModule } from 'primeng/skeleton';
import { Departments } from '../../services/departments/departments';
import { DatePickerModule } from 'primeng/datepicker';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { DialogModule } from 'primeng/dialog';

interface Attendance {
  empName: string;
  phoneNumber: number;
  departmentId: number;
  department: string;
  jobTitle: string;
  empType: string;
  email: string;
  empId: string;
  status: 'Present' | 'Absent' | 'ON_HOLD' | 'FORCE_PRESENT' | 'IN_PROGRESS' | null;
  [key: string]: any;
}


@Component({
  selector: 'app-history',
  imports: [InputIconModule, IconFieldModule, InputTextModule,
    FloatLabelModule, FormsModule, TableModule, CommonModule,
    SkeletonModule, DatePickerModule, DialogModule],
  templateUrl: './history.html',
  styleUrl: './history.css'
})
export class History {

  filteredAttendanceData: any[] = [];
  selectedFilter: any = null;
  filterDropdown: boolean = false;
  loading = true;
  departments: any[] = [];
  showFilterDropdown: boolean = false;

  filterOptions = [
    { label: 'Employee ID', value: 'empId' },
    { label: 'Name', value: 'name' },
    { label: 'Departmnent', value: 'department' },
    { label: 'JobTitle', value: 'jobtitle' },
    { label: 'Employee Type', value: 'empType' }
  ]

  attendanceData: Attendance[] = [];
  selectedDate = new Date().toISOString().slice(0, 10);
  showExportDialog = false;
selectedExportMonth: Date = new Date();






  constructor(private attendanceService: AttendanceCalendar, private departmentService: Departments) { }


  ngOnInit() {
    this.loadAttendance();
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!searchText) {
      this.filteredAttendanceData = [...this.attendanceData]
      return
    }

    const filterKey = this.selectedFilter?.value as keyof Attendance;

    this.filteredAttendanceData = this.attendanceData.filter((attendance: Attendance) => {
      if (filterKey === 'name') {
        return attendance.empName?.toLocaleLowerCase().includes(searchText)
      }

      return attendance[filterKey]?.toString().toLowerCase().includes(searchText)
    })

  }




  toggleDropdown() {
    this.filterDropdown = !this.filterDropdown
  }



  setStatus(attendanceData: Attendance, newStatus: 'Present' | 'Absent') {
    attendanceData.status = newStatus;
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

  getDisplayStatus(status: string | null): string {
    if (!status) return '';

    switch (status) {
      case 'FORCE_PRESENT':
        return 'Force Present';
      case 'IN_PROGRESS':
        return 'On Hold';
      case 'ON_HOLD':
        return 'On Hold';
      case 'Present':
        return 'Present';
      case 'Absent':
        return 'Absent';
      default:
        return status;
    }
  }
  getStatusClass(status: string | null): string {
    switch (status) {
      case 'Present':
        return 'present-btn';

      case 'Absent':
        return 'absent-btn';

      case 'FORCE_PRESENT':
        return 'force-btn'

      case 'ON_HOLD':
      case 'IN_PROGRESS':

        return 'hold-btn';

      default:
        return '';
    }
  }
  getDefaultImage(gender?: string | null): string {
    const g = gender?.toUpperCase?.() || 'MALE';
    return g === 'FEMALE'
      ? '/img-women.png'
      : '/img.png';
  }
  onFilterChange() {
    this.filteredAttendanceData = [...this.attendanceData];
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
    this.filteredAttendanceData = [...this.attendanceData];

    // Close dropdown
    this.showFilterDropdown = false;
  }
  loadAttendance() {
    this.loading = true;

    this.attendanceService
      .getAttendanceHistory(this.selectedDate)
      .subscribe({
        next: (data) => {
          this.attendanceData = data;
          this.filteredAttendanceData = [...data];
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        }
      });
  }

  approve(row: any) {
    const hrId = Number(localStorage.getItem('empId'));

    this.attendanceService.approveAttendance(
      row.attendanceId || null,
      'FORCE_PRESENT',
      hrId,
      undefined,
      row.date,
      row.employeeId
    ).subscribe({
      next: () => this.loadAttendance(),
      error: (err) => console.error(err)
    });
  }

  reject(row: any) {
    const hrId = Number(localStorage.getItem('empId'));

    this.attendanceService.approveAttendance(
      row.attendanceId,
      'REJECTED',
      hrId,
      'Rejected by HR'
    ).subscribe({
      next: () => this.loadAttendance(),
      error: (err) => console.error(err)
    });
  }
openExportDialog() {
  this.showExportDialog = true;
}


exportMonthlyRegister() {
  const d = this.selectedExportMonth;

  const month =
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0');

  this.attendanceService.getMonthlyRegister(month)
    .subscribe((data: any[]) => {

      if (!data.length) return;

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Register');

      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
      });

      const blob = new Blob([excelBuffer], {
        type: 'application/octet-stream'
      });

      saveAs(blob, `Attendance-Register-${month}.xlsx`);

      this.showExportDialog = false;
    });
}


}

