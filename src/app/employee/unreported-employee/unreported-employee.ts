import { Component } from '@angular/core';
import { Employees } from '../../services/employees/employees';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Departments } from '../../services/departments/departments';


@Component({
  selector: 'app-unreported-employee',
  imports: [CommonModule, CardModule, TableModule, DatePickerModule, FormsModule, ButtonModule],
  templateUrl: './unreported-employee.html',
  styleUrl: './unreported-employee.css',
})
export class UnreportedEmployee {
  selectedDate: Date = new Date();
  absentList: any[] = [];
  departments: any[] = [];
  loading: boolean = false;

  constructor(private absentService: Employees, private departmentService: Departments) {}

  ngOnInit() {
    this.loadAbsent();

    this.departmentService.getDepartments().subscribe({
      next: (res) => {
        this.departments = res;
      },
      error: (err) => {
        console.error(err);
      }
    });
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


  loadAbsent() {
    const dateStr = this.selectedDate.toISOString().split("T")[0];
    this.loading = true;
    this.absentService.getAbsentWithoutLeave(dateStr).subscribe({
      next: (res) => {
        this.loading = false;
        const list = res ?? [];  // <-- safe fallback
  
        this.absentList = list.map((emp: any) => ({
          employeeCode: emp.employeeCode,
          name: emp.name,
          department: emp.department || 'N/A',
          date: this.selectedDate,
          shiftEndTime: emp.shiftEndTime || 'N/A',
          shiftStartTime: emp.shiftStartTime || 'N/A',
          departmentId: emp.departmentId || 0,
          status: 'Absent'
        }));
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  
  }
}
