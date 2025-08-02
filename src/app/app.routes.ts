import { Routes } from '@angular/router';
import { Login } from './Login/login/login';
import { EmployeeForm } from './employee-form/employee-form';
import { authGuard } from './auth-guard';
import { ApprasialForm } from './appraisal/appraisal-form/apprasial-form/apprasial-form';
import { AppraisalTable } from './appraisal/appraisal-table/appraisal-table/appraisal-table';
import { LeaveRequest } from './leaves/leave-request/leave-request/leave-request';
import { PermissionRequest } from './leaves/leave-request/leave-request/permission-request/permission-request/permission-request';
import { WorkFromHome } from './leaves/work-from-home/work-from-home';
import { BalancesAccruals } from './leaves/balances-accruals/balances-accruals';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'employee', component: EmployeeForm, canActivate: [authGuard] },
    { path: 'appraisal-form', component: ApprasialForm },
    { path: 'appraisal-table', component: AppraisalTable },
    { path: 'leave-request', component: LeaveRequest },
    { path: 'permission-request', component: PermissionRequest },
    { path: 'wfh', component: WorkFromHome },
    { path: 'balances-accruals', component: BalancesAccruals },
    { path: '**', redirectTo: 'login', pathMatch: 'full' }

];
