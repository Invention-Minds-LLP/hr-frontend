import { Routes } from '@angular/router';
import { Login } from './Login/login/login';
import { authGuard, permissionGuard, landingRedirectGuard } from './auth-guard';

import { PermissionRequest } from './leaves/permission-request/permission-request/permission-request';
import { WorkFromHome } from './leaves/work-from-home/work-from-home';
import { BalancesAccruals } from './leaves/balances-accruals/balances-accruals';

import { EmployeeOverview } from './employee/employee-overview/employee-overview';
import { ManageAttendance } from './attendance/manage-attendance/manage-attendance';
import { History } from './attendance/history/history';

import { AppraisalOverview } from './appraisal/appraisal-overview/appraisal-overview';
import { LeaveOverview } from './leaves/leave-overview/leave-overview';

import { EvaluationOverview } from './evaluation/evaluation-overview/evaluation-overview';
import { MyTests } from './evaluation/my-tests/my-tests';
import { TestPlatform } from './evaluation/test-platform/test-platform';

import { SettingsOverview } from './settings/settings-overview/settings-overview';
import { Individual } from './individual/individual/individual';
import { PopUp } from './pop-up/pop-up';
import { ResignOverview } from './resignation/resign-overview/resign-overview';
import { EmployeeDetails } from './leaves/employee-details/employee-details';

