import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { Select, SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DatePicker, DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { Shifts } from '../../services/shifts/shifts';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-manager-shift',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DialogModule,
    SelectModule,
    ButtonModule,
    DatePickerModule,
    TagModule,
    InputTextModule,
    CardModule,
    TooltipModule
  ],
  templateUrl: './manager-shift.html',
  styleUrl: './manager-shift.css',
})
export class ManagerShift {
  employees: any[] = [];
  executiveShifts: any[] = [];
  patterns: any[] = [];

  selectedEmployee: any;
  selectedMode: 'FIXED' | 'ROTATIONAL' = 'FIXED';

  modes = [
    { label: 'Fixed', value: 'FIXED' },
    { label: 'Rotational', value: 'ROTATIONAL' }
  ];

  selectedShiftId!: number;
  selectedPatternId!: number;
  startDate = new Date();
  // dialog
  requestVisible = false;
  requestLoading = false;

  // request form
  requestEmployees: any[] = [];
  requestForm = {
    mode: 'FIXED' as 'FIXED' | 'ROTATIONAL',
    shiftId: null as number | null,
    patternId: null as number | null,
    startDate: new Date()
  };

  // rotation pattern modal
  patternVisible = false;

  departmentId: number = Number(localStorage.getItem('deptId'));

  patternForm = {
    name: '',
    cycleDays: 4
  };

  patternItems: { dayIndex: number; shiftId?: number }[] = [];


  constructor(private service: Shifts) { }

  ngOnInit() {
    this.load();
  }

  load() {
    this.service.getMyEmployees().subscribe(r => this.employees = r);
    // this.service.getExecutiveShifts().subscribe(r => this.executiveShifts = r);
    this.service.getExecutiveShifts(this.departmentId).subscribe(res => {
      this.executiveShifts = res.map((s: any) => ({
        ...s,
        label: `${s.name} (${this.formatTime(s.startTime)} - ${this.formatTime(s.endTime)})`
      }));
    });
    this.service.getRotationPatterns().subscribe(r => this.patterns = r);
  }

  openAssign(emp: any) {
    this.selectedEmployee = emp;
    this.selectedMode = emp.EmployeeShiftSetting?.mode || 'FIXED';
  }

  // save() {
  //   const employeeId = this.selectedEmployee.id;

  //   if (this.selectedMode === 'FIXED') {
  //     this.service.assignFixedShift({
  //       employeeId,
  //       shiftId: this.selectedShiftId
  //     }).subscribe(() => this.load());
  //   }

  //   if (this.selectedMode === 'ROTATIONAL') {
  //     this.service.assignRotational({
  //       employeeId,
  //       patternId: this.selectedPatternId,
  //       startDate: new Date(this.startDate).toISOString()
  //     }).subscribe(() => this.load());
  //   }
  // }
  assignLoading = false;

  save() {
    if (!this.selectedEmployee) return;

    this.assignLoading = true;
    const employeeId = this.selectedEmployee.id;

    const req =
      this.selectedMode === 'FIXED'
        ? this.service.assignFixedShift({
          employeeId,
          shiftId: this.selectedShiftId
        })
        : this.service.assignRotational({
          employeeId,
          patternId: this.selectedPatternId,
          startDate: new Date(this.startDate).toISOString()
        });

    req.subscribe({
      next: () => {
        this.assignLoading = false;
        this.selectedEmployee = null;
        this.load();
      },
      error: () => {
        this.assignLoading = false;
        alert('Assignment failed');
      }
    });
  }

  openPatternModal() {
    this.patternVisible = true;
    this.patternForm = { name: '', cycleDays: 4 };
    this.onCycleDaysChange(this.patternForm.cycleDays);
    this.generatePatternNames();
  }

  onCycleDaysChange(days: number) {
    const cycleDays = Number(days);

    if (!cycleDays || cycleDays < 1) {
      this.patternItems = [];
      return;
    }

    this.patternItems = Array.from({ length: cycleDays }).map((_, i) => ({
      dayIndex: i,
      shiftId: this.patternItems[i]?.shiftId
    }));
  }

