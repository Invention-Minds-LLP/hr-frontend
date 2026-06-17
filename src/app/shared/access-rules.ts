/**
 * Centralised access rules so role checks aren't scattered across the app.
 *
 * If you add another person who needs access, edit the allowlist below — the
 * dashboard, navbar link, login redirect, and landing-redirect guard all read
 * from this file.
 */

/** Employees (by `empId`) who can access the Management Dashboard even though
 *  their role is not Management (roleId !== 4). Use the numeric `empId`
 *  primary key, NOT the display employeeCode like "EMP001". */
export const MGMT_DASHBOARD_EMPID_ALLOWLIST: number[] = [
  // TODO: add the empId here, e.g.  42,
  4,1
];

/** True if the currently-logged-in user can see the Management Dashboard.
 *  Reads from localStorage so it works in components, guards, and Login alike. */
export function canAccessManagementDashboard(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const roleId = Number(localStorage.getItem('roleId') || 0);
  if (roleId === 4) return true;
  const empId = Number(localStorage.getItem('empId') || 0);
  return empId > 0 && MGMT_DASHBOARD_EMPID_ALLOWLIST.includes(empId);
}

/** Same check but accepts the role + empId directly — useful right after
 *  login when localStorage hasn't been populated yet. */
export function canAccessManagementDashboardFor(roleId: number | string | undefined, empId: number | string | undefined): boolean {
  if (Number(roleId) === 4) return true;
  const eid = Number(empId);
  return eid > 0 && MGMT_DASHBOARD_EMPID_ALLOWLIST.includes(eid);
}
