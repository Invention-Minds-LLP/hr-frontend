import { Component, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { AutoComplete } from 'primeng/autocomplete';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Employees } from '../../services/employees/employees';
import { LeavePopup } from '../../leaves/leave-popup/leave-popup';
import { WfhPopup } from '../../leaves/wfh-popup/wfh-popup';
import { PermissionPopup } from '../../leaves/permission-popup/permission-popup';
import { Holiday, Holidays } from '../../services/holidays/holidays';
import { CarouselModule } from 'primeng/carousel';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ResignationForm } from "../../resignation/resignation-form/resignation-form";
import { GrievanceList } from "../../grievance/grievance-list/grievance-list";
import { PoshList } from "../../posh/posh-list/posh-list";
import { MyIncidents } from "../../incident/my-incidents/my-incidents";
import { Tooltip } from 'primeng/tooltip';
import { MyTests } from "../../evaluation/my-tests/my-tests";
import { TrainingList } from "../../training/training-list/training-list";
import { SurveyList } from "../../survey/survey-list/survey-list";
import { SkeletonModule, Skeleton } from 'primeng/skeleton';
import { AttendanceCalendar } from '../../services/attendance-calendar/attendance-calendar';
import { SurveryService } from '../../services/surveyService/survery-service';
import { SurveyForm } from '../../survey/survey-form/survey-form';
import { Leaves } from '../../services/leaves/leaves';
import { Permission } from '../../services/permission/permission';
import { Shifts } from '../../services/shifts/shifts';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { MyWeeklyTracker } from '../../weekly-tracker/my-weekly-tracker/my-weekly-tracker';
import { SelfAppraisalComponent } from '../../appraisal/self-appraisal/self-appraisal';
import { MyWeeklyRatings } from '../../weekly-rating/my-weekly-ratings/my-weekly-ratings';
import { SelfWeeklyRating } from '../../weekly-rating/self-weekly-rating/self-weekly-rating';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { PipService } from '../../services/pip/pip.service';
import { Dashboard } from '../../services/dashboard/dashboard';
import { Resignation } from '../../services/resignation/resignation';

interface individual {
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}


interface AttendanceDay {
  dayName: string;
  date?: Date;
  totalHours?: string;
  checkIn?: string;
  checkOut?: string;
  status?: 'Leave' | 'Day Off' | 'Present' | 'Empty' | 'Coming Up' | 'Not Started';
}

// put this in your component class
type LeaveTypeCount = { label: string; count: number; total: number };

@Component({
  selector: 'app-individual',
  imports: [TableModule, CommonModule, ButtonModule, LeavePopup, WfhPopup,
    PermissionPopup, FormsModule, FormsModule, CarouselModule, ResignationForm,
    GrievanceList, PoshList, MyIncidents, Tooltip, MyTests, TrainingList, SurveyList,
    SkeletonModule, SurveyForm, ModuleGuide, MyWeeklyTracker, SelfAppraisalComponent,
    MyWeeklyRatings, SelfWeeklyRating, DialogModule, TextareaModule],
  templateUrl: './individual.html',
  styleUrl: './individual.css'
})
export class Individual {

  leave: any[] = []
  permission: any[] = []
  wfh: any[] = []
  // Leave
  showLeaveDetailsPopup = false;
  selectedLeaveForView: any = null;
  leaveViewMode = false;

  // Permission
  showPermissionPopup = false;
  selectedPermission: any = null;
  permissionViewMode = false;

  // WFH
  showWFHPopup = false;
  selectedWFH: any = null;
  wfhViewMode = false;

  // Holidays
  nearestHoliday: { name: string; date: Date; isOptional?: boolean } | null = null;
  holidayDates: { name: string; date: Date; isOptional?: boolean }[] = [];
  allHolidays: { name: string; date: string }[] = [];

  currentIndex = 0;
  noHolidaysMessage: string = '';
  year = new Date().getFullYear();
  loading = true

  currentUserId = localStorage.getItem('empId');

  leaveByTypeToday: LeaveTypeCount[] = [];
  financialYearLabel = '';
  selectedSurvey: any = null;   // Holds the survey being taken
  showSurveyForm = false;
  defaultCover = "./default-cover.png";

  approvedWeekOffDates = new Set<string>(); // yyyy-mm-dd
  weekOffSource: 'MONTHLY_SHIFT' | 'SUNDAY_DEFAULT' = 'SUNDAY_DEFAULT';

weeklyShiftTemplates: {
  weekIndex: number;
  label: string;
  shiftId: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  fromDate: string;
  toDate: string;
}[] = [];

currentWeeklyShiftIndex = 0;



  // Called when "Take Survey" button clicked
  openSurveyForm(survey?: any) {
    this.selectedSurvey = survey || null; // optional: draft or new
    console.log('Opening survey form for:', this.selectedSurvey);
    this.showSurveyForm = true;
  }

  // Called when SurveyForm emits closeForm
  onSurveyFormClose() {
    this.showSurveyForm = false;
    this.selectedSurvey = null;

    // optional: refresh pending surveys list
    // this.loadPendingSurveys();
  }