  addPatternItem() {
    this.patternItems.push({ dayIndex: this.patternItems.length });
  }

  removePatternItem(index: number) {
    this.patternItems.splice(index, 1);
    this.patternItems.forEach((item, i) => item.dayIndex = i);
  }
  // saveRotationPattern() {
  //   if (!this.patternForm.name || !this.patternItems.length) return;

  //   this.service.createRotationPattern({
  //     name: this.patternForm.name,
  //     cycleDays: this.patternForm.cycleDays
  //   }).subscribe(pattern => {

  //     const items = this.patternItems.map(i => ({
  //       dayIndex: i.dayIndex,
  //       shiftId: i.shiftId
  //     }));

  //     this.service.addRotationItemsBulk(pattern.id, items)
  //       .subscribe(() => {
  //         this.patternVisible = false;
  //         this.service.getManagerPatterns()
  //           .subscribe(r => this.patterns = r);
  //       });
  //   });
  // }
  getAvailableShifts(currentIndex: number) {
    const previousShiftId =
      currentIndex > 0 ? this.patternItems[currentIndex - 1]?.shiftId : null;

    return this.executiveShifts.filter(shift => {
      const usedCount = this.getShiftUsageCount(shift.id);

      // ❌ Rule 1: More than 2 times not allowed
      if (usedCount >= 2) return false;

      // ❌ Rule 2: Consecutive same shift not allowed
      if (previousShiftId && previousShiftId === shift.id) return false;

      return true;
    });
  }


  formatTime(date: string | Date) {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  getShiftById(id?: number) {
    console.log(this.executiveShifts, id);

    return this.executiveShifts.find(s => s.id === id);
  }


  // saveRotationPattern() {
  //   if (!this.patternForm.name || !this.patternItems.length) return;
  //   const selected = this.patternItems.map(i => i.shiftId).filter(Boolean);
  //   const unique = new Set(selected);

  //   if (selected.length !== unique.size) {
  //     alert('Same shift cannot be repeated in rotation');
  //     return;
  //   }

  //   const counts = new Map<number, number>();

  //   for (let i = 0; i < this.patternItems.length; i++) {
  //     const curr = this.patternItems[i];
  //     if (!curr.shiftId) continue;

  //     // Count usage
  //     counts.set(curr.shiftId, (counts.get(curr.shiftId) || 0) + 1);

  //     // ❌ consecutive check
  //     if (i > 0 && curr.shiftId === this.patternItems[i - 1]?.shiftId) {
  //       alert('Same shift cannot be assigned in consecutive weeks');
  //       return;
  //     }
  //   }

  //   // ❌ more than 2 times check
  //   for (const [_, count] of counts) {
  //     if (count > 2) {
  //       alert('One shift cannot be assigned more than 2 weeks');
  //       return;
  //     }
  //   }

  //   const DAYS_PER_WEEK = 7;
  //   const expandedItems: { dayIndex: number; shiftId: number }[] = [];

  //   this.patternItems.forEach((weekItem, weekIndex) => {
  //     if (!weekItem.shiftId) return;

  //     for (let d = 0; d < DAYS_PER_WEEK; d++) {
  //       expandedItems.push({
  //         dayIndex: weekIndex * DAYS_PER_WEEK + d,
  //         shiftId: weekItem.shiftId
  //       });
  //     }
  //   });

  //   const totalDays = expandedItems.length;

  //   this.service.createRotationPattern({
  //     name: this.patternForm.name,
  //     cycleDays: totalDays
  //   }).subscribe(pattern => {

  //     this.service.addRotationItemsBulk(pattern.id, expandedItems)
  //       .subscribe(() => {
  //         this.patternVisible = false;
  //         this.service.getManagerPatterns()
  //           .subscribe(r => this.patterns = r);
  //       });
  //   });
  // }
  patternSaving = false;

  saveRotationPattern() {
    if (!this.patternForm.name || !this.patternItems.length) return;

    this.patternSaving = true;

    const DAYS_PER_WEEK = 7;
    const expandedItems: { dayIndex: number; shiftId: number }[] = [];

    this.patternItems.forEach((weekItem, weekIndex) => {
      if (!weekItem.shiftId) return;
      for (let d = 0; d < DAYS_PER_WEEK; d++) {
        expandedItems.push({
          dayIndex: weekIndex * DAYS_PER_WEEK + d,
          shiftId: weekItem.shiftId
        });
      }
    });

    this.service.createRotationPattern({
      name: this.patternForm.name,
      cycleDays: expandedItems.length
    }).subscribe({
      next: pattern => {
        this.service.addRotationItemsBulk(pattern.id, expandedItems)
          .subscribe({
            next: () => {
              this.patternSaving = false;
              this.patternVisible = false;
              this.load();
            },
            error: () => {
              this.patternSaving = false;
              alert('Failed to save rotation items');
            }
          });
      },
      error: () => {
        this.patternSaving = false;
        alert('Failed to create pattern');
      }
    });
  }

  private monthNames = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];
  patternNameOptions: { label: string; value: string }[] = [];
  generatePatternNames() {
    const startYear = 2026;
    const endYear = 2040;

    this.patternNameOptions = [];

    for (let year = startYear; year <= endYear; year++) {
      for (const month of this.monthNames) {
        const name = `${month} - ${year}`;
        this.patternNameOptions.push({
          label: name,
          value: name
        });
      }
    }
  }
  getShiftUsageCount(shiftId: number): number {
    return this.patternItems.filter(i => i.shiftId === shiftId).length;
  }

