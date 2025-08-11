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

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'employee', component: EmployeeOverview, canActivate: [authGuard] },
    { path: 'appraisal', component: AppraisalOverview, canActivate: [authGuard] },
    { path: 'leave', component: LeaveOverview },
    { path: 'permission-request', component: PermissionRequest },
    { path: 'wfh', component: WorkFromHome },
    { path: 'balances-accruals', component: BalancesAccruals },
    { path: 'attendance', component: ManageAttendance, canActivate: [authGuard] },
    { path: 'history', component: History },
    { path: 'evaluation', component: EvaluationOverview },
    { path: 'my-tests', component: MyTests },
    { path: 'take-test/:id', component: TestPlatform },
    {path: 'settings', component: SettingsOverview},
    {path:'individual', component: Individual},
    {path:'popup', component:PopUp},
    { path: '**', redirectTo: 'login', pathMatch: 'full' }

];
