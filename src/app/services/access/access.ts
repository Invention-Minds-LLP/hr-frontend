import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

export interface PermissionRow {
  id: number;
  name: string;
  label: string | null;
  module: string | null;
}

export interface RoleGrants {
  id: number;
  name: string;
  permissions: string[];
}

export interface OverriddenEmployee {
  id: number;
  name: string;
  employeeCode: string;
  roleName: string | null;
  departmentName: string | null;
  overrides: { name: string; granted: boolean; note: string | null }[];
}

export interface EmployeeOption {
  id: number;
  name: string;
  employeeCode: string;
  roleName: string | null;
  departmentName: string | null;
}

export interface EmployeeAccessDetail {
  employee: {
    id: number;
    name: string;
    employeeCode: string;
    roleId: number | null;
    roleName: string | null;
  };
  /** What the role alone grants — the baseline the overrides deviate from. */
  fromRole: string[];
  overrides: { name: string; granted: boolean; note: string | null }[];
  /** role + grants − denies, i.e. what the person actually gets today. */
  effective: string[];
}

export interface ScopeOption {
  id: number;
  name: string;
  location?: string | null;
}

export interface ScopedEmployee {
  employeeId: number;
  name: string;
  employeeCode: string | null;
  roleName: string | null;
  ownBranch: string | null;
  branches: { id: number; name: string }[];
  departments: { id: number; name: string }[];
}

export interface EmployeeScopeDetail {
  employee: {
    id: number;
    name: string;
    employeeCode: string;
    roleName: string | null;
    ownBranch: { id: number; name: string } | null;
    ownDepartment: { id: number; name: string } | null;
  };
  /** true = sees every branch. Turning this off is what starts the isolation. */
  isGlobal: boolean;
  branchIds: number[];
  departmentIds: number[];
}

/**
 * Role Permissions admin API. Every call requires `masters.permissions.manage`,
 * so a 403 here means the screen was reached without it.
 *
 * The data-scope calls are the exception — they require
 * `masters.dataScope.manage` instead, so holding one key does not imply the other.
 */
@Injectable({ providedIn: 'root' })
export class Access {
  private apiUrl = environment.apiUrl + '/access';

  constructor(private http: HttpClient) {}

  getMatrix(): Observable<{ permissions: PermissionRow[]; roles: RoleGrants[] }> {
    return this.http.get<{ permissions: PermissionRow[]; roles: RoleGrants[] }>(
      `${this.apiUrl}/matrix`,
    );
  }

  setRolePermissions(roleId: number, permissions: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/roles/${roleId}/permissions`, { permissions });
  }

  listOverriddenEmployees(): Observable<{ employees: OverriddenEmployee[] }> {
    return this.http.get<{ employees: OverriddenEmployee[] }>(`${this.apiUrl}/overrides`);
  }

  searchEmployees(search: string): Observable<{ employees: EmployeeOption[] }> {
    return this.http.get<{ employees: EmployeeOption[] }>(`${this.apiUrl}/employees`, {
      params: { search },
    });
  }

  getEmployeeOverrides(employeeId: number): Observable<EmployeeAccessDetail> {
    return this.http.get<EmployeeAccessDetail>(`${this.apiUrl}/employees/${employeeId}/overrides`);
  }

  setEmployeeOverrides(
    employeeId: number,
    overrides: { name: string; granted: boolean; note?: string }[],
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/employees/${employeeId}/overrides`, { overrides });
  }

  // ── Data scope (branch isolation) ────────────────────────────────────────

  getScopeOptions(): Observable<{ branches: ScopeOption[]; departments: ScopeOption[] }> {
    return this.http.get<{ branches: ScopeOption[]; departments: ScopeOption[] }>(
      `${this.apiUrl}/scopes/options`,
    );
  }

  listScopedEmployees(): Observable<{ employees: ScopedEmployee[] }> {
    return this.http.get<{ employees: ScopedEmployee[] }>(`${this.apiUrl}/scopes`);
  }

  getEmployeeScope(employeeId: number): Observable<EmployeeScopeDetail> {
    return this.http.get<EmployeeScopeDetail>(`${this.apiUrl}/scopes/${employeeId}`);
  }

  /** Empty arrays clear the scope, restoring global access. */
  setEmployeeScope(
    employeeId: number,
    branchIds: number[],
    departmentIds: number[],
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/scopes/${employeeId}`, { branchIds, departmentIds });
  }
}
