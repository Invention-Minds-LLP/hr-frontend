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

@Component({
  selector: 'app-employee-shift-list',
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
  ],
  templateUrl: './employee-shift-list.html',
  styleUrl: './employee-shift-list.css',
})
export class EmployeeShiftList {
  shifts: any[] = [];
  filtered: any[] = [];

  search = '';
  fromDate!: Date;
  toDate!: Date;

  editVisible = false;
  selectedRow: any;
  selectedShiftId!: number;

  shiftOptions: any[] = [];

  constructor(private shiftService: Shifts) { }

  ngOnInit() {
    this.load();

    // this.shiftService.getShiftTemplates().subscribe(res => {
    //   this.shiftOptions = res;
    // });
  this.shiftService.getShiftTemplates().subscribe(res => {
    this.shiftOptions = res.map((s: any) => ({
      ...s,
      label: `${s.name} (${this.formatTime(s.startTime)} - ${this.formatTime(s.endTime)})`
    }));
  });
    this.shiftService.getRotationPatterns().subscribe(res => {
      this.rotationPatterns = res;
    });
  }

  private formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  }

  load() {
    const params: any = {};
    if (this.fromDate && this.toDate) {
      params.from = this.fromDate.toISOString().slice(0, 10);
      params.to = this.toDate.toISOString().slice(0, 10);
    }

    this.shiftService.getEmployeeShifts(params).subscribe(res => {
      this.shifts = res;
      this.filtered = res;
    });
  }

  applyFilter() {
    const val = this.search.toLowerCase();
    this.filtered = this.shifts.filter(s =>
      `${s.employee.firstName} ${s.employee.lastName}`.toLowerCase().includes(val) ||
      s.employee.employeeCode.toLowerCase().includes(val)
    );
  }

  // openEdit(row: any) {
  //   this.selectedRow = row;
  //   this.selectedShiftId = row.shiftId;
  //   this.editVisible = true;
  // }

  shiftModes = [
    { label: 'Fixed', value: 'FIXED' },
    { label: 'Rotational', value: 'ROTATIONAL' }
  ];

  selectedMode!: 'FIXED' | 'ROTATIONAL';

  // FIXED
  selectedFixedShiftId!: number;

  // ROTATIONAL
  rotationPatterns: any[] = [];
  selectedPatternId!: number;
  rotationStartDate!: Date;
  // openEdit(row: any) {
  //   this.selectedRow = row;

  //   const setting = row.employee.EmployeeShiftSetting;

  //   this.selectedMode = setting?.mode || 'FIXED';
  //   this.selectedFixedShiftId = setting?.fixedShiftId;

  //   this.selectedPatternId = setting?.rotationPatternId;
  //   this.rotationStartDate = setting?.startDate
  //     ? new Date(setting.startDate)
  //     : new Date();

  //   this.editVisible = true;
  // }
  openModeEdit(row: any) {
  this.selectedRow = row;

  const setting = row.employee.EmployeeShiftSetting;

  this.selectedMode = setting?.mode || 'FIXED';
  this.selectedFixedShiftId = setting?.fixedShiftId;
  this.selectedPatternId = setting?.rotationPatternId;
  this.rotationStartDate = setting?.startDate
    ? new Date(setting.startDate)
    : new Date();

  this.editVisible = true;
}

  saveShiftMode() {
    const employeeId = this.selectedRow.employee.id;

    if (this.selectedMode === 'FIXED') {
      this.shiftService.assignFixedShift({
        employeeId,
        shiftId: this.selectedFixedShiftId
      }).subscribe(() => {
        this.afterSave();
      });
    }

    if (this.selectedMode === 'ROTATIONAL') {
      this.shiftService.assignRotational({
        employeeId,
        patternId: this.selectedPatternId,
        startDate: this.rotationStartDate.toISOString().slice(0, 10)
      }).subscribe(() => {
        this.afterSave();
      });
    }
  }

  afterSave() {
    this.editVisible = false;
    this.load();
  }
assignmentEditVisible = false;
modeEditVisible = false;
openAssignmentEdit(row: any) {
  this.selectedRow = row;
  this.selectedShiftId = row.shiftId;
  this.assignmentEditVisible = true;
}
updateShift() {
  this.shiftService
    .updateEmployeeShift(this.selectedRow.id, this.selectedShiftId)
    .subscribe(() => {
      this.assignmentEditVisible = false;
      this.load();
    });
}
patternVisible = false;

patternForm = {
  name: '',
  cycleDays: 7
};

patternItems: { dayIndex: number; shiftId?: number }[] = [];

openPatternModal() {
  this.patternVisible = true;
  this.patternForm = { name: '', cycleDays: 7 };
  // this.patternItems = [{ dayIndex: 0 }];
  this.onCycleDaysChange(this.patternForm.cycleDays);
}

addPatternItem() {
  this.patternItems.push({
    dayIndex: this.patternItems.length
  });
}

removePatternItem(index: number) {
  this.patternItems.splice(index, 1);
  this.patternItems.forEach((item, i) => item.dayIndex = i);
}
saveRotationPattern() {
  if (!this.patternForm.name || !this.patternItems.length) {
    return;
  }

  this.shiftService.createRotationPattern({
    name: this.patternForm.name,
    cycleDays: this.patternForm.cycleDays
  }).subscribe(pattern => {

    const items = this.patternItems.map(i => ({
      dayIndex: i.dayIndex,
      shiftId: i.shiftId
    }));

    this.shiftService.addRotationItemsBulk(pattern.id, items)
      .subscribe(() => {
        this.patternVisible = false;
        this.loadRotationPatterns();
      });
  });
}

loadRotationPatterns() {
  this.shiftService.getRotationPatterns().subscribe(res => {
    this.rotationPatterns = res;
  });
}
onCycleDaysChange(days: number) {
  const cycleDays = Number(days);

  if (!cycleDays || cycleDays < 1) {
    this.patternItems = [];
    return;
  }

  // Rebuild patternItems to match cycleDays
  this.patternItems = Array.from({ length: cycleDays }).map((_, i) => ({
    dayIndex: i,
    shiftId: this.patternItems[i]?.shiftId // preserve selected shift if exists
  }));
}

}