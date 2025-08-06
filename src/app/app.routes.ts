import { Routes } from '@angular/router';
import { Login } from './Login/login/login';
import { EmployeeForm } from './employee/employee-form/employee-form';
import { authGuard } from './auth-guard';
import { ApprasialForm } from './appraisal/appraisal-form/apprasial-form/apprasial-form';
import { AppraisalTable } from './appraisal/appraisal-table/appraisal-table/appraisal-table';
import { LeaveRequest } from './leaves/leave-request/leave-request/leave-request';
import { PermissionRequest } from './leaves/leave-request/leave-request/permission-request/permission-request/permission-request';
import { WorkFromHome } from './leaves/work-from-home/work-from-home';
import { BalancesAccruals } from './leaves/balances-accruals/balances-accruals';
import { EmployeeList } from './employee/employee-list/employee-list';
import { EmployeeOverview } from './employee/employee-overview/employee-overview';
import { ManageAttendance } from './attendance/manage-attendance/manage-attendance';
import { History } from './attendance/history/history';
import { AppraisalOverview } from './appraisal/appraisal-overview/appraisal-overview';
import { LeavePopup } from './leaves/leave-popup/leave-popup';
import { LeaveOverview } from './leaves/leave-overview/leave-overview';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'employee', component: EmployeeOverview, canActivate:[authGuard] },
    { path: 'appraisal', component: AppraisalOverview,canActivate:[authGuard]  },
    { path: 'leave', component: LeaveOverview },
    { path: 'permission-request', component: PermissionRequest },
    { path: 'wfh', component: WorkFromHome },
    { path: 'balances-accruals', component: BalancesAccruals },
    {path:'attendance', component:ManageAttendance, canActivate:[authGuard] },
    {path:'history', component:History},
    { path: '**', redirectTo: 'login', pathMatch: 'full' }

];
