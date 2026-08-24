import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExportService, ExportParams } from '../../services/export/export.service';
import { SurveryService, SurveyCycle } from '../../services/surveyService/survery-service';
import { ModuleGuide } from '../../shared/module-guide/module-guide';

interface ExportItem {
  label:      string;
  table:      string;
  filename:   string;
  needsDate?: boolean;
  needsYear?: boolean;
  needsMonth?: boolean;
  /** Survey reports — scope the sheet to one survey cycle. */
  needsCycle?: boolean;
}

interface ExportGroup {
  title: string;
  icon:  string;
  items: ExportItem[];
}

@Component({
  selector: 'app-export',
  standalone: true,
  imports: [CommonModule, FormsModule, ModuleGuide],
  templateUrl: './export.html',
  styleUrl: './export.css',
})
export class Export {
  // ── Shared filters ────────────────────────────────────────────────────────
  startDate = '';
  endDate   = '';
  year      = new Date().getFullYear();
  month     = new Date().getMonth() + 1;

  // Survey cycles — scopes the survey reports to one window. Left null by
  // default so the sheets keep their existing all-cycles behaviour.
  cycles: SurveyCycle[] = [];
  selectedCycleId: number | null = null;

  loading: Record<string, boolean> = {};

  ngOnInit(): void {
    this.surveyApi.getSurveyCycles().subscribe({
      next: c => this.cycles = c || [],
      error: () => this.cycles = [],   // non-HR users can't read cycles; hide the picker
    });
  }

  get dateRangeWarning(): boolean {
    if (!this.startDate || !this.endDate) return false;
    const start = new Date(this.startDate).getTime();
    const end   = new Date(this.endDate).getTime();
    if (end < start) return false;
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    return diffDays > 31;
  }