  // ── PIP section ────────────────────────────────────────────────────────────
  myPIPs: any[] = [];
  pipLoading = false;
  pipDetailVisible = false;
  selectedPIP: any = null;
  pipResponses: any[] = [];
  pipResponsesLoading = false;
  myResponseText = '';
  myResponseSubmitting = false;
  myResponseSubmitted = false;
  logResponseVisible = false;

  // OT
  myOtRecords: any[] = [];
  otLoading = false;

  // Exit Interview
  myExitInterviews: any[] = [];
  exitInterviewLoading = false;

  constructor(private employeeService: Employees, private attendanceService: AttendanceCalendar,
    private surveyService: SurveryService, private leaveService: Leaves, private shiftService: Shifts,
    private holidaysService: Holidays, private pipService: PipService,
    private dashboardService: Dashboard, private resignationService: Resignation,
    private permissionService: Permission) { }

  // Edit/cancel allowed only while the request is fully PENDING
  // (no incharge / RM / HR action yet).
  canEditOrCancel(req: any): boolean {
    if (!req) return false;
    const status = (req.status || '').toUpperCase();
    if (status !== 'PENDING') return false;
    const ic  = (req.inChargeDecision || 'PENDING').toUpperCase();
    const hod = (req.hodDecision      || 'PENDING').toUpperCase();
    const hr  = (req.hrDecision       || 'PENDING').toUpperCase();
    return ic === 'PENDING' && hod === 'PENDING' && hr === 'PENDING';
  }

  // ── Cancel-with-reason dialog ───────────────────────────────
  cancelDialogVisible = false;
  cancelTargetType: 'leave' | 'permission' | null = null;
  cancelTargetId: number | null = null;
  cancelReason = '';
  cancelSubmitting = false;

  cancelLeave(leave: any, evt?: Event) {
    evt?.stopPropagation();
    this.openCancelDialog('leave', leave.id);
  }

  cancelPermission(perm: any, evt?: Event) {
    evt?.stopPropagation();
    this.openCancelDialog('permission', perm.id);
  }

  private openCancelDialog(type: 'leave' | 'permission', id: number) {
    this.cancelTargetType = type;
    this.cancelTargetId = id;
    this.cancelReason = '';
    this.cancelDialogVisible = true;
  }

  closeCancelDialog() {
    this.cancelDialogVisible = false;
    this.cancelTargetType = null;
    this.cancelTargetId = null;
    this.cancelReason = '';
  }

  confirmCancel() {
    if (!this.cancelTargetId || !this.cancelTargetType) return;
    if (!this.cancelReason.trim()) {
      alert('Please provide a reason for cancelling.');
      return;
    }
    this.cancelSubmitting = true;
    const id = this.cancelTargetId;
    const reason = this.cancelReason.trim();

    const request$ = this.cancelTargetType === 'leave'
      ? this.leaveService.cancelLeaveRequest(id, reason)
      : this.permissionService.cancelPermissionRequest(id, reason);

    request$.subscribe({
      next: () => {
        // Update local list optimistically so the UI reflects the change
        if (this.cancelTargetType === 'leave') {
          const row = this.leave.find((l: any) => l.id === id);
          if (row) { row.status = 'CANCELLED'; row.cancellationReason = reason; }
        } else {
          const row = this.permission.find((p: any) => p.id === id);
          if (row) { row.status = 'CANCELLED'; row.cancellationReason = reason; }
        }
        this.cancelSubmitting = false;
        this.closeCancelDialog();
      },
      error: (err: any) => {
        this.cancelSubmitting = false;
        alert(err?.error?.error || 'Failed to cancel request');
      },
    });
  }

  editLeave(leave: any, evt?: Event) {
    evt?.stopPropagation();
    this.leaveViewMode = false;   // open popup in editable mode
    this.selectedLeaveForView = leave;
    this.showLeaveDetailsPopup = true;
  }

  editPermission(perm: any, evt?: Event) {
    evt?.stopPropagation();
    this.permissionViewMode = false;
    this.selectedPermission = perm;
    this.showPermissionPopup = true;
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'cancelled':
        return 'cancelled';
      default:
        return '';
    }
  }


  today = new Date();
  selectedDate = new Date();
  weekDays: { day: string, date: Date, status: 'present' | 'absent' | 'none' | 'holiday' }[] = [];

  shiftName = 'Shift – Morning';
  weekStart!: Date;
  weekEnd!: Date;


  attendanceData: AttendanceDay[] = [];
  birthday: any[] = [];
  anniversary: any[] = [];
  loadingToday: boolean = false;

  // Attendance-card 
  attendanceRecords: { date: string, status: 'present' | 'absent' }[] = [
    { date: '2025-08-09', status: 'present' },
    { date: '2025-08-05', status: 'absent' },
    { date: '2025-08-03', status: 'present' },
    { date: '2025-08-04', status: 'present' }
  ];


  // Working-Card
  rawAttendance: any[] = [];

  employee: any = null;
  pendingSurveys: any[] = [];

  ngOnInit() {
    this.generateWeekDays();
    this.fetchDetails();
    this.loadToday();
    this.getLeaveBalance();
    this.startBirthdayAutoSlide();
    // this.startAnniversaryAutoSlide();
    this.loadWeeklyShiftTemplates();
    this.loadMyPIPs();
    this.loadMyOtRecords();
    this.loadMyExitInterviews();

    this.setWeek(new Date());
    this.loadHolidays(this.year);
    const employeeId = Number(localStorage.getItem('empId'));
    if (employeeId) {
      this.employeeService.getEmployeeById(employeeId).subscribe({
        next: (res) => {
          this.employee = res;
          setTimeout(() => {
            this.loading = false
          }, 2000)
        },
        error: (err) => {
          console.error('Error fetching employee:', err);
          this.loading = false
        }
      });
    }
  }

