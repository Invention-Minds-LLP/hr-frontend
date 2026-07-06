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
import { MessageService } from 'primeng/api';

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
  filteredEmployees: any[] = [];
  executiveShifts: any[] = [];
  patterns: any[] = [];

  // ── Team-list filters (client-side) ──
  filterName = '';
  filterCode = '';
  filterDept: string | null = null;
  filterDesignation: string | null = null;
  departmentOptions: string[] = [];
  designationOptions: string[] = [];

  // ── Per-day shift overrides in the monthly dialog ──
  // { 'YYYY-MM-DD': shiftId } — a day whose shift differs from its week's shift.
  dayOverrideMap: { [iso: string]: number | null } = {};
  expandedWeeks = new Set<number>();
  // Stable per-week day list — computed ONCE per month. Never call weekDays()
  // from the template (it returns a fresh array each CD cycle → render loop).
  weekDaysMap: { [weekIndex: number]: Date[] } = {};

  selectedEmployee: any;
  selectedMode: 'FIXED' | 'ROTATIONAL' = 'FIXED';

  modes = [
    { label: 'Fixed', value: 'FIXED' },
    { label: 'Rotational', value: 'ROTATIONAL' }
  ];

  selectedShiftId!: number;
  selectedPatternId!: number;
  startDate = new Date();

  isMonthLocked = false;
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
  ROTATION_SIZE = 7;
  lockedWeeks = new Set<number>();
  monthlySubmitting = false;

  weekOffDateMap: { [weekIndex: number]: Date | null } = {};

  weekSelectableRanges: { min: Date; max: Date }[] = [];
  weekDefaultDates: Date[] = [];





  patternItems: { dayIndex: number; shiftId?: number }[] = [];

  // 🔁 rotation order (business-defined)
  executiveRotationOrder: number[] = [];

  // Master switch for the monthly-shift rotation rules (queue order, no-duplicate
  // -in-month, night→6h, 6h-only-after-night, one-6h/night-per-cycle). Currently
  // OFF so a manager can assign ANY shift to ANY week. Set to true to re-enable.
  enforceRotationRules = false;

  // Edit mode: when set, submitting PUTs to the existing approval instead of
  // creating a new request. POSTEDIT additionally locks past weeks.
  editingApprovalId: number | null = null;
  editMode: 'INFLIGHT' | 'POSTEDIT' | null = null;
  editLockNote = ''; // shown at the bottom of the dialog when locked/edit-pending

  // 🔁 runtime state
  usedRotationShiftIds = new Set<number>();
  sixHourUsed = false;
  lastShiftMeta: { isNight: boolean; isSixHour: boolean } | null = null;
  usedShiftIdsInCurrentMonth = new Set<number>();
  minMonth!: Date;
  maxMonth!: Date;





  constructor(private service: Shifts, private messageService: MessageService) { }

  ngOnInit() {
    this.load();
    this.setMonthLimits()
  }

  load() {
    this.service.getMyEmployees().subscribe({
      next: (r) => {
        this.employees = Array.isArray(r) ? r : [];
        this.buildFilterOptions();
        this.applyEmpFilter();
        if (!this.employees.length) {
          console.warn('getMyEmployees returned no team members');
        }
      },
      error: (err) => {
        this.employees = [];
        this.applyEmpFilter();
        console.error('getMyEmployees failed', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Could not load team',
          detail: err?.error?.error || err?.error?.message || 'Failed to load your team members.'
        });
      }
    });
    // this.service.getExecutiveShifts().subscribe(r => this.executiveShifts = r);
    this.service.getExecutiveShifts(this.departmentId).subscribe(res => {
      this.executiveShifts = res.map((s: any) => ({
        ...s,
        label: `${s.name} (${this.formatTime(s.startTime)} - ${this.formatTime(s.endTime)})`
      }));
      this.buildExecutiveRotation();
    });
    this.service.getRotationPatterns().subscribe(r => this.patterns = r);
  }

  // ── Team-list filtering & department-name sort ──
  buildFilterOptions() {
    const depts = new Set<string>();
    const desigs = new Set<string>();
    for (const e of this.employees) {
      if (e?.Department?.name) depts.add(e.Department.name);
      if (e?.designation?.name) desigs.add(e.designation.name);
    }
    this.departmentOptions = [...depts].sort((a, b) => a.localeCompare(b));
    this.designationOptions = [...desigs].sort((a, b) => a.localeCompare(b));
  }

  applyEmpFilter() {
    const name = this.filterName.trim().toLowerCase();
    const code = this.filterCode.trim().toLowerCase();

    this.filteredEmployees = this.employees
      .filter(e => {
        const full = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
        if (name && !full.includes(name)) return false;
        if (code && !String(e.employeeCode || '').toLowerCase().includes(code)) return false;
        if (this.filterDept && e?.Department?.name !== this.filterDept) return false;
        if (this.filterDesignation && e?.designation?.name !== this.filterDesignation) return false;
        return true;
      })
      // Default order: department name, then employee name.
      .sort((a, b) => {
        const d = (a?.Department?.name || '').localeCompare(b?.Department?.name || '');
        if (d !== 0) return d;
        return `${a.firstName || ''} ${a.lastName || ''}`.localeCompare(`${b.firstName || ''} ${b.lastName || ''}`);
      });
  }

  clearEmpFilter() {
    this.filterName = '';
    this.filterCode = '';
    this.filterDept = null;
    this.filterDesignation = null;
    this.applyEmpFilter();
  }

  // ── Per-day shift override helpers (monthly dialog) ──
  private isoOf(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  toggleWeekDays(weekIndex: number) {
    if (this.expandedWeeks.has(weekIndex)) this.expandedWeeks.delete(weekIndex);
    else this.expandedWeeks.add(weekIndex);
  }

  // In-month days of a week (overrides only apply within the selected month).
  weekDays(week: { start: Date; end: Date }): Date[] {
    if (!this.selectedMonth) return [];
    const m = this.selectedMonth.getMonth();
    const y = this.selectedMonth.getFullYear();
    const days: Date[] = [];
    for (let d = new Date(week.start); d <= week.end; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() === m && d.getFullYear() === y) days.push(new Date(d));
    }
    return days;
  }

  // Effective shift shown for a day = its override, else the week's shift.
  dayShiftValue(day: Date, weekIndex: number): number | null {
    const iso = this.isoOf(day);
    const ov = this.dayOverrideMap[iso];
    return (ov ?? this.weekShiftMap[weekIndex]) ?? null;
  }

  onDayShiftChange(day: Date, weekIndex: number, shiftId: number | null) {
    const iso = this.isoOf(day);
    // Same as the week's shift (or cleared) → not an override.
    if (!shiftId || shiftId === this.weekShiftMap[weekIndex]) delete this.dayOverrideMap[iso];
    else this.dayOverrideMap[iso] = shiftId;
  }

  isDayOverridden(day: Date, weekIndex: number): boolean {
    const iso = this.isoOf(day);
    const ov = this.dayOverrideMap[iso];
    return ov != null && ov !== this.weekShiftMap[weekIndex];
  }

  isDayLocked(day: Date, weekIndex: number): boolean {
    if (this.isMonthLocked || this.lockedWeeks.has(weekIndex)) return true;
    // POSTEDIT: only upcoming days are editable.
    if (this.editMode === 'POSTEDIT') {
      const d = new Date(day); d.setHours(0, 0, 0, 0);
      const t = new Date(); t.setHours(0, 0, 0, 0);
      if (d < t) return true;
    }
    return false;
  }

  loadExistingDailyShifts(employeeId: number, from: Date, to: Date) {
    return this.service.getDailyShiftsForRange({
      employeeId,
      from: from.toISOString(),
      to: to.toISOString()
    });
  }


  setMonthLimits() {
    const today = new Date();

    // ❌ block future beyond next month
    this.maxMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // ✅ allow ANY past month → no minDate
    this.minMonth = null as any;
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
  buildExecutiveRotation() {
    // business-defined order (includes ALL shifts)
    this.executiveRotationOrder = this.executiveShifts.map(s => s.id);
  }


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
  selectedMonth!: Date;

  weeks: { start: Date; end: Date }[] = [];
  weekShiftMap: { [weekIndex: number]: number | null } = {};
  executiveShiftMeta: {
    id: number;
    name: string;
    isNight: boolean;
    isSixHour: boolean;
  }[] = [];
  rotatableShiftIds: number[] = [];   // all exec shifts except 6H
  sixHourShiftIds: number[] = [];

  sixHourUsedBeforeMonth = false;

  buildExecutiveShiftMeta() {
    this.executiveShiftMeta = this.executiveShifts.map(s => {
      const meta = this.getShiftMeta(s);
      return {
        id: s.id,
        name: s.name,
        isNight: meta.isNight,
        isSixHour: meta.isSixHour
      };
    });

    this.sixHourShiftIds = this.executiveShiftMeta
      .filter(s => s.isSixHour)
      .map(s => s.id);

    // ❗ rotation excludes 6H shifts
    this.rotatableShiftIds = this.executiveShiftMeta
      .filter(s => !s.isSixHour)
      .map(s => s.id);
  }
  getPrevMonth(month: Date) {
    const d = new Date(month.getFullYear(), month.getMonth(), 1);
    d.setMonth(d.getMonth() - 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }

  getShiftIdsInOrder(
    weekShifts?: Record<number, number>
  ): number[] {
    if (!weekShifts) return [];

    return Object.keys(weekShifts)
      .map(k => Number(k))
      .sort((a, b) => a - b)
      .map(k => weekShifts[k])
      .filter((id): id is number => id != null);
  }

  getWeeksInMonth(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    // Sunday of first week
    const firstWeekStart = new Date(monthStart);
    firstWeekStart.setDate(monthStart.getDate() - monthStart.getDay());

    let weeks = 0;
    let current = new Date(firstWeekStart);

    while (current <= monthEnd) {
      weeks++;
      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }


  // onMonthSelected() {
  //   this.generateWeeks();

  //   const employeeId = this.requestEmployees[0].id;
  //   const month = this.selectedMonth.getMonth() + 1;
  //   const year = this.selectedMonth.getFullYear();

  //   // reset state
  //   this.usedRotationShiftIds.clear();
  //   this.usedShiftIdsInCurrentMonth.clear();
  //   this.sixHourUsed = false;
  //   this.lastShiftMeta = null;

  //   // load CURRENT month
  //   this.service.getMonthlyShiftForEmployee({ employeeId, month, year })
  //     .subscribe(curr => {
  //       if (curr.isMonthAssigned) {
  //         this.weekShiftMap = { ...curr.weekShifts };
  //         this.isMonthLocked = true;
  //         return;
  //       }

  //       this.weekShiftMap = {};
  //       this.isMonthLocked = false;

  //       const prev = this.getPrevMonth(this.selectedMonth);
  //       const prevMonthDate = new Date(prev.year, prev.month - 1, 1);

  //       const weeksInPrevMonth = this.getWeeksInMonth(prevMonthDate);
  //       const carryForward = weeksInPrevMonth % this.ROTATION_SIZE;
  //       console.log(weeksInPrevMonth)

  //       this.service.getMonthlyShiftForEmployee({
  //         employeeId,
  //         month: prev.month,
  //         year: prev.year
  //       }).subscribe(prevRes => {
  //         if (!prevRes?.weekShifts) return;

  //         this.seedRotationFromPreviousMonth(prevRes.weekShifts, carryForward);
  //       });

  //     });
  // }
  getWeekDefaultDate(week: { start: Date; end: Date }): Date {
    const selectedMonth = this.selectedMonth.getMonth();
    const selectedYear = this.selectedMonth.getFullYear();

    // Find first date of this week inside the selected month
    for (
      let d = new Date(week.start);
      d <= week.end;
      d.setDate(d.getDate() + 1)
    ) {
      if (
        d.getMonth() === selectedMonth &&
        d.getFullYear() === selectedYear
      ) {
        return new Date(d);
      }
    }

    // fallback: month start
    return new Date(selectedYear, selectedMonth, 1);
  }
  trackByWeek = (_: number, w: any) =>
    `${w.start.toISOString()}-${this.selectedMonth?.getMonth()}`;

  // getWeekSelectableRange(week: { start: Date; end: Date }) {
  //   const year = this.selectedMonth.getFullYear();
  //   const month = this.selectedMonth.getMonth();

  //   const monthStart = new Date(year, month, 1);
  //   const monthEnd = new Date(year, month + 1, 0);

  //   const min = new Date(Math.max(week.start.getTime(), monthStart.getTime()));
  //   const max = new Date(Math.min(week.end.getTime(), monthEnd.getTime()));

  //   // 🔒 SAFETY: if invalid range, lock it
  //   if (min > max) {
  //     return { min: null, max: null };
  //   }

  //   return { min, max };
  // }
  // getWeekSelectableRange(week: { start: Date; end: Date }) {
  //   const year = this.selectedMonth.getFullYear();
  //   const month = this.selectedMonth.getMonth();

  //   const monthStart = new Date(year, month, 1);
  //   const monthEnd = new Date(year, month + 1, 0);

  //   const min = new Date(Math.max(week.start.getTime(), monthStart.getTime()));
  //   const max = new Date(Math.min(week.end.getTime(), monthEnd.getTime()));

  //   // If week doesn't intersect month, lock to month start
  //   if (min > max) {
  //     return { min: monthStart, max: monthStart };
  //   }

  //   return { min, max };
  // }

  getWeekSelectableRange(week: { start: Date; end: Date }) {
    if (!this.selectedMonth) {
      return { min: null, max: null };
    }

    const year = this.selectedMonth.getFullYear();
    const month = this.selectedMonth.getMonth();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    let minTime = Math.max(week.start.getTime(), monthStart.getTime());
    let maxTime = Math.min(week.end.getTime(), monthEnd.getTime());

    let min = new Date(minTime);
    let max = new Date(maxTime);

    // 🔑 normalize times
    min.setHours(0, 0, 0, 0);
    max.setHours(23, 59, 59, 999);

    return { min, max };
  }


  async onMonthSelected() {
    this.generateWeeks();



    const employeeId = this.requestEmployees[0].id;
    const month = this.selectedMonth.getMonth() + 1;
    const year = this.selectedMonth.getFullYear();



    // reset state
    this.weekShiftMap = {};
    this.dayOverrideMap = {};
    this.expandedWeeks.clear();
    this.usedRotationShiftIds.clear();
    this.usedShiftIdsInCurrentMonth.clear();
    this.sixHourUsed = false;
    this.lastShiftMeta = null;
    this.isMonthLocked = false;
    this.weekOffDateMap = {};
    this.lockedWeeks.clear();
    this.editingApprovalId = null;
    this.editMode = null;
    this.editLockNote = '';

    const rangeStart = this.weeks[0].start;
    const rangeEnd = this.weeks[this.weeks.length - 1].end;

    // this.service.getDailyShiftsForRange({
    //   employeeId,
    //   from: rangeStart.toISOString(),
    //   to: rangeEnd.toISOString()
    // }).subscribe(dailyShifts => {

    //   this.weeks.forEach((week, index) => {
    //     const shiftsInWeek = dailyShifts.filter((ds: any) => {
    //       const d = new Date(ds.date);
    //       return d >= week.start && d <= week.end;
    //     });

    //     if (shiftsInWeek.length > 0) {
    //       // 🔒 lock week
    //       this.lockedWeeks.add(index);

    //       // 🟢 auto-fill using first shift (all must be same)
    //       this.weekShiftMap[index] = shiftsInWeek[0].shiftId;

    //       // 🔁 update rotation state
    //       const shift = this.executiveShifts.find(
    //         s => s.id === shiftsInWeek[0].shiftId
    //       );
    //       if (shift) {
    //         const meta = this.getShiftMeta(shift);
    //         this.usedRotationShiftIds.add(shift.id);
    //         this.lastShiftMeta = meta;
    //         if (meta.isSixHour) this.sixHourUsed = true;
    //       }
    //     }
    //   });
    // });


    // 🔒 Load CURRENT month
    if (!this.isCorrectionMonth(month, year)) {
      console.log('jan')
      this.service.getDailyShiftsForRange({
        employeeId,
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString()
      }).subscribe(dailyShifts => {

        this.weeks.forEach((week, index) => {
          const shiftsInWeek = dailyShifts.filter((ds: any) => {
            const d = new Date(ds.date);
            return d >= week.start && d <= week.end;
          });

          if (shiftsInWeek.length > 0) {
            // 🟢 auto-fill using first shift
            this.weekShiftMap[index] = shiftsInWeek[0].shiftId;

            // 🔒 lock only PAST weeks — an assigned but still-upcoming week must
            // stay editable (otherwise editing an approved month locks everything).
            if (this.isPastWeekDate(week)) {
              this.lockedWeeks.add(index);
            }

            // 🔁 update rotation state
            const shift = this.executiveShifts.find(
              s => s.id === shiftsInWeek[0].shiftId
            );
            if (shift) {
              const meta = this.getShiftMeta(shift);
              this.usedRotationShiftIds.add(shift.id);
              this.lastShiftMeta = meta;
              if (meta.isSixHour) this.sixHourUsed = true;
            }
          }
        });
      });
    }

    const curr = await this.service.getMonthlyShiftForEmployee({
      employeeId,
      month,
      year
    }).toPromise();

    // An existing monthly request (approved OR still pending) → load it. Whether
    // it's editable or read-only is decided by the backend editability check.
    if (curr?.approvalId) {
      this.weekShiftMap = { ...(curr.weekShifts || {}) };
      this.dayOverrideMap = { ...(curr.dayOverrides || {}) };
      const weekOffConfig = curr.weekOffConfig;
      if (weekOffConfig?.weeks) {
        const weeksConfig = weekOffConfig.weeks;
        Object.keys(weeksConfig).forEach(k => {
          const weekIndex = Number(k);
          const dayOfWeek = weeksConfig[weekIndex];
          const week = this.weeks[weekIndex];
          if (!week) return;
          const resolved = this.resolveWeekOffDate(
            week,
            dayOfWeek,
            this.selectedMonth.getMonth(),
            this.selectedMonth.getFullYear()
          );
          if (resolved) this.weekOffDateMap[weekIndex] = resolved;
        });
      }

      // Editable? (creator, in-flight or HR-granted post-approval; month not locked)
      const ed = await this.service.getMonthlyRequestEditability(curr.approvalId).toPromise();
      if (ed?.editable) {
        this.isMonthLocked = false;             // unlock the dialog for editing
        this.editingApprovalId = curr.approvalId;
        this.editMode = ed.mode;
        this.editLockNote = ed.mode === 'POSTEDIT' ? 'Editing — past weeks are locked.' : '';
        if (ed.mode === 'POSTEDIT') {
          // Only upcoming weeks may change — lock the past ones.
          this.weeks.forEach((w, i) => { if (this.isPastWeekDate(w)) this.lockedWeeks.add(i); });
        }
      } else {
        this.isMonthLocked = true;              // read-only
        this.editingApprovalId = null;
        this.editMode = null;
        this.editLockNote =
          ed?.monthLocked ? 'This month is closed by HR — no edits allowed.'
          : ed?.editStatus === 'REQUESTED' ? 'Edit requested — waiting for HR approval.'
          : ed?.status === 'APPROVED' ? 'This plan is approved. Use "Request Edit" in Shift Requests to change upcoming weeks.'
          : 'This month is already assigned and cannot be edited.';
      }
      return;
    }

    this.editingApprovalId = null;
    this.editMode = null;
    this.editLockNote = '';

    // 🔑 CALCULATE TRUE CYCLE PROGRESS
    const cycleProgress =
      await this.getCycleProgressBeforeMonth(employeeId, this.selectedMonth);

    // 🔁 Load PREVIOUS month ONLY for carry-forward
    const prev = this.getPrevMonth(this.selectedMonth);

    const prevRes = await this.service.getMonthlyShiftForEmployee({
      employeeId,
      month: prev.month,
      year: prev.year
    }).toPromise();

    if (prevRes?.weekShifts) {
      this.seedRotationFromPreviousMonth(prevRes.weekShifts, cycleProgress);
    }
  }


  // generateWeeks() {
  //   this.weeks = [];
  //   this.weekShiftMap = {};

  //   const year = this.selectedMonth.getFullYear();
  //   const month = this.selectedMonth.getMonth();

  //   const monthStart = new Date(year, month, 1);
  //   const monthEnd = new Date(year, month + 1, 0);

  //   // Sunday of first week
  //   const firstWeekStart = new Date(monthStart);
  //   firstWeekStart.setDate(monthStart.getDate() - monthStart.getDay());

  //   let current = new Date(firstWeekStart);

  //   while (current <= monthEnd) {
  //     const weekStart = new Date(current);
  //     const weekEnd = new Date(current);
  //     weekEnd.setDate(weekEnd.getDate() + 6);

  //     this.weeks.push({
  //       start: new Date(weekStart),
  //       end: new Date(weekEnd)
  //     });

  //     current.setDate(current.getDate() + 7);
  //   }
  // }

  //   generateWeeks() {
  //   this.weeks = [];
  //   this.weekShiftMap = {};
  //   this.weekSelectableRanges = [];

  //   const year = this.selectedMonth.getFullYear();
  //   const month = this.selectedMonth.getMonth();

  //   const monthStart = new Date(year, month, 1);
  //   const monthEnd = new Date(year, month + 1, 0);

  //   const firstWeekStart = new Date(monthStart);
  //   firstWeekStart.setDate(monthStart.getDate() - monthStart.getDay());

  //   let current = new Date(firstWeekStart);

  //   while (current <= monthEnd) {
  //     const weekStart = new Date(current);
  //     const weekEnd = new Date(current);
  //     weekEnd.setDate(weekEnd.getDate() + 6);

  //     this.weeks.push({
  //       start: new Date(weekStart),
  //       end: new Date(weekEnd)
  //     });

  //     let minTime = Math.max(weekStart.getTime(), monthStart.getTime());
  //     let maxTime = Math.min(weekEnd.getTime(), monthEnd.getTime());

  //     const min = new Date(minTime);
  //     const max = new Date(maxTime);

  //     min.setHours(0, 0, 0, 0);
  //     max.setHours(23, 59, 59, 999);

  //     this.weekSelectableRanges.push({ min, max });

  //     current.setDate(current.getDate() + 7);
  //   }
  // }
  generateWeeks() {
    this.weeks = [];
    this.weekShiftMap = {};
    this.weekSelectableRanges = [];
    this.weekDefaultDates = [];

    const year = this.selectedMonth.getFullYear();
    const month = this.selectedMonth.getMonth();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const firstWeekStart = new Date(monthStart);
    firstWeekStart.setDate(monthStart.getDate() - monthStart.getDay());

    let current = new Date(firstWeekStart);

    while (current <= monthEnd) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);

      this.weeks.push({
        start: new Date(weekStart),
        end: new Date(weekEnd)
      });

      // ----- min/max -----
      let minTime = Math.max(weekStart.getTime(), monthStart.getTime());
      let maxTime = Math.min(weekEnd.getTime(), monthEnd.getTime());

      const min = new Date(minTime);
      const max = new Date(maxTime);

      min.setHours(0, 0, 0, 0);
      max.setHours(23, 59, 59, 999);

      this.weekSelectableRanges.push({ min, max });

      // ----- default date -----
      this.weekDefaultDates.push(
        this.calculateWeekDefaultDate(weekStart, weekEnd, month, year)
      );

      current.setDate(current.getDate() + 7);
    }

    // Precompute the (stable) in-month day list per week for the override UI.
    this.weekDaysMap = {};
    this.weeks.forEach((w, i) => { this.weekDaysMap[i] = this.weekDays(w); });
  }

  trackByDay(_i: number, d: Date): number { return d.getTime(); }
  calculateWeekDefaultDate(
    weekStart: Date,
    weekEnd: Date,
    selectedMonth: number,
    selectedYear: number
  ): Date {
    for (
      let d = new Date(weekStart);
      d <= weekEnd;
      d.setDate(d.getDate() + 1)
    ) {
      if (
        d.getMonth() === selectedMonth &&
        d.getFullYear() === selectedYear
      ) {
        const result = new Date(d);
        result.setHours(0, 0, 0, 0);
        return result;
      }
    }

    return new Date(selectedYear, selectedMonth, 1);
  }


  submitMonthlyRequest() {
    if (this.isMonthLocked) return;
    // const payload = {
    //   employeeId: this.requestEmployees[0].id,
    //   month: this.selectedMonth.getMonth() + 1,
    //   year: this.selectedMonth.getFullYear(),
    //   weekShifts: this.weekShiftMap
    // };
    this.monthlySubmitting = true;
    const filteredWeekShifts: any = {};

    Object.keys(this.weekShiftMap).forEach(k => {
      const idx = Number(k);
      if (!this.lockedWeeks.has(idx)) {
        filteredWeekShifts[idx] = this.weekShiftMap[idx];
      }
    });

    const weekOffWeeks: Record<number, number> = {};

    Object.keys(this.weekOffDateMap).forEach(k => {
      const idx = Number(k);
      const date = this.weekOffDateMap[idx];

      if (
        date instanceof Date &&
        !this.lockedWeeks.has(idx)
      ) {
        weekOffWeeks[idx] = date.getDay(); // 🔑 Sun=0 ... Sat=6
      }
    });
    // Per-day overrides — only real overrides (differ from the week shift) whose
    // week isn't locked. Backend additionally drops past days on POSTEDIT.
    const firstWeekStart = this.weeks.length ? new Date(this.weeks[0].start) : null;
    const dayOverrides: Record<string, number> = {};
    Object.keys(this.dayOverrideMap).forEach(iso => {
      const shiftId = this.dayOverrideMap[iso];
      if (!shiftId || !firstWeekStart) return;
      const d = new Date(`${iso}T00:00:00`);
      const weekIndex = Math.floor((d.getTime() - firstWeekStart.getTime()) / (7 * 86400000));
      if (this.lockedWeeks.has(weekIndex)) return;
      if (shiftId === this.weekShiftMap[weekIndex]) return; // no longer an override
      dayOverrides[iso] = shiftId;
    });

    const payload = {
      employeeId: this.requestEmployees[0].id,
      month: this.selectedMonth.getMonth() + 1,
      year: this.selectedMonth.getFullYear(),
      weekShifts: filteredWeekShifts,
      dayOverrides: Object.keys(dayOverrides).length ? dayOverrides : undefined,
      weekOffConfig: Object.keys(weekOffWeeks).length
        ? { weeks: weekOffWeeks }
        : null
    };


    const req$ = this.editingApprovalId
      ? this.service.editMonthlyRequest(this.editingApprovalId, payload)
      : this.service.requestMonthlyShift(payload);

    req$.subscribe({
      next: () => {
        this.monthlySubmitting = false;
        this.requestVisible = false;
        this.editingApprovalId = null;
        this.editMode = null;
        this.load();
      },
      error: (err) => {
        this.monthlySubmitting = false;
        this.showError(
          this.editingApprovalId ? 'Edit Failed' : 'Request Failed',
          err?.error?.error || err?.error?.message || 'Failed to submit monthly shift request'
        );
      }
    });
  }

  // A week is "past" only once it has fully ENDED (its end date is before today),
  // so the current + future weeks stay editable (mirrors the backend).
  private isPastWeekDate(week: { end?: Date }): boolean {
    console.log('checking past week', week);
    if (!week?.end) return false;
    const e = new Date(week.end); e.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return e < t;
  }

  getShiftMeta(shift: any) {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    let diff = end.getTime() - start.getTime();
    if (diff < 0) diff += 24 * 60 * 60 * 1000;

    const hours = diff / (1000 * 60 * 60);

    return {
      durationHours: hours,
      isNight: hours >= 11.5,
      isSixHour: hours <= 6.5
    };
  }

  validateExecutiveRotation(): boolean {
    const shifts = this.executiveShifts;
    const items = this.patternItems;

    const used = new Set<number>();
    let sixHourUsed = false;

    for (let i = 0; i < items.length; i++) {
      const currId = items[i].shiftId;
      if (!currId) continue;

      const currShift = shifts.find(s => s.id === currId);
      const currMeta = this.getShiftMeta(currShift);

      const prevId = i > 0 ? items[i - 1].shiftId : null;
      const prevShift = prevId ? shifts.find(s => s.id === prevId) : null;
      const prevMeta = prevShift ? this.getShiftMeta(prevShift) : null;

      // ❌ No consecutive same shift
      if (prevId && currId === prevId) {
        alert('Same shift cannot be assigned consecutively');
        return false;
      }

      // ❌ After night → must be 6H
      if (prevMeta?.isNight && !currMeta.isSixHour) {
        alert('After a night shift, only one 6-hour shift is allowed');
        return false;
      }

      // ❌ 6H rules
      if (currMeta.isSixHour) {
        if (sixHourUsed) {
          alert('Only one 6-hour shift is allowed per rotation');
          return false;
        }

        if (!prevMeta?.isNight) {
          alert('6-hour shift is allowed only after a night shift');
          return false;
        }

        sixHourUsed = true;
      }

      // ❌ No repeat before full rotation
      if (used.has(currId) && used.size < shifts.length) {
        alert('Shift cannot repeat before all shifts are completed');
        return false;
      }

      used.add(currId);
    }

    return true;
  }

  validateMonthlyExecutiveRotation(): boolean {
    const shifts = this.executiveShifts;

    const orderedShiftIds = Object.keys(this.weekShiftMap)
      .sort((a, b) => Number(a) - Number(b))
      .map(k => this.weekShiftMap[Number(k)])
      .filter(Boolean);

    const used = new Set<number>();
    let sixHourUsed = false;

    for (let i = 0; i < orderedShiftIds.length; i++) {
      const currId = orderedShiftIds[i];
      if (currId == null) continue; // ✅ type guard
      const currShift = shifts.find(s => s.id === currId);
      if (!currShift) continue;

      const currMeta = this.getShiftMeta(currShift);

      const prevId = i > 0 ? orderedShiftIds[i - 1] : null;
      const prevShift = prevId ? shifts.find(s => s.id === prevId) : null;
      const prevMeta = prevShift ? this.getShiftMeta(prevShift) : null;

      // ❌ No consecutive same shift
      if (prevId && currId === prevId) {
        this.showError(
          'Invalid Rotation',
          'Same shift cannot be assigned in consecutive weeks'
        );
        return false;
      }

      // ❌ After night → must be 6H
      if (prevMeta?.isNight && !currMeta.isSixHour) {
        this.showError(
          'Invalid Rotation',
          'After a night shift, the next week must be a 6-hour shift'
        );
        return false;
      }

      // ❌ 6H rules
      if (currMeta.isSixHour) {
        if (sixHourUsed) {
          this.showError(
            'Invalid Rotation',
            'Only one 6-hour shift is allowed in a month'
          );
          return false;
        }

        if (!prevMeta?.isNight) {
          this.showError(
            'Invalid Rotation',
            '6-hour shift is allowed only after a night shift'
          );
          return false;
        }

        sixHourUsed = true;
      }

      // ❌ No repeat before full rotation
      if (used.has(currId) && used.size < shifts.length) {
        this.showError(
          'Invalid Rotation',
          'Shift cannot repeat until all shifts are rotated'
        );
        return false;
      }

      used.add(currId);
    }

    return true;
  }
  showRemainingError() {
    const remaining = this.getRemainingRotationQueue()
      .map(id => {
        const s = this.executiveShifts.find(x => x.id === id)!;
        return `${s.name} (${this.formatTime(s.startTime)}–${this.formatTime(s.endTime)})`;
      })
      .join(', ');

    this.showError(
      'Invalid Rotation',
      `Complete remaining shifts first: ${remaining}`
    );
  }

  showError(summary: string, detail: string) {
    this.messageService.add({
      severity: 'error',
      summary,
      detail,
      life: 5000
    });
  }
  onWeekShiftChange(weekIndex: number, shiftId: number) {
    const shift = this.executiveShifts.find(s => s.id === shiftId)!;
    const meta = this.getShiftMeta(shift);

    // Rotation rules gated behind the flag (currently OFF) → any shift, any week.
    if (this.enforceRotationRules) {
    const remaining = this.getRemainingRotationQueue();

    /* -------------------------------
     1️⃣ must finish remaining rotation first
    --------------------------------*/
    if (remaining.length > 0 && !remaining.includes(shiftId)) {
      this.showRemainingError();
      this.weekShiftMap[weekIndex] = null;
      return;
    }

    /* -------------------------------
     2️⃣ block duplicate in SAME MONTH
    --------------------------------*/
    console.log(this.usedShiftIdsBeforeMonth.has(shiftId), this.usedShiftIdsInCurrentMonth.has(shiftId))
    if (this.usedShiftIdsInCurrentMonth.has(shiftId)) {
      this.showError(
        'Invalid Rotation',
        'This shift is already used in this month'
      );
      this.weekShiftMap[weekIndex] = null;
      return;
    }

    /* -------------------------------
     3️⃣ night → must be 6H
    --------------------------------*/
    if (this.lastShiftMeta?.isNight && !meta.isSixHour) {
      this.showError(
        'Invalid Rotation',
        'After a night shift, only a 6-hour shift is allowed'
      );
      this.weekShiftMap[weekIndex] = null;
      return;
    }

    /* -------------------------------
     4️⃣ 6H rules
    --------------------------------*/
    if (meta.isSixHour) {
      if (this.sixHourUsed) {
        this.showError(
          'Invalid Rotation',
          'Only one 6-hour shift is allowed per cycle'
        );
        this.weekShiftMap[weekIndex] = null;
        return;
      }

      if (!this.lastShiftMeta?.isNight) {
        this.showError(
          'Invalid Rotation',
          '6-hour shift is allowed only after a night shift'
        );
        this.weekShiftMap[weekIndex] = null;
        return;
      }

      this.sixHourUsed = true;
    }
    } // end if (enforceRotationRules)

    /* -------------------------------
     ✅ ACCEPT SHIFT
    --------------------------------*/
    this.usedRotationShiftIds.add(shiftId);
    this.usedShiftIdsInCurrentMonth.add(shiftId);
    this.lastShiftMeta = meta;

    /* -------------------------------
     🔁 RESET CYCLE (NOT MONTH)
    --------------------------------*/
    if (this.isRotationCycleComplete()) {
      this.resetRotationCycle(); // clears usedRotationShiftIds + sixHourUsed
    }
  }
  getOrderedShiftIds(weekShifts: Record<number, number>): number[] {
    return Object.keys(weekShifts)
      .map(k => Number(k))
      .sort((a, b) => a - b)
      .map(k => weekShifts[k])
      .filter((id): id is number => id != null);
  }
  async getCycleProgressBeforeMonth(
    employeeId: number,
    selectedMonth: Date
  ): Promise<number> {

    let totalWeeksAssigned = 0;

    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;

    // 🔁 iterate backwards until no data
    for (let y = year, m = month - 1; y >= 2000;) {
      if (m === 0) {
        m = 12;
        y--;
      }

      const res = await this.service.getMonthlyShiftForEmployee({
        employeeId,
        month: m,
        year: y
      }).toPromise();

      if (!res?.weekShifts) break;

      totalWeeksAssigned += Object.keys(res.weekShifts).length;
      m--;
    }

    return totalWeeksAssigned % this.ROTATION_SIZE;
  }


  seedRotationFromPreviousMonth(
    weekShifts: Record<number, number>,
    cycleProgress: number
  ) {
    this.usedRotationShiftIds.clear();
    this.usedShiftIdsInCurrentMonth.clear();
    this.sixHourUsed = false;
    this.lastShiftMeta = null;

    if (cycleProgress === 0) return;

    const orderedShiftIds = this.getOrderedShiftIds(weekShifts);

    // 🔑 ONLY last `cycleProgress` weeks matter
    const carryForward = orderedShiftIds.slice(-cycleProgress);

    for (const shiftId of carryForward) {
      const shift = this.executiveShifts.find(s => s.id === shiftId);
      if (!shift) continue;

      const meta = this.getShiftMeta(shift);

      this.usedRotationShiftIds.add(shiftId);
      this.lastShiftMeta = meta;

      if (meta.isSixHour) {
        this.sixHourUsed = true;
      }
    }
  }









  validateUpToWeek(maxIndex: number): boolean {
    const orderedShiftIds: number[] = Object.keys(this.weekShiftMap)
      .map(k => Number(k))
      .filter(k => k <= maxIndex)
      .sort((a, b) => a - b)
      .map(k => this.weekShiftMap[k])
      .filter((id): id is number => id !== null);

    let prevMeta = this.lastAssignedShiftMeta;
    const used = new Set<number>(this.usedShiftIdsBeforeMonth);
    let sixHourUsed = false;

    for (const currId of orderedShiftIds) {
      const currShift = this.executiveShifts.find(s => s.id === currId)!;
      const currMeta = this.getShiftMeta(currShift);

      if (prevMeta) {
        if (prevMeta.isNight && !currMeta.isSixHour) {
          this.showError(
            'Invalid Rotation',
            'After a night shift, only a 6-hour shift is allowed'
          );
          return false;
        }
      }

      if (currMeta.isSixHour) {
        if (sixHourUsed) {
          this.showError(
            'Invalid Rotation',
            'Only one 6-hour shift allowed per rotation'
          );
          return false;
        }
        if (!prevMeta?.isNight) {
          this.showError(
            'Invalid Rotation',
            '6-hour shift allowed only after a night shift'
          );
          return false;
        }
        sixHourUsed = true;
      }

      if (used.has(currId) && used.size < this.executiveShifts.length) {
        this.showError(
          'Invalid Rotation',
          'Shift cannot repeat until all shifts are rotated'
        );
        return false;
      }

      used.add(currId);
      prevMeta = currMeta;
    }

    return true;
  }

  getRemainingRotatableShifts(): number[] {
    return this.rotatableShiftIds.filter(
      id => !this.usedShiftIdsBeforeMonth.has(id)
    );
  }
  getRemainingRotationQueue(): number[] {
    return this.executiveRotationOrder.filter(
      id => !this.usedRotationShiftIds.has(id)
    );
  }




  formatRemainingShifts(shifts: any[]): string {
    return shifts
      .map(s =>
        `${s.name} (${this.formatTime(s.startTime)}–${this.formatTime(s.endTime)})`
      )
      .join(', ');
  }


  validateMonthlyExecutiveRotationUpTo(maxIndex: number): boolean {
    const orderedShiftIds: number[] = Object.keys(this.weekShiftMap)
      .map(k => Number(k))
      .filter(k => k <= maxIndex)
      .sort((a, b) => a - b)
      .map(k => this.weekShiftMap[k])
      .filter((id): id is number => id !== null);

    const rotationSet = new Set(this.executiveRotationShiftIds);

    const used = new Set<number>(this.usedShiftIdsBeforeMonth);
    let prevMeta = this.lastAssignedShiftMeta;

    let nightUsed = [...used].some(id =>
      this.getShiftMeta(this.executiveShifts.find(s => s.id === id)!).isNight
    );

    let sixHourUsed = [...used].some(id =>
      this.getShiftMeta(this.executiveShifts.find(s => s.id === id)!).isSixHour
    );

    for (const currId of orderedShiftIds) {
      const shift = this.executiveShifts.find(s => s.id === currId)!;
      const meta = this.getShiftMeta(shift);

      // ❌ No consecutive same shift (cross-month)
      if (this.lastAssignedShiftId === currId && used.size === this.usedShiftIdsBeforeMonth.size) {
        // this.showError('Invalid Rotation', 'Shift cannot continue from previous month');
        // const remaining = this.getRemainingRotatableShifts(used);

        // this.showError(
        //   'Invalid Rotation',
        //   `Previous month rotation is incomplete. Remaining shifts: ${this.formatRemainingShifts(remaining)}`
        // );
        return false;
      }

      // ❌ 6H rules
      if (meta.isSixHour) {
        if (sixHourUsed) {
          this.showError('Invalid Rotation', 'Only one 6-hour shift is allowed');
          return false;
        }
        if (!prevMeta?.isNight) {
          this.showError(
            'Invalid Rotation',
            '6-hour shift is allowed only after a night shift'
          );
          return false;
        }
        sixHourUsed = true;
      }

      // ❌ Night shift rules
      if (meta.isNight) {
        if (nightUsed) {
          this.showError(
            'Invalid Rotation',
            'Night shift can be assigned only once in a cycle'
          );
          return false;
        }
      }

      // ❌ No repeat before full rotation
      if (
        used.has(currId) &&
        [...rotationSet].some(id => !used.has(id))
      ) {
        // const remaining = this.getRemainingRotationShifts(used);

        // this.showError(
        //   'Invalid Rotation',
        //   `Complete remaining shifts first: ${this.formatRemainingShifts(remaining)}`
        // );

        return false;
      }

      used.add(currId);

      if (meta.isNight) nightUsed = true;

      prevMeta = meta;
      this.lastAssignedShiftId = currId;
    }

    return true;
  }
  validateWeekSelection(weekIndex: number, shiftId: number): boolean {
    const shift = this.executiveShifts.find(s => s.id === shiftId)!;
    const meta = this.getShiftMeta(shift);
    console.log(meta)

    // ❌ same as previous month
    if (weekIndex === 0 && shiftId === this.lastAssignedShiftId) {
      this.showRemainingError();
      return false;
    }

    // ❌ night → must be 6H
    if (this.lastAssignedShiftMeta?.isNight && !meta.isSixHour) {
      this.showError(
        'Invalid Rotation',
        'After a night shift, only a 6-hour shift is allowed'
      );
      return false;
    }

    // ❌ 6-hour rules
    if (meta.isSixHour) {
      if (this.sixHourUsedBeforeMonth) {
        this.showError(
          'Invalid Rotation',
          'Only one 6-hour shift is allowed in a rotation'
        );
        return false;
      }
      if (!this.lastAssignedShiftMeta?.isNight) {
        this.showError(
          'Invalid Rotation',
          '6-hour shift is allowed only after a night shift'
        );
        return false;
      }
    }

    console.log(this.usedShiftIdsBeforeMonth, this.getRemainingRotatableShifts())

    // ❌ rotation incomplete
    if (
      this.usedShiftIdsBeforeMonth.has(shiftId) &&
      this.getRemainingRotatableShifts().length > 0
    ) {
      this.showRemainingError();
      return false;
    }

    return true;
  }


  get executiveRotationShiftIds(): number[] {
    return this.executiveShifts
      .filter(s => {
        const meta = this.getShiftMeta(s);
        return !meta.isSixHour; // ❌ exclude 6H
      })
      .map(s => s.id);
  }

  lastAssignedShiftId: number | null = null;
  lastAssignedShiftMeta: any | null = null;
  usedShiftIdsBeforeMonth = new Set<number>();


  openMonthlyDialog(emp: any) {
    this.requestEmployees = [emp];
    this.requestVisible = true;

    // 🔄 reset rotation state
    this.usedRotationShiftIds.clear();
    this.sixHourUsed = false;
    this.lastShiftMeta = null;

    // reset month state
    this.weekShiftMap = {};
    this.dayOverrideMap = {};
    this.expandedWeeks.clear();
    this.weekOffDateMap = {};
    this.isMonthLocked = false;
    this.selectedMonth = undefined!;
  }




  getAvailableShiftsForWeek(weekIndex: number) {
    // Restrictions off → every shift is selectable for every week.
    if (!this.enforceRotationRules) return this.executiveShifts;

    const remaining = this.getRemainingRotationQueue();
    const selectedForWeek = this.weekShiftMap[weekIndex];

    return this.executiveShifts.filter(shift => {
      const meta = this.getShiftMeta(shift);

      // ✅ always keep the already-selected value visible
      if (shift.id === selectedForWeek) {
        return true;
      }

      // ❌ hide 6H if already used (cross-month + current month)
      if (meta.isSixHour && this.sixHourUsed) {
        return false;
      }

      console.log(remaining, shift.id, this.usedRotationShiftIds)
      if (remaining.length === 0) {
        this.resetRotationCycle()
      }


      // 🔒 must finish remaining rotation first
      if (remaining.length > 0) {
        console.log(remaining.includes(shift.id))
        return remaining.includes(shift.id);
      }


      return true;
    });
  }


  resetRotationCycle() {
    this.usedRotationShiftIds.clear();
    // Also clear the month-duplicate set so a small shift set (e.g. a nurse's
    // 6h/6h/8h) can repeat across the month's weeks instead of dead-ending once
    // every distinct shift has been used once.
    this.usedShiftIdsInCurrentMonth.clear();
    this.sixHourUsed = false;
    this.lastShiftMeta = null;
  }

  // One full rotation cycle = every non-6h shift once, plus at most one 6h shift
  // (only one 6h is allowed per cycle). Derived from the employee's actual shift
  // set rather than a hard-coded 7, so departments with fewer shifts (nurses,
  // etc.) complete a cycle and reset correctly.
  getRotationCycleSize(): number {
    if (!this.executiveShifts?.length) return 0;
    let nonSixHour = 0;
    let hasSixHour = false;
    for (const s of this.executiveShifts) {
      if (this.getShiftMeta(s).isSixHour) hasSixHour = true;
      else nonSixHour++;
    }
    return nonSixHour + (hasSixHour ? 1 : 0);
  }

  isRotationCycleComplete(): boolean {
    const size = this.getRotationCycleSize();
    return size > 0 && this.usedRotationShiftIds.size >= size;
  }


  isCorrectionMonth(month: number, year: number): boolean {
    return month === 1 && year === 2026; // January 2026 only
  }

  resetMonthlyRequestState() {
    // dialog
    this.requestVisible = false;
    this.monthlySubmitting = false;

    // employee & month
    this.requestEmployees = [];
    this.selectedMonth = undefined!;
    this.isMonthLocked = false;

    // weeks & selections
    this.weeks = [];
    this.weekDaysMap = {};
    this.weekShiftMap = {};
    this.dayOverrideMap = {};
    this.expandedWeeks.clear();
    this.weekOffDateMap = {};
    this.lockedWeeks.clear();

    // rotation runtime state
    this.usedRotationShiftIds.clear();
    this.usedShiftIdsInCurrentMonth.clear();
    this.sixHourUsed = false;
    this.lastShiftMeta = null;
  }
  // private resolveWeekOffDate(
  //   week: { start: Date; end: Date },
  //   dayOfWeek: number
  // ): Date {
  //   const d = new Date(week.start);
  //   d.setDate(week.start.getDate() + dayOfWeek);
  //   return d;
  // }
  private resolveWeekOffDate(
    week: { start: Date; end: Date },
    dayOfWeek: number,
    targetMonth: number,   // 0-based (JS month)
    targetYear: number
  ): Date | null {

    console.log(week, dayOfWeek, targetMonth, targetYear);

    // candidate date based on week start
    const d = new Date(week.start);
    d.setDate(week.start.getDate() + dayOfWeek);

    // 🔒 clamp to selected month
    if (
      d.getMonth() !== targetMonth ||
      d.getFullYear() !== targetYear
    ) {
      return null;
    }

    // 🔒 clamp to week range (extra safety)
    if (d < week.start || d > week.end) {
      return null;
    }

    return d;
  }


}