  selectedEmployees: any[] = [];

  bulkVisible = false;
  bulkPatternId!: number;
  bulkStartDate = new Date();

  openBulkAssign() {
    this.bulkVisible = true;
    this.bulkPatternId = undefined!;
    this.bulkStartDate = new Date();
  }
  bulkAssigning = false;

  bulkAssign() {
    if (!this.bulkPatternId || !this.selectedEmployees.length) return;

    this.bulkAssigning = true;
    const startDate = this.bulkStartDate.toISOString();

    const requests = this.selectedEmployees.map(emp =>
      this.service.assignRotational({
        employeeId: emp.id,
        patternId: this.bulkPatternId,
        startDate
      })
    );

    Promise.all(requests.map(r => r.toPromise()))
      .then(() => {
        this.bulkAssigning = false;
        this.bulkVisible = false;
        this.selectedEmployees = [];
        this.load();
      })
      .catch(() => {
        this.bulkAssigning = false;
        alert('Bulk assignment failed');
      });
  }

  openSingleRequest(emp: any) {
    this.openRequestDialog([emp]);
  }

  openBulkRequest() {
    this.openRequestDialog(this.selectedEmployees);
  }

  openRequestDialog(emps: any[]) {
    this.requestEmployees = emps;
    this.requestForm = {
      mode: 'FIXED',
      shiftId: null,
      patternId: null,
      startDate: new Date()
    };
    this.requestVisible = true;
  }

  closeRequestDialog() {
    this.requestVisible = false;
  }
  submitRequest() {
    if (!this.requestEmployees.length) return;

    this.requestLoading = true;
    const startDate = this.requestForm.startDate.toISOString();

    const requests = this.requestEmployees.map(emp => {
      const payload: any = {
        employeeId: emp.id,
        mode: this.requestForm.mode,
        startDate
      };

      if (this.requestForm.mode === 'FIXED')
        payload.shiftId = this.requestForm.shiftId;

      if (this.requestForm.mode === 'ROTATIONAL')
        payload.patternId = this.requestForm.patternId;

      return this.service.requestShiftChange(payload).toPromise();
    });

    Promise.all(requests)
      .then(() => {
        this.requestLoading = false;
        this.requestVisible = false;
        this.selectedEmployees = [];
        this.load();
      })
      .catch(err => {
        this.requestLoading = false;
        alert(err?.error?.error || 'One or more requests failed');
      });
  }

}