import { HrDashboard } from './dashboard/hr-dashboard/hr-dashboard';
import { ManagementDashboard } from './dashboard/management-dashboard/management-dashboard';
import { HrManagerDashboard } from './dashboard/hr-manager-dashboard/hr-manager-dashboard';
import { RecruitmentDashboard } from './recruitment/recruitment-dashboard/recruitment-dashboard';
import { Internship } from './internship/internship/internship';
import { CandidateEvalForm } from './candidate-eval-form/candidate-eval-form';
import { CandidateTests } from './evaluation/candidate-tests/candidate-tests';
import { AnnouncementForm } from './announcements/announcement-form/announcement-form';
import { AnnouncementPopup } from './announcements/announcement-popup/announcement-popup';
import { SurveyForm } from './survey/survey-form/survey-form';
import { SurveyList } from './survey/survey-list/survey-list';
import { SurveyDashboard } from './survey/survey-dashboard/survey-dashboard';
import { ExitInterview } from './resignation/exit-interview/exit-interview';
import { ExitInterviewList } from './resignation/exit-interview-list/exit-interview-list';
import { AppraisalTemplate } from './appraisal/appraisal-template/appraisal-template';
import { RequisitionForm } from './recruitment/requisition-form/requisition-form';
import { ApprasialForm } from './appraisal/appraisal-form/apprasial-form/apprasial-form';
import { RequisitionList } from './recruitment/requisition-list/requisition-list';
import { AppraisalTable } from './appraisal/appraisal-table/appraisal-table/appraisal-table';
import { EmployeeForm } from './employee/employee-form/employee-form';
import { ResignationForm } from './resignation/resignation-form/resignation-form';
import { TestCreation } from './evaluation/test-creation/test-creation';
import { AssignedTest } from './evaluation/assigned-test/assigned-test';
import { AllTest } from './evaluation/all-test/all-test';
import { DeptPerformance } from './appraisal/dept-performance/dept-performance';
import { GrievanceList } from './grievance/grievance-list/grievance-list';
import { Posh } from './services/posh/posh';
import { PoshList } from './posh/posh-list/posh-list';
import { CommitteeAdmin } from './committee/committee-admin/committee-admin';
import { HrEvaluate } from './evaluation/hr-evaluate/hr-evaluate';
import { Complaints } from './complaints/complaints';
import { MyInterview } from './recruitment/my-interview/my-interview';
import { Clearances } from './resignation/clearances/clearances';
import { TrainingForm } from './training/training-form/training-form';
import { TrainingOverview } from './training/training-overview/training-overview';
import { AttendanceCalendars } from './attendance/attendance-calendars/attendance-calendars';
import { IncidentOverview } from './incident/incident-overview/incident-overview';
import { PublicReport } from './incident/public-report/public-report';
import { EmployeeShiftList } from './shifts/employee-shift-list/employee-shift-list';
import { ManagerShift } from './shifts/manager-shift/manager-shift';
import { ShiftOverview } from './shifts/shift-overview/shift-overview';
import { AttendanceOverview } from './attendance/attendance-overview/attendance-overview';
import { OtApprovals } from './attendance/ot-approvals/ot-approvals';
import { ForcePresent } from './attendance/force-present/force-present';
import { HrCorrections } from './attendance/hr-corrections/hr-corrections';
import { GeoTrackingOverview } from './geo-tracking/geo-tracking-overview/geo-tracking-overview';
import { Export } from './settings/export/export';
import { PayrollOverview } from './payroll/payroll-overview/payroll-overview';
import { MyTax } from './tax/my-tax/my-tax';
import { TaxAdmin } from './tax/tax-admin/tax-admin';
import { Companies } from './settings/companies/companies';
import { LettersOverview } from './letters/letters-overview/letters-overview';
import { AssetsOverview } from './assets/assets-overview/assets-overview';
import { WeeklyTrackerOverview } from './weekly-tracker/weekly-tracker-overview/weekly-tracker-overview';
import { Masters } from './settings/masters/masters';
import { RolePermissions } from './settings/role-permissions/role-permissions';
import { IncidentCategoryAdmin } from './incident/incident-category-admin/incident-category-admin';
import { EncashmentOverview } from './encashment/encashment-overview';
import { CompOffOverview } from './comp-off/comp-off-overview';
import { CompOffApprovals } from './comp-off/comp-off-approvals/comp-off-approvals';
import { IncentivesOverview } from './incentives/incentives-overview';
import { LoansOverview } from './loans/loans-overview';
import { IncentiveRequests } from './incentives/incentive-requests/incentive-requests';
import { WeeklyRatingOverview } from './weekly-rating/weekly-rating-overview';
import { PipOverview } from './pip/pip-overview/pip-overview';
import { ModuleUtilization } from './module-utilization/module-utilization';
import { PipResponseForm } from './pip/pip-response-form/pip-response-form';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'pip-respond/:token', component: PipResponseForm }, // public — no authGuard

  // Public anonymous incident reporting + status tracking — no authGuard.
  { path: 'report-incident',              component: PublicReport },
  { path: 'report-incident/track/:token', component: PublicReport },

  { path: 'dashboard', component: HrDashboard, canActivate: [authGuard, permissionGuard], data: { perm: 'dashboard.hr.view' } },
  { path: 'management-dashboard', component: ManagementDashboard, canActivate: [authGuard, permissionGuard], data: { perm: 'dashboard.management.view' } },
  { path: 'hr-manager-dashboard', component: HrManagerDashboard, canActivate: [authGuard, permissionGuard], data: { perm: 'dashboard.hrAnalytics.view' } },
  { path: 'survey-dashboard', component: SurveyDashboard, canActivate: [authGuard]},
  { path: 'individual', component: Individual, canActivate: [authGuard]},
  { path: 'settings', component: SettingsOverview,canActivate: [authGuard]},

  // --- Administration group ---
  {
    path: 'admin',
  
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'individual' },
      { path: 'employee', component: EmployeeOverview,canActivate: [authGuard, permissionGuard], data: { perm: 'admin.employee.view' } },
      { path: 'leave', component: LeaveOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.leave.view' } },
      { path: 'appraisal', component: AppraisalOverview,canActivate: [authGuard, permissionGuard], data: { perm: 'admin.appraisal.view' } },
      { path: 'attendance', component: AttendanceOverview,canActivate: [authGuard, permissionGuard], data: { perm: 'admin.attendance.view' } },
      { path: 'resignation', component: ResignOverview,canActivate: [authGuard, permissionGuard], data: { perm: 'admin.resignation.view' } },
      { path: 'evaluation', component: EvaluationOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.training.view' } }, // evaluation overview
      { path: 'all-announcement', component: AnnouncementForm, canActivate: [authGuard] },
      { path: 'announcement', component: AnnouncementPopup, canActivate: [authGuard] },
      { path: 'survey', component: SurveyList, canActivate: [authGuard] },
      { path: 'exit', component: ExitInterviewList, canActivate: [authGuard] },
      { path: 'grievance', component: GrievanceList, canActivate: [authGuard] },
      { path: 'posh', component: PoshList, canActivate: [authGuard] },
      { path: 'committees', component: CommitteeAdmin, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.committees.view' } },
      { path: 'complaints', component: Complaints, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.complaints.view' } },
      { path: 'clearance', component: Clearances, canActivate: [authGuard] },
      { path: 'training', component: TrainingOverview, canActivate: [authGuard] },
      { path: 'incidents', component: IncidentOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.incidents.view' } },
      { path: 'shifts', component: ShiftOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.shifts.view' } },
      { path: 'tracking', component: GeoTrackingOverview, canActivate: [authGuard]},
        { path: 'ot-approvals', component: OtApprovals, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.otApprovals.view' } },
        { path: 'reports', component: Export, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.reports.view' } },
        { path: 'force-present', component: ForcePresent, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.forcePresent.view' } },
        { path: 'hr-corrections', component: HrCorrections, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.hrCorrections.view' } },
        { path: 'payroll', component: PayrollOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.payroll.view' } },
        { path: 'tax-admin', component: TaxAdmin, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.taxDeclarations.view' } },
        { path: 'companies', component: Companies, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.companies.view' } },
        { path: 'letters', component: LettersOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.letters.view' } },
        { path: 'assets', component: AssetsOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.assets.view' } },
        // Employee self-service — every logged-in user has their own tax page.
        { path: 'my-tax', component: MyTax, canActivate: [authGuard] },
        { path: 'weekly-tracker', component: WeeklyTrackerOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.weeklyTracker.view' } },
        { path: 'incentive-requests', component: IncentiveRequests, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.incentiveRequests.view' } },
        { path: 'weekly-rating', component: WeeklyRatingOverview, canActivate: [authGuard]},
        { path: 'pip', component: PipOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.pip.view' } },
        { path: 'encashment', component: EncashmentOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.encashment.view' } },
        { path: 'comp-off', component: CompOffOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.compOff.view' } },
        { path: 'incentives', component: IncentivesOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.incentives.view' } },
        { path: 'loans', component: LoansOverview, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.loans.view' } },
        { path: 'module-utilization', component: ModuleUtilization, canActivate: [authGuard, permissionGuard], data: { perm: 'admin.moduleUtilization.view' } },
          { path: 'comp-off-approvals', component: CompOffApprovals, canActivate: [authGuard]},

    ],

  },

  // --- Masters group ---
  {
    path: 'masters',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'departments' },
      { path: 'departments', component: Masters, canActivate: [permissionGuard], data: { perm: 'masters.departments.view' } },
      { path: 'designations', component: Masters, canActivate: [permissionGuard], data: { perm: 'masters.designations.view' } },
      { path: 'roles', component: Masters, canActivate: [permissionGuard], data: { perm: 'masters.roles.view' } },
      { path: 'leave-types', component: Masters, canActivate: [permissionGuard], data: { perm: 'masters.leaveTypes.view' } },
      { path: 'shift-templates', component: Masters, canActivate: [permissionGuard], data: { perm: 'masters.shiftTemplates.view' } },
      { path: 'holidays', component: Masters, canActivate: [permissionGuard], data: { perm: 'masters.holidays.view' } },
      { path: 'rating-questions', component: Masters },
      { path: 'incident-categories', component: IncidentCategoryAdmin, canActivate: [permissionGuard], data: { perm: 'masters.incidentCategories.view' } },
      { path: 'permissions', component: RolePermissions, canActivate: [permissionGuard], data: { perm: 'masters.permissions.manage' } },
    ],
  },

  // --- Recruitment group ---
  {
    path: 'recruitment',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'jobs',},
      { path: 'jobs', component: RecruitmentDashboard, canActivate: [permissionGuard], data: { perm: 'recruitment.jobs.view' } }, // main recruitment board
      { path: 'internships', component: Internship, canActivate: [permissionGuard], data: { perm: 'recruitment.internships.view' } }, // internship module
      { path: 'my-tests', component: MyTests,},              // keep tests under recruitment
      { path: 'take-test/:id', component: TestPlatform,},
      // { path: 'candidate-tests', component: CandidateTests}, // view candidate details
      { path: 'recquisition', component: RequisitionList, canActivate: [permissionGuard], data: { perm: 'recruitment.requisition.view' } }, // requisition form
      { path: 'survey', component: SurveyList, },
      { path: 'exit', component: ExitInterviewList, },
      { path: 'hr-review/:id', component: HrEvaluate, },
      { path: 'my-interview', component: MyInterview, canActivate: [permissionGuard], data: { perm: 'recruitment.interviews.view' } },
    ],
  },

  // Other standalone modules (leave sub-features, attendance, etc.)
  { path: 'permission-request', component: PermissionRequest,canActivate: [authGuard]},
  { path: 'wfh', component: WorkFromHome,canActivate: [authGuard]},
  { path: 'balances-accruals', component: BalancesAccruals,canActivate: [authGuard]},
  { path: 'attendance', component: AttendanceCalendars,canActivate: [authGuard]},
  { path: 'history', component: History,canActivate: [authGuard]},
  { path: 'ot-approvals', component: OtApprovals, canActivate: [authGuard]},
  // Manager stage of the comp-off flow + the employee's own claims. Open to any
  // signed-in user: the API decides who may approve what.
  { path: 'resignation', component: ResignOverview,canActivate: [authGuard]},
  { path: 'interview', component: CandidateEvalForm,canActivate: [authGuard]},
  { path: 'popup', component: PopUp,canActivate: [authGuard] },
   

  // ---- Backward-compat redirects (optional) ----
  { path: 'employee', redirectTo: 'admin/employee', pathMatch: 'full' },
  { path: 'leave', redirectTo: 'admin/leave', pathMatch: 'full',},
  { path: 'appraisal', redirectTo: 'admin/appraisal', pathMatch: 'full', },
  { path: 'evaluation', redirectTo: 'recruitment/evaluation', pathMatch: 'full', },
  { path: 'internship', redirectTo: 'recruitment/internships', pathMatch: 'full', },
  { path: 'my-tests', redirectTo: 'recruitment/my-tests', pathMatch: 'full', },
  { path: 'take-test/:id', redirectTo: 'recruitment/take-test/:id', pathMatch: 'full', },

  { path: 'candidate-tests', component: CandidateTests, canActivate: [authGuard]},
  { path: 'candidate-offers', loadComponent: () => import('./candidate-offers/candidate-offers').then(m => m.CandidateOffers), canActivate: [authGuard]},


  // Default / catch-all — landingRedirectGuard sends management users (roleId=4) to the
  // management dashboard, everyone else to /individual (and to /login if not authenticated).
  { path: '', pathMatch: 'full', component: Individual, canActivate: [landingRedirectGuard] },
  { path: '**', component: Individual, canActivate: [landingRedirectGuard] },
];
