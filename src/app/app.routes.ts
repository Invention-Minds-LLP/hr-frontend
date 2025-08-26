import { Routes } from '@angular/router';
import { Login } from './Login/login/login';
import { authGuard } from './auth-guard';

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
import { RecruitmentDashboard } from './recruitment/recruitment-dashboard/recruitment-dashboard';
import { Internship } from './internship/internship/internship';
import { CandidateEvalForm } from './candidate-eval-form/candidate-eval-form';
import { CandidateTests } from './evaluation/candidate-tests/candidate-tests';

export const routes: Routes = [
  { path: 'login', component: Login },

  { path: 'dashboard', component: HrDashboard, canActivate: [authGuard] },
  { path: 'individual', component: Individual, canActivate: [authGuard] },
  { path: 'settings', component: SettingsOverview, canActivate: [authGuard] },

  // --- Administration group ---
  {
    path: 'admin',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'employee' },
      { path: 'employee', component: EmployeeOverview },
      { path: 'leave', component: LeaveOverview },
      { path: 'appraisal', component: AppraisalOverview },
      { path: 'attendance', component: ManageAttendance },
      { path: 'resignation', component: ResignOverview },
      { path: 'evaluation', component: EvaluationOverview }, // evaluation overview
    ],

  },

  // --- Recruitment group ---
  {
    path: 'recruitment',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'jobs' },
      { path: 'jobs', component: RecruitmentDashboard },     // main recruitment board
      { path: 'internships', component: Internship },        // internship module
      { path: 'my-tests', component: MyTests },              // keep tests under recruitment
      { path: 'take-test/:id', component: TestPlatform },
      { path: 'candidate-tests', component: CandidateTests }, // view candidate details
    ],
  },

  // Other standalone modules (leave sub-features, attendance, etc.)
  { path: 'permission-request', component: PermissionRequest, canActivate: [authGuard] },
  { path: 'wfh', component: WorkFromHome, canActivate: [authGuard] },
  { path: 'balances-accruals', component: BalancesAccruals, canActivate: [authGuard] },
  { path: 'attendance', component: ManageAttendance, canActivate: [authGuard] },
  { path: 'history', component: History, canActivate: [authGuard] },
  { path: 'resignation', component: ResignOverview, canActivate: [authGuard] },
  { path: 'interview', component: CandidateEvalForm, canActivate: [authGuard] },
  { path: 'popup', component: PopUp },

  // ---- Backward-compat redirects (optional) ----
  { path: 'employee', redirectTo: 'admin/employee', pathMatch: 'full' },
  { path: 'leave', redirectTo: 'admin/leave', pathMatch: 'full' },
  { path: 'appraisal', redirectTo: 'admin/appraisal', pathMatch: 'full' },
  { path: 'evaluation', redirectTo: 'recruitment/evaluation', pathMatch: 'full' },
  { path: 'internship', redirectTo: 'recruitment/internships', pathMatch: 'full' },
  { path: 'my-tests', redirectTo: 'recruitment/my-tests', pathMatch: 'full' },
  { path: 'take-test/:id', redirectTo: 'recruitment/take-test/:id', pathMatch: 'full' },
  

  // Default / catch-all
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