  months = [
    { value: 1,  label: 'January' },  { value: 2,  label: 'February' },
    { value: 3,  label: 'March' },    { value: 4,  label: 'April' },
    { value: 5,  label: 'May' },      { value: 6,  label: 'June' },
    { value: 7,  label: 'July' },     { value: 8,  label: 'August' },
    { value: 9,  label: 'September' },{ value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  // ── Export groups ─────────────────────────────────────────────────────────
  groups: ExportGroup[] = [
    {
      title: 'Employee',
      icon: 'people',
      items: [
        { label: 'Employee Master (with all sub-details)', table: 'employee-master',          filename: 'Employee_Master' },
        { label: 'Consolidated Employee Details',          table: 'consolidated-employee',   filename: 'Consolidated_Employee_Details' },
        { label: 'Employee Addresses',                     table: 'employee-addresses',      filename: 'Employee_Addresses' },
        { label: 'Emergency Contacts',                     table: 'emergency-contacts', filename: 'Emergency_Contacts' },
        { label: 'Qualifications',                         table: 'qualifications',     filename: 'Qualifications' },
        { label: 'Employee Documents',                     table: 'employee-documents', filename: 'Employee_Documents' },
      ],
    },
    {
      title: 'Attendance & Leave',
      icon: 'calendar_today',
      items: [
        { label: 'Attendance',             table: 'attendance',            filename: 'Attendance',            needsDate: true },
        { label: 'Leave Requests',         table: 'leave-requests',        filename: 'Leave_Requests',        needsDate: true },
        { label: 'Leave Balance',          table: 'leave-balance',         filename: 'Leave_Balance',         needsYear: true },
        { label: 'Leave Monthly Summary',  table: 'leave-monthly-summary', filename: 'Leave_Monthly_Summary', needsYear: true, needsMonth: true },
        { label: 'Leave Yearly Summary',   table: 'leave-yearly-summary',  filename: 'Leave_Yearly_Summary',  needsYear: true },
        { label: 'Leave Accrual Details',  table: 'leave-accrual-details', filename: 'Leave_Accrual_Details', needsYear: true, needsMonth: true },
        { label: 'Leave Ledger',           table: 'leave-ledger',          filename: 'Leave_Ledger',          needsYear: true },
        { label: 'Leave Policy',           table: 'leave-policy',          filename: 'Leave_Policy' },
        { label: 'Entitlement Policy',     table: 'entitlement-policy',    filename: 'Entitlement_Policy' },
      ],
    },
    {
      title: 'Time & Shifts',
      icon: 'schedule',
      items: [
        { label: 'Permission Requests',     table: 'permission-requests',     filename: 'Permission_Requests',     needsDate: true },
        { label: 'Shift Templates',         table: 'shift-templates',         filename: 'Shift_Templates' },
        { label: 'Shift Assignments',       table: 'shift-assignments',       filename: 'Shift_Assignments',       needsDate: true },
        { label: 'Employee Shift Settings', table: 'employee-shift-settings', filename: 'Employee_Shift_Settings' },
        { label: 'Shift Rotation Patterns', table: 'shift-rotation-patterns', filename: 'Shift_Rotation_Patterns' },
      ],
    },
    {
      title: 'Recruitment',
      icon: 'work',
      items: [
        { label: 'Jobs',                       table: 'jobs',                       filename: 'Jobs' },
        { label: 'Candidates',                 table: 'candidates',                 filename: 'Candidates' },
        { label: 'Applications',               table: 'applications',               filename: 'Applications' },
        { label: 'Candidate Test Assignments', table: 'candidate-test-assignments', filename: 'Candidate_Test_Assignments' },
      ],
    },
    {
      title: 'Training',
      icon: 'school',
      items: [
        { label: 'Trainings',            table: 'trainings',            filename: 'Trainings' },
        { label: 'Training Assignments', table: 'training-assignments', filename: 'Training_Assignments' },
        { label: 'Training Attendance',  table: 'training-attendance',  filename: 'Training_Attendance', needsDate: true },
      ],
    },
    {
      title: 'Tests',
      icon: 'quiz',
      items: [
        { label: 'Test Details',     table: 'test-details',    filename: 'Test_Details' },
        { label: 'Test Assignments', table: 'test-assignments', filename: 'Test_Assignments' },
        { label: 'Test Attempts',    table: 'test-attempts',    filename: 'Test_Attempts' },
      ],
    },
    {
      title: 'Performance & Appraisal',
      icon: 'leaderboard',
      items: [
        { label: 'Appraisal Forms',          table: 'appraisal-forms',          filename: 'Appraisal_Forms' },
        { label: 'Performance Appraisal',    table: 'performance-appraisal',    filename: 'Performance_Appraisal',    needsYear: true },
        { label: 'Performance Summary',      table: 'performance-summary',      filename: 'Performance_Summary',      needsYear: true },
        { label: 'Performance Final Review', table: 'performance-final-review', filename: 'Performance_Final_Review', needsYear: true },
      ],
    },
    {
      title: 'Survey',
      icon: 'poll',
      items: [
        { label: 'Survey Submission Summary', table: 'survey-submission-summary', filename: 'Survey_Submission_Summary', needsDate: true, needsCycle: true },
        { label: 'Survey Question Master',    table: 'survey-question-master',    filename: 'Survey_Question_Master' },
        { label: 'Survey Response Details',   table: 'survey-response-details',   filename: 'Survey_Response_Details',   needsDate: true, needsCycle: true },
        { label: 'Survey – Topic Wise',       table: 'survey-topic-wise',         filename: 'Survey_Topic_Wise',         needsCycle: true },
        { label: 'Survey – Employee Wise',    table: 'employee-wise-survey',      filename: 'Employee_Wise_Survey',      needsCycle: true },
        { label: 'Survey – Question Wise',    table: 'question-wise-survey',      filename: 'Question_Wise_Survey',      needsCycle: true },
        { label: 'Survey Pending',            table: 'survey-pending',            filename: 'Survey_Pending',            needsCycle: true },
      ],
    },
    {
      title: 'HR & Compliance',
      icon: 'gavel',
      items: [
        { label: 'Grievances',           table: 'grievances',           filename: 'Grievances' },
        { label: 'POSH Cases',           table: 'posh-cases',           filename: 'POSH_Cases' },
        { label: 'Incidents',            table: 'incidents',            filename: 'Incidents' },
        { label: 'Announcements',        table: 'announcements',        filename: 'Announcements' },
        { label: 'Resignation Requests', table: 'resignation-requests', filename: 'Resignation_Requests' },
        { label: 'Exit Interviews',      table: 'exit-interviews',      filename: 'Exit_Interviews' },
        { label: 'Internship',           table: 'internship',           filename: 'Internship' },
      ],
    },
    {
      title: 'Masters',
      icon: 'settings',
      items: [
        { label: 'Departments',    table: 'departments',    filename: 'Departments' },
        { label: 'Branches',       table: 'branches',       filename: 'Branches' },
        { label: 'Designations',   table: 'designations',   filename: 'Designations' },
        { label: 'Holiday Export', table: 'holiday-export', filename: 'Holiday_Export', needsYear: true },
        { label: 'Users',          table: 'users',          filename: 'Users' },
        { label: 'Roles',          table: 'roles',          filename: 'Roles' },
        { label: 'Permissions',    table: 'permissions',    filename: 'Permissions' },
      ],
    },
  ];

  constructor(
    private exportService: ExportService,
    private surveyApi: SurveryService,
  ) {}

  export(item: ExportItem): void {
    if (this.loading[item.table]) return;
    this.loading[item.table] = true;

    const params: ExportParams = {};
    // Cycle wins over the date range on survey reports — it defines its own
    // window, and the backend ignores startDate/endDate when it is set.
    if (item.needsCycle && this.selectedCycleId) {
      params.cycleId = this.selectedCycleId;
    } else if (item.needsDate) {
      params.startDate = this.startDate || undefined;
      params.endDate = this.endDate || undefined;
    }
    if (item.needsYear)  params.year  = this.year;
    if (item.needsMonth) params.month = this.month;

    this.exportService.getBlob(item.table, params).subscribe({
      next: (blob) => {
        this.exportService.triggerDownload(blob, item.filename);
        this.loading[item.table] = false;
      },
      error: (err) => {
        console.error(`Export failed [${item.table}]:`, err);
        this.loading[item.table] = false;
      },
    });
  }
}