loadWeeklyShiftTemplates() {
  const employeeId = Number(this.currentUserId);
  if (!employeeId) return;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  this.shiftService.getEmployeeWeeklyShiftsForMonth(employeeId, month, year)
    .subscribe({
      next: (res: any) => {
        this.weeklyShiftTemplates = (res.weeks || []).map((w: any) => ({
          weekIndex: w.weekIndex,
          label: w.label,
          shiftId: w.shiftId,
          shiftName: w.shiftName,
          fromDate: w.fromDate,
          toDate:w.toDate,
          startTime: this.formatShiftDisplayTime(w.startTime),
          endTime: this.formatShiftDisplayTime(w.endTime)
        }));

        this.currentWeeklyShiftIndex = 0;
      },
      error: (err) => {
        console.error('Error fetching weekly shift templates:', err);
        this.weeklyShiftTemplates = [];
      }
    });
}
prevWeeklyShift() {
  if (this.currentWeeklyShiftIndex > 0) {
    this.currentWeeklyShiftIndex--;
  }
}

nextWeeklyShift() {
  if (this.currentWeeklyShiftIndex < this.weeklyShiftTemplates.length - 1) {
    this.currentWeeklyShiftIndex++;
  }
}
formatShiftDisplayTime(value: string | Date): string {
  if (!value) return '-';

  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';

  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
  formatShiftTime(time: string | undefined): string {
    if (!time) return '-';
    return time.length >= 5 ? time.slice(0, 5) : time;
  }

  // getLeaveBalance() {
  //   const year = new Date().getFullYear();
  //   const employeeId = Number(this.currentUserId); // logged-in user ID you already have

  //   this.leaveService.getLeaveBalance(employeeId, year)
  //     .subscribe((balances: any) => {
  //       this.leaveByTypeToday = balances.map((b: any) => ({
  //         label: b.leaveType,
  //         count: b.remaining,
  //         total: b.totalAllowed
  //       }));
  //     });
  // }
  //   getLeaveBalance() {
  //   const year = new Date().getFullYear();
  //   const employeeId = Number(this.currentUserId);

  //   this.leaveService.getLeaveBalance(employeeId, year)
  //     .subscribe((balances: any) => {

  //       const gender = this.employee?.gender?.toUpperCase() || '';

  //       // Define required order
  //       const leaveOrder = ['CL', 'SL', 'EL', 'CO', 'RH', 'Maternity Leave', 'Paternity Leave'];

  //       // Filter based on gender
  //       let filtered = balances.filter((b: any) => {
  //         if (b.leaveType === 'Maternity Leave' && gender !== 'FEMALE') return false;
  //         if (b.leaveType === 'Paternity Leave' && gender !== 'MALE') return false;
  //         return true;
  //       });

  //       // Sort based on required order
  //       filtered.sort((a: any, b: any) => {
  //         return leaveOrder.indexOf(a.leaveType) - leaveOrder.indexOf(b.leaveType);
  //       });

  //       console.log('Filtered and Sorted Leave Balances:', filtered);

  //       // Map to UI format
  //       this.leaveByTypeToday = filtered.map((b: any) => ({
  //         label: b.leaveType,
  //         count: b.remaining,
  //         total: b.totalAllowed
  //       }));
  //     });
  // }
  getLeaveBalance() {
    // const year = new Date().getFullYear();.
    const year = this.getFinancialYear(new Date());
    this.financialYearLabel = `${year}-${year + 1}`;
    const employeeId = Number(this.currentUserId);

    const calYear = new Date().getMonth() >= 3 ? year : year + 1;
    forkJoin({
      balances: this.leaveService.getLeaveBalance(employeeId, year),
      compOffCredits: this.leaveService.getCompOffCredits(employeeId),
      allLeaves: this.leaveService.getLeaves(),
      holidayData: this.holidaysService.getHolidaysByYear(calYear)
    }).subscribe(({ balances, compOffCredits, allLeaves, holidayData }: any) => {

        // const gender = this.employee?.gender?.toUpperCase() || '';
        const gender = localStorage.getItem('gender')?.toUpperCase() || '';
        console.log('Employee Gender:', gender);

        // Calculate comp off balance from credits (unused & non-expired)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const validCompOffs = (compOffCredits || []).filter((c: any) =>
          !c.used && new Date(c.expiryDate) >= today
        );
        const totalCompOffs = (compOffCredits || []).filter((c: any) => !c.used).length;

        // Correct order using DB values
        const leaveOrder = [
          'CL',
          'SL',
          'EL',
          'CO',
          'RH',
          'Maternity Leave',
          'Paternity Leave'
        ];

        // Filter based on gender and remove CO/RH from balance API (calculated separately)
        let filtered = balances.filter((b: any) => {
          if (b.leaveType === 'CO') return false;
          if (b.leaveType === 'RH') return false;
          if (b.leaveType === 'Maternity Leave' && gender !== 'FEMALE') return false;
          if (b.leaveType === 'Paternity Leave' && gender !== 'MALE') return false;
          return true;
        });

        // Sort based on order
        filtered.sort((a: any, b: any) => {
          const indexA = leaveOrder.indexOf(a.leaveType);
          const indexB = leaveOrder.indexOf(b.leaveType);
          return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        console.log('Filtered and Sorted Leave Balances:', filtered);

        this.leaveByTypeToday = filtered.map((b: any) => ({
          label: b.leaveType,
          count: b.remaining,
          total: b.totalAllowed
        }));

        // Add comp off balance at the correct position (after EL, index 3)
        const coEntry: LeaveTypeCount = {
          label: 'CO',
          count: validCompOffs.length,
          total: totalCompOffs
        };
        const coPosition = this.leaveByTypeToday.findIndex(
          (l) => leaveOrder.indexOf(l.label) > leaveOrder.indexOf('CO')
        );
        if (coPosition === -1) {
          this.leaveByTypeToday.push(coEntry);
        } else {
          this.leaveByTypeToday.splice(coPosition, 0, coEntry);
        }

        // Add RH balance (counted from optional holidays in calendar)
        const optionalHolidayCount = ((holidayData?.holidays || []) as any[]).filter((h: any) => h.isOptional).length;
        const rhUsed = (allLeaves || []).filter((l: any) =>
          (l.employee?.id === employeeId || l.employeeId === employeeId) &&
          l.leaveType?.name === 'RH' &&
          (l.status === 'PENDING' || l.status === 'APPROVED')
        ).length;
        const rhAllowed = 2;
        const rhEntry: LeaveTypeCount = {
          label: 'RH',
          count: Math.max(0, rhAllowed - rhUsed),
          total: rhAllowed
        };
        const rhPosition = this.leaveByTypeToday.findIndex(
          (l) => leaveOrder.indexOf(l.label) > leaveOrder.indexOf('RH')
        );
        if (rhPosition === -1) {
          this.leaveByTypeToday.push(rhEntry);
        } else {
          this.leaveByTypeToday.splice(rhPosition, 0, rhEntry);
        }
      });
  }


  loadToday(): void {
    this.employeeService.getToday()
      .pipe(finalize(() => (this.loadingToday = false)))
      .subscribe({
        next: ({ birthdays, anniversaries }: any) => {
          this.birthday = birthdays ?? [];
          console.log(this.birthday)
          this.anniversary = anniversaries ?? [];
          console.log(this.anniversary)
        },
        error: (err) => {
          console.error('getToday failed', err);
          // this.errorToday = "Couldn't load today's celebrants.";
          this.birthday = [];
          this.anniversary = [];
        },
      });

    this.surveyService.getDraftSurveys(Number(this.currentUserId)).subscribe({
      next: (res) => {
        console.log('Draft Surveys:', res);
        this.pendingSurveys = res;
      },
      error: (err) => {
        console.error('Error fetching draft surveys:', err);
      },
    });
  }
  trackById(_i: number, item: { employeeId: number }) {
    return item.employeeId;
  }

  // Holidays
  // loadHolidays(year: number) {

  //   const calendarId = 'en.indian#holiday@group.v.calendar.google.com';
  //   const apiKey = 'AIzaSyC10pxMOv55Jq8XkkDuJ_WAWG4AUUZVX9g';
  //   const today = new Date();
  //   const startDate = `${today.getFullYear()}-01-01`;
  //   const endDate = `${today.getFullYear()}-12-31`;
  //   const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${startDate}T00:00:00Z&timeMax=${endDate}T23:59:59Z&singleEvents=true&orderBy=startTime`;

  //   fetch(url)
  //     .then(res => res.json())
  //     .then(data => {
  //       this.allHolidays = data.items.map((item: any) => ({
  //         name: item.summary,
  //         date: item.start.date
  //       }));

  //       // Find nearest holiday
  //       const today = new Date();
  //       const futureHolidays = this.allHolidays
  //         .map(h => ({ ...h, time: new Date(h.date).getTime() }))
  //         .filter(h => h.time >= today.getTime())
  //         .sort((a, b) => a.time - b.time);

  //       if (futureHolidays.length) {
  //         this.allHolidays = futureHolidays;
  //         this.updateHolidayList(); // only our new method
  //       }

  //     });
  // }

  // updateHolidayList() {
  //   const today = new Date();

  //   // Keep only upcoming holidays
  //   this.holidayDates = this.allHolidays
  //     .filter(h => new Date(h.date).getTime() >= today.getTime())
  //     .map(h => ({
  //       name: h.name,
  //       date: new Date(h.date)
  //     }))
  //     .sort((a, b) => a.date.getTime() - b.date.getTime());

  //   if (this.holidayDates.length === 0) {
  //     this.noHolidaysMessage = "No upcoming holidays!";
  //     this.currentIndex = 0;
  //   } else {
  //     this.noHolidaysMessage = "";
  //     this.currentIndex = 0; // start from nearest
  //     this.nearestHoliday = this.holidayDates[0];
  //   }
  // }

  loadHolidays(year: number) {
    this.loading = true; // optional: show a loader

    this.holidaysService.getHolidaysByYear(year).subscribe({
      next: (calendar: any) => {
        const today = new Date();

        // Map backend holidays to a usable format
        const allHolidays = (calendar.holidays || []).map((h: any) => ({
          name: h.title,
          date: new Date(h.date),
          isOptional: h.isOptional || false
        }));

        // Keep only upcoming holidays
        const futureHolidays = allHolidays
          .filter((h: { name: string; date: Date; isOptional?: boolean }) => h.date >= today)
          .sort((a: { name: string; date: Date }, b: { name: string; date: Date }) => a.date.getTime() - b.date.getTime());

        if (futureHolidays.length) {
          this.holidayDates = futureHolidays;
          this.nearestHoliday = futureHolidays[0];
          this.currentIndex = 0;
          this.noHolidaysMessage = '';
        } else {
          this.holidayDates = [];
          this.nearestHoliday = null;
          this.noHolidaysMessage = 'No upcoming holidays!';
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load holidays', err);
        this.noHolidaysMessage = 'Failed to load holidays';
        this.loading = false;
      }
    });
  }
  nextHoliday() {
    if (this.currentIndex < this.holidayDates.length - 1) {
      this.currentIndex++;
      this.nearestHoliday = this.holidayDates[this.currentIndex];
    }
  }

  prevHoliday() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.nearestHoliday = this.holidayDates[this.currentIndex];
    }
  }






  fetchDetails() {
    const employeeId = Number(localStorage.getItem('empId')); // make sure this is the numeric Employee.id
    if (!employeeId) return;

    this.employeeService.getEmployeeRequests(employeeId).subscribe({
      next: (res) => {
        this.leave = (res.leaves ?? []).map(r => {
          const isRange = !!(r.startDate && r.endDate);
          return {
            ...r,
            leaveType: r.leaveType.name,
            isRange,
            dates: isRange ? getDateRangeArray(r.startDate, r.endDate) : [toDDMMYYYY(r.startDate)],
            status: r.status
          };
        });

        this.wfh = (res.wfh ?? []).map(r => {
          const isRange = !!(r.startDate && r.endDate);
          return {
            ...r,
            isRange,
            dates: isRange ? getDateRangeArray(r.startDate, r.endDate) : [toDDMMYYYY(r.startDate)],
            status: r.status
          };
        });
        this.permission = (res.permissions ?? []).map(r => ({
          ...r,
          date: toDDMMYYYY(r.day),                    // permissions use single "day"
          status: r.status
        }));
      },
      error: (err) => console.error(err)
    });

    this.setWeek(new Date());
    // tiny helpers:
    function toDDMMYYYY(value: string): string {
      if (!value) return '-';
      const d = new Date(value);
      if (isNaN(d.getTime())) return '-';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    function rangeOrDate(start?: string, end?: string): string {
      if (start && end) return `${toDDMMYYYY(start)} — ${toDDMMYYYY(end)}`;
      if (start) return toDDMMYYYY(start);
      return '-';
    }
    function getDateRangeArray(start: string, end: string): string[] {
      const result: string[] = [];
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Loop until we reach end date
      let current = new Date(startDate);
      while (current <= endDate) {
        const dd = String(current.getDate()).padStart(2, '0');
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const yyyy = current.getFullYear();
        result.push(`${dd}-${mm}-${yyyy}`);
        current.setDate(current.getDate() + 1);
      }
      return result;
    }

  }



  // Attendance-card 

  generateWeekDays() {
    const startOfWeek = this.getMonday(new Date(this.selectedDate));
    this.weekDays = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);

      let status: 'present' | 'absent' | 'holiday' | 'none' = 'none';

      // Sunday is always holiday
      if (day.getDay() === 0) {
        status = 'holiday';
      } else {
        const record = this.attendanceRecords.find(r =>
          new Date(r.date).toDateString() === day.toDateString()
        );

        if (record) {
          status = record.status;
        } else if (day > this.today) {
          status = 'none'; // Future days stay empty
        } else {
          status = 'absent';
        }
      }

      this.weekDays.push({
        day: day.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        date: day,
        status
      });
    }
  }


  getMonday(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  goToPreviousDay() {
    const prev = new Date(this.selectedDate);
    prev.setDate(prev.getDate() - 1);
    this.selectedDate = prev;
    this.generateWeekDays();
  }

  goToNextDay() {
    if (!this.isToday(this.selectedDate)) {
      const next = new Date(this.selectedDate);
      next.setDate(next.getDate() + 1);
      this.selectedDate = next;
      this.generateWeekDays();
    }
  }

  isToday(date: Date): boolean {
    return date.toDateString() === this.today.toDateString();
  }

  weekData: {
    dayName: string;
    displayText: string;
    statusClass: string;
  }[] = [];


  // Working-Card

  // setWeek(referenceDate: Date) {
  //   const start = this.getMonday(referenceDate);
  //   const end = new Date(start);
  //   end.setDate(start.getDate() + 6);

  //   this.weekStart = start;
  //   this.weekEnd = end;

  //   this.attendanceData = [];

  //   for (let i = 0; i < 7; i++) {
  //     const current = new Date(start);
  //     current.setDate(start.getDate() + i);

  //     const record = this.rawAttendance.find(r =>
  //       new Date(r.date).toDateString() === current.toDateString()
  //     );

  //     if (record) {
  //       if (record.status === 'Present' && record.login && record.logout) {
  //         const total = this.calculateTotalHours(record.login, record.logout);
  //         this.attendanceData.push({
  //           dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
  //           totalHours: total,
  //           status: 'Present'
  //         });
  //       } else {
  //         this.attendanceData.push({
  //           dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
  //           status: record.status
  //         });
  //       }
  //     } else {
  //       this.attendanceData.push({
  //         dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
  //         status: current.getDay() === 0 ? 'Day Off' : 'Leave'
  //       });
  //     }
  //   }
  // }

  // setWeek(referenceDate: Date) {
  //   const start = this.getMonday(referenceDate);
  //   const end = new Date(start);
  //   end.setDate(start.getDate() + 6);

  //   this.weekStart = start;
  //   this.weekEnd = end;

  //   const employeeId = Number(this.currentUserId); // however you store the logged-in user
  //   this.loadShiftName(employeeId);

  //   this.attendanceService.getWeeklyAttendance(employeeId, start, end).subscribe({
  //     next: (data) => {
  //       this.rawAttendance = data;
  //       this.buildAttendanceData(start);
  //     },
  //     error: (err) => console.error('Failed to fetch attendance', err)
  //   });
  // }
  setWeek(referenceDate: Date) {
    const start = this.getMonday(referenceDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    this.weekStart = start;
    this.weekEnd = end;

    const employeeId = Number(this.currentUserId);

    this.loadShiftName(employeeId);

    // load week offs for this month
    const month = start.getMonth() + 1;
    const year = start.getFullYear();

    this.shiftService.getApprovedWeekOffs({
      employeeId,
      month,
      year
    }).subscribe(res => {
      this.weekOffSource = res.source;

      this.approvedWeekOffDates = new Set(
        res.weekOffDates.map((d: string) => {
          const x = new Date(d);
          x.setHours(0, 0, 0, 0);
          return x.toISOString().slice(0, 10);
        })
      );

      // after week-off load → fetch attendance
      this.attendanceService.getWeeklyAttendance(employeeId, start, end)
        .subscribe({
          next: (data) => {
            this.rawAttendance = data;
            this.buildAttendanceData(start);
          },
          error: (err) => console.error('Failed to fetch attendance', err)
        });
    });
  }


  private buildAttendanceData(start: Date) {
    this.attendanceData = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);

      const record = this.rawAttendance.find(r =>
        new Date(r.date).toDateString() === current.toDateString()
      );

      if (record) {
        // if (record.status === 'Present' && record.checkIn && record.checkOut) {
        //   const total = this.calculateTotalHours(record.checkIn, record.checkOut);
        //   this.attendanceData.push({
        //     dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
        //     totalHours: total,
        //               checkIn: this.formatTime(record.checkIn),
        //   checkOut: this.formatTime(record.checkOut),
        //     status: 'Present'
        //   });
        // }
        if (record.status === 'Present' && record.checkIn) {

          let total = '0 hrs 0 mins';
          let checkOutTime: string | undefined;

          if (record.checkOut) {
            total = this.calculateTotalHours(record.checkIn, record.checkOut);
            checkOutTime = this.formatTime(record.checkOut);
          }

          this.attendanceData.push({
            dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
            date: current,
            totalHours: total,
            checkIn: this.formatTime(record.checkIn),
            checkOut: checkOutTime,
            status: 'Present'
          });
        }

        else {
          this.attendanceData.push({
            dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
            date: current,
            status: record.status
          });
        }
      }
      //  else {
      //   const isWeekOff = this.isApprovedWeekOff(current);

      //   this.attendanceData.push({
      //     dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
      //     date: current,  
      //     status: isWeekOff ? 'Day Off' : 'Leave'
      //   });
      // }
      else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentDate = new Date(current);
        currentDate.setHours(0, 0, 0, 0);

        const isWeekOff = this.isApprovedWeekOff(current);

        let status: 'Leave' | 'Day Off' | 'Empty' | 'Coming Up' | 'Not Started' = 'Empty';

        if (isWeekOff) {
          status = 'Day Off';
        } else if (currentDate.getTime() === today.getTime()) {
          status = 'Not Started'; // ✅ today but no check-in
        } else if (currentDate > today) {
          status = 'Coming Up'; // ✅ future
        } else {
          status = 'Empty'; // or 'Absent' if you want to show explicitly
        }

        this.attendanceData.push({
          dayName: current.toLocaleDateString('en-US', { weekday: 'long' }),
          date: current,
          status
        });
      }
    }
  }


  isCurrentWeek(): boolean {
    const today = new Date();
    return today >= this.weekStart && today <= this.weekEnd;
  }


  calculateTotalHours(checkIn: string | Date, checkOut: string | Date): string {
    const inTime = new Date(checkIn);
    const outTime = new Date(checkOut);

    const diffMs = outTime.getTime() - inTime.getTime();
    if (isNaN(diffMs) || diffMs < 0) return '0 hrs 0 mins';

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours} hrs ${minutes} mins`;
  }


  previousWeek() {
    const prevWeek = new Date(this.weekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    this.setWeek(prevWeek);
  }

  nextWeek() {
    const nextWeek = new Date(this.weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.setWeek(nextWeek);
  }
  openLeaveForm() {
    this.leaveViewMode = false;
    this.selectedLeaveForView = null; // no data for new form
    this.showLeaveDetailsPopup = true;
  }

  openPermissionForm() {
    this.permissionViewMode = false;
    this.selectedPermission = null;
    this.showPermissionPopup = true;
  }

  openWFHForm() {
    this.wfhViewMode = false;
    this.selectedWFH = null;
    this.showWFHPopup = true;
  }
  viewLeaveDetails(row: any) {
    this.leaveViewMode = true;
    this.selectedLeaveForView = row;
    this.showLeaveDetailsPopup = true;

  }

  viewPermissionDetails(row: any) {
    this.permissionViewMode = true;
    this.selectedPermission = row;
    this.showPermissionPopup = true;
  }

  viewWFHDetails(row: any) {
    this.wfhViewMode = true;
    this.selectedWFH = row;
    this.showWFHPopup = true;
  }

  closePopup() {
    this.showLeaveDetailsPopup = false;
    this.showPermissionPopup = false;
    this.showWFHPopup = false;
    this.fetchDetails();
  }
  onImageError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = this.getDefaultImage(); // fallback to gender-based default
  }
  getDefaultImage(): string {
    const gender = this.employee?.gender?.toUpperCase() || 'MALE';
    return gender === 'FEMALE' ? '/img-women.png' : '/img.png';

  }
  showDetails = false;

  toggleDetails() {
    this.showDetails = !this.showDetails;
  }
  loadShiftName(employeeId: number) {
    const today = new Date().toISOString().split('T')[0];

    this.shiftService
      .getAssignmentsByEmployee(employeeId)
      .subscribe(assignments => {
        console.log('All Shift Assignments:', assignments);

        // 1️⃣ Try to find today's shift
        const todayShift = assignments.find(a =>
          a.date.startsWith(today)
        );

        console.log('Today\'s Shift Assignment:', todayShift);

        if (todayShift?.shift?.name) {
          this.shiftName = `Shift – ${todayShift.shift.name}`;
          return;
        }
        console.log('No shift assignment found for today.');

        // 2️⃣ Fallback: fixed shift from employee
        // this.loadFixedShift(employeeId);
      });
  }
  birthdayIndex = 0;
  anniversaryIndex = 0;



  startBirthdayAutoSlide() {
    if (this.birthday.length <= 1) return;
    setInterval(() => {
      this.birthdayIndex =
        (this.birthdayIndex + 1) % this.birthday.length;
    }, 3000);
  }

  startAnniversaryAutoSlide() {
    if (this.anniversary.length <= 1) return;
    setInterval(() => {
      this.anniversaryIndex =
        (this.anniversaryIndex + 1) % this.anniversary.length;
    }, 3000);
  }

  currentBirthdayIndex = 0;
  currentAnniversaryIndex = 0;

  /* Birthdays */
  prevBirthday() {
    if (this.currentBirthdayIndex > 0) {
      this.currentBirthdayIndex--;
    }
  }

  nextBirthday() {
    if (this.currentBirthdayIndex < this.birthday.length - 1) {
      this.currentBirthdayIndex++;
    }
  }

  /* Anniversaries */
  prevAnniversary() {
    if (this.currentAnniversaryIndex > 0) {
      this.currentAnniversaryIndex--;
    }
  }

  nextAnniversary() {
    if (this.currentAnniversaryIndex < this.anniversary.length - 1) {
      this.currentAnniversaryIndex++;
    }
  }
  leaveIndex = 0;
  visibleCount = 4;

  get visibleLeaves() {
    return this.leaveByTypeToday.slice(
      this.leaveIndex,
      this.leaveIndex + this.visibleCount
    );
  }

  nextLeaves() {
    if (this.leaveIndex + this.visibleCount < this.leaveByTypeToday.length) {
      this.leaveIndex += this.visibleCount;
    }
  }

  prevLeaves() {
    if (this.leaveIndex > 0) {
      this.leaveIndex -= this.visibleCount;
    }
  }
  private stripTime(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private isApprovedWeekOff(date: Date): boolean {
    const key = this.stripTime(date).toISOString().slice(0, 10);

    if (this.weekOffSource === 'MONTHLY_SHIFT') {
      return this.approvedWeekOffDates.has(key);
    }

    // fallback → Sunday
    return date.getDay() === 0;
  }
  formatTime(date: string | Date): string {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getTooltipText(day: AttendanceDay): string {
    if (!day.checkIn) return '';

    const dateText = day.date
      ? new Date(day.date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
      : '';

    if (day.checkIn && day.checkOut) {
      return `${dateText}\nIn: ${day.checkIn}\nOut: ${day.checkOut}`;
    }

    return `${dateText}\nIn: ${day.checkIn}`;
  }

  getFinancialYear(date: Date): number {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return month >= 4 ? year : year - 1;
  }

  // ── PIP methods ────────────────────────────────────────────────────────────
  loadMyPIPs() {
    const empId = Number(localStorage.getItem('empId'));
    if (!empId) return;
    this.pipLoading = true;
    this.pipService.getEmployeePIPHistory(empId).subscribe({
      next: (d) => { this.myPIPs = d; this.pipLoading = false; },
      error: () => { this.pipLoading = false; },
    });
  }

  openPIPDetail(pip: any) {
    this.selectedPIP = pip;
    this.pipDetailVisible = true;
    this.loadPIPResponses(pip.id);
  }

  loadPIPResponses(pipId: number) {
    this.pipResponsesLoading = true;
    this.pipService.getPIPResponses(pipId).subscribe({
      next: (d) => { this.pipResponses = d; this.pipResponsesLoading = false; },
      error: () => { this.pipResponsesLoading = false; },
    });
  }

  openLogMyResponse(pip: any) {
    this.selectedPIP = pip;
    this.myResponseText = '';
    this.myResponseSubmitted = false;
    this.logResponseVisible = true;
  }

  submitMyResponse() {
    if (!this.myResponseText.trim() || !this.selectedPIP) return;
    const empId = Number(localStorage.getItem('empId'));
    this.myResponseSubmitting = true;
    this.pipService.logManualResponse(this.selectedPIP.id, { employeeId: empId, responseText: this.myResponseText, method: 'EMPLOYEE_SELF' }).subscribe({
      next: () => {
        this.myResponseSubmitting = false;
        this.myResponseSubmitted = true;
        this.loadPIPResponses(this.selectedPIP.id);
      },
      error: () => { this.myResponseSubmitting = false; },
    });
  }

  getPIPStatusLabel(status: string): string {
    const m: Record<string, string> = {
      WARNING_ISSUED: 'Warning Issued', PIP_ACTIVE: 'PIP Active',
      PIP_EXTENDED: 'PIP Extended', PIP_CLOSED_IMPROVED: 'Closed – Improved',
      TERMINATION_INITIATED: 'Termination Initiated', TERMINATED: 'Terminated',
    };
    return m[status] ?? status;
  }

  getPIPStatusClass(status: string): string {
    const m: Record<string, string> = {
      WARNING_ISSUED: 'pip-warning', PIP_ACTIVE: 'pip-active',
      PIP_EXTENDED: 'pip-extended', PIP_CLOSED_IMPROVED: 'pip-improved',
      TERMINATION_INITIATED: 'pip-term', TERMINATED: 'pip-term',
    };
    return m[status] ?? '';
  }

  fmtDate(d: string | Date | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  loadMyOtRecords() {
    this.otLoading = true;
    this.dashboardService.getMyApprovedOT()
      .pipe(catchError(() => of([])))
      .subscribe((data: any[]) => {
        this.myOtRecords = data || [];
        this.otLoading = false;
      });
  }

  formatOtDuration(minutes: number): string {
    if (!minutes) return '0 hrs 0 mins';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} hrs ${m} mins`;
  }

  loadMyExitInterviews() {
    const employeeId = Number(this.currentUserId);
    if (!employeeId) return;
    this.exitInterviewLoading = true;
    this.resignationService.listExitInterview()
      .pipe(catchError(() => of([])))
      .subscribe((data: any[]) => {
        this.myExitInterviews = (data || []).filter(
          (e: any) => e.employee?.id === employeeId || e.employeeId === employeeId
        );
        this.exitInterviewLoading = false;
      });
  }

  getExitInterviewStatus(interview: any): string {
    if (interview.completedAt) return 'COMPLETED';
    if (interview.status === 'SCHEDULED') return 'SCHEDULED';
    if (interview.status === 'CANCELLED') return 'CANCELLED';
    return 'PENDING';
  }

  getExitInterviewStatusClass(interview: any): string {
    const s = this.getExitInterviewStatus(interview);
    if (s === 'COMPLETED') return 'approved';
    if (s === 'SCHEDULED') return 'pending';
    if (s === 'CANCELLED') return 'rejected';
    return 'pending';
  }

}



