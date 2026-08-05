/**
 * Permission keys — mirror of hr-backend/src/lib/permissions.ts.
 *
 * The backend OWNS the rules; this file only mirrors the key names so templates
 * and route configs get compile-time checking instead of silently typo-ing a
 * key into permanent `false`. Keep the two lists in sync — if you add a key on
 * the server, add it here too.
 *
 * The permission SET for the current user comes from GET /api/me/permissions
 * via PermissionService; never derive it in the browser.
 */

export const PERMISSION_KEYS = [
  // Top-level dashboards
  'dashboard.hr.view',
  'dashboard.management.view',
  'dashboard.hrAnalytics.view',

  // Menu sections (the headings themselves)
  'admin.section.view',
  'hrManual.section.view',
  'recruitment.section.view',
  'masters.section.view',

  // Administration › Workforce
  'admin.employee.view',
  'admin.attendance.view',
  'admin.leave.view',

  // Administration › Performance
  'admin.weeklyTracker.view',
  'admin.appraisal.view',
  'admin.training.view',
  'admin.pip.view',

  // Administration › Compliance
  'admin.resignation.view',
  'admin.incidents.view',
  'admin.complaints.view',
  'admin.committees.view',

  // Administration › HR Ops
  'admin.incentiveRequests.view',
  'admin.shifts.view',
  'admin.otApprovals.view',
  'admin.reports.view',
  'admin.payroll.view',
  'admin.taxDeclarations.view',
  'admin.companies.view',
  'admin.letters.view',
  'admin.assets.view',
  'admin.moduleUtilization.view',

  // HR Manual Entries
  'admin.forcePresent.view',
  'admin.hrCorrections.view',
  'admin.encashment.view',
  'admin.compOff.view',
  'admin.incentives.view',
  'admin.loans.view',

  // Recruitment
  'recruitment.jobs.view',
  'recruitment.internships.view',
  'recruitment.interviews.view',
  'recruitment.requisition.view',

  // Masters
  'masters.departments.view',
  'masters.designations.view',
  'masters.roles.view',
  'masters.leaveTypes.view',
  'masters.shiftTemplates.view',
  'masters.holidays.view',
  'masters.incidentCategories.view',
  // The Role Permissions matrix itself — holding it means being able to grant
  // yourself anything, so it is seeded to HR Manager only.
  'masters.permissions.manage',
  // Assigns which branches/departments a person's data is limited to.
  'masters.dataScope.manage',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
