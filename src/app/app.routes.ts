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
import { AnnouncementForm } from './announcements/announcement-form/announcement-form';
import { AnnouncementPopup } from './announcements/announcement-popup/announcement-popup';
import { SurveyForm } from './survey/survey-form/survey-form';
import { SurveyList } from './survey/survey-list/survey-list';
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

export const routes: Routes = [
  { path: 'login', component: Login },

  { path: 'dashboard', component: HrDashboard,},
  { path: 'individual', component: Individual,},
  { path: 'settings', component: SettingsOverview,},

  // --- Administration group ---
  {
    path: 'admin',
  
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'employee' },
      { path: 'employee', component: EmployeeOverview },
      { path: 'leave', component: LeaveOverview },
      { path: 'appraisal', component: DeptPerformance },
      { path: 'attendance', component: ManageAttendance },
      { path: 'resignation', component: ResignOverview },
      { path: 'evaluation', component: EvaluationOverview }, // evaluation overview
      { path: 'all-announcement', component: AnnouncementForm },
      { path: 'announcement', component: AnnouncementPopup },
      { path: 'survey', component: SurveyForm },
      { path: 'exit', component: ExitInterviewList }

    ],

  },

  // --- Recruitment group ---
  {
    path: 'recruitment',
  
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'jobs' },
      { path: 'jobs', component: RecruitmentDashboard },     // main recruitment board
      { path: 'internships', component: Internship },        // internship module
      { path: 'my-tests', component: MyTests },              // keep tests under recruitment
      { path: 'take-test/:id', component: TestPlatform },
      { path: 'candidate-tests', component: CandidateTests }, // view candidate details
      { path: 'recquisition', component: RequisitionList }, // requisition form
      { path: 'survey', component: SurveyList},
      { path: 'exit', component: ExitInterviewList}
    ],
  },

  // Other standalone modules (leave sub-features, attendance, etc.)
  { path: 'permission-request', component: PermissionRequest,},
  { path: 'wfh', component: WorkFromHome,},
  { path: 'balances-accruals', component: BalancesAccruals,},
  { path: 'attendance', component: ManageAttendance,},
  { path: 'history', component: History,},
  { path: 'resignation', component: ResignOverview,},
  { path: 'interview', component: CandidateEvalForm,},
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
