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
import { ResignationForm } from './resignation/resignation-form/resignation-form';
import { ResignOverview } from './resignation/resign-overview/resign-overview';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'employee', component: EmployeeOverview, canActivate: [authGuard] },
    { path: 'appraisal', component: AppraisalOverview, canActivate: [authGuard] },
    { path: 'leave', component: LeaveOverview, canActivate: [authGuard] },
    { path: 'permission-request', component: PermissionRequest, canActivate: [authGuard] },
    { path: 'wfh', component: WorkFromHome, canActivate: [authGuard] },
    { path: 'balances-accruals', component: BalancesAccruals, canActivate: [authGuard] },
    { path: 'attendance', component: ManageAttendance, canActivate: [authGuard] },
    { path: 'history', component: History, canActivate: [authGuard] },
    { path: 'evaluation', component: EvaluationOverview,canActivate: [authGuard] },
    { path: 'my-tests', component: MyTests, canActivate: [authGuard] },
    { path: 'take-test/:id', component: TestPlatform, canActivate: [authGuard] },
    {path: 'settings', component: SettingsOverview, canActivate: [authGuard]},
    {path:'individual', component: Individual, canActivate: [authGuard]},
    {path:'popup', component:PopUp},
    {path:'resignation', component: ResignOverview},
    { path: '**', redirectTo: 'login', pathMatch: 'full' }

];
