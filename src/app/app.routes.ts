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

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'employee', component: EmployeeOverview },
    { path: 'appraisal-form', component: ApprasialForm },
    { path: 'appraisal-table', component: AppraisalTable },
    { path: 'leave-request', component: LeaveRequest },
    { path: 'permission-request', component: PermissionRequest },
    { path: 'wfh', component: WorkFromHome },
    { path: 'balances-accruals', component: BalancesAccruals },
    {path:'attendance', component:ManageAttendance},
    {path:'history', component:History},
    { path: '**', redirectTo: 'login', pathMatch: 'full' }

];
