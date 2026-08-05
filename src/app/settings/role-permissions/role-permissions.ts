import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import {
  Access, PermissionRow, RoleGrants, OverriddenEmployee, EmployeeOption,
  ScopeOption, ScopedEmployee,
} from '../../services/access/access';
import { PermissionService } from '../../services/auth/permission.service';

type Tab = 'roles' | 'exceptions' | 'scope';
/** Per-permission choice in the exception editor. */
type OverrideState = 'inherit' | 'grant' | 'deny';

/**
 * Role Permissions — the screen that replaced editing code to change access.
 *
 * Roles tab: permissions down, roles across, checkboxes between. Nothing is
 * written until Save, and only roles you actually touched get a request.
 *
 * Exceptions tab: per-person deviations from the role. Three states per
 * permission — inherit (no row), grant (row, granted=true), deny (row,
 * granted=false) — because "no opinion" and "explicitly denied" are different
 * things and a checkbox can't say both.
 *
 * Data Scope tab: a DIFFERENT axis from the other two. Roles and exceptions
 * decide which SCREENS someone opens; scope decides which EMPLOYEES they see
 * once they are on one. Nobody has a scope by default — no rows means "sees
 * everyone", which is how every existing user already behaves — so this tab
 * lists only the people who have been deliberately restricted.
 */
@Component({
  selector: 'app-role-permissions',
  imports: [
    CommonModule, FormsModule, ButtonModule, ToastModule, TooltipModule,
    DialogModule, InputTextModule, ConfirmDialogModule, ModuleGuide,
  ],
  templateUrl: './role-permissions.html',
  styleUrl: './role-permissions.css',
  providers: [MessageService, ConfirmationService],
})
export class RolePermissions implements OnInit {
  activeTab: Tab = 'roles';

  loading = false;
  saving = false;
  loadError = '';

  permissions: PermissionRow[] = [];
  roles: RoleGrants[] = [];
  /** Module heading → its permissions, in catalog order. */
  groups: { module: string; rows: PermissionRow[] }[] = [];

  /** roleId → Set of permission keys. The editable working copy. */
  grants = new Map<number, Set<string>>();
  /** Server state, so Save only sends what actually changed. */
  private original = new Map<number, Set<string>>();

  // ── Exceptions ────────────────────────────────────────────────────────────
  exceptions: OverriddenEmployee[] = [];
  exceptionsLoading = false;

  dialogVisible = false;
  dialogSaving = false;
  /** Null until an employee is picked — the dialog opens on the picker. */
  editingEmployee: EmployeeOption | null = null;
  /** What the picked employee's ROLE grants; the baseline they deviate from. */
  roleBaseline = new Set<string>();
  /** permission key → inherit | grant | deny. Only non-inherit gets saved. */
  draft = new Map<string, OverrideState>();

  employeeQuery = '';
  employeeResults: EmployeeOption[] = [];
  employeeSearching = false;
  private search$ = new Subject<string>();

  // ── Data scope ────────────────────────────────────────────────────────────
  scopedEmployees: ScopedEmployee[] = [];
  scopeLoading = false;
  allBranches: ScopeOption[] = [];
  allDepartments: ScopeOption[] = [];

  scopeDialogVisible = false;
  scopeSaving = false;
  scopeEmployee: EmployeeOption | null = null;
  /** Was this person global when the dialog opened? Drives the warning copy. */
  scopeWasGlobal = true;
  draftBranchIds = new Set<number>();
  draftDepartmentIds = new Set<number>();

  constructor(
    private access: Access,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private perms: PermissionService,
  ) {}

  ngOnInit(): void {
    this.load();

    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => {
          this.employeeSearching = true;
          return this.access.searchEmployees(term);
        }),
      )
      .subscribe({
        next: (res) => {
          this.employeeResults = res.employees;
          this.employeeSearching = false;
        },
        error: () => {
          this.employeeResults = [];
          this.employeeSearching = false;
        },
      });
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.access.getMatrix().subscribe({
      next: (res) => {
        this.permissions = res.permissions;
        this.roles = res.roles;

        this.groups = [];
        for (const p of res.permissions) {
          const module = p.module || 'Other';
          let group = this.groups.find((g) => g.module === module);
          if (!group) {
            group = { module, rows: [] };
            this.groups.push(group);
          }
          group.rows.push(p);
        }

        this.grants = new Map(res.roles.map((r) => [r.id, new Set(r.permissions)]));
        this.original = new Map(res.roles.map((r) => [r.id, new Set(r.permissions)]));
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.loadError =
          err?.error?.code === 'CATALOG_NOT_SEEDED'
            ? 'The permission catalog has not been seeded yet. Run `npm run seed:permissions` on the server.'
            : err?.error?.error || 'Failed to load the permission matrix.';
      },
    });
  }

  loadExceptions(force = false): void {
    if (this.exceptionsLoading || (this.exceptions.length && !force)) return;
    this.exceptionsLoading = true;
    this.access.listOverriddenEmployees().subscribe({
      next: (res) => {
        this.exceptions = res.employees;
        this.exceptionsLoading = false;
      },
      error: () => {
        this.exceptionsLoading = false;
        this.messageService.add({
          severity: 'error', summary: 'Failed', detail: 'Could not load employee exceptions.',
        });
      },
    });
  }

  switchTab(tab: Tab): void {
    this.activeTab = tab;
    if (tab === 'exceptions') this.loadExceptions();
    if (tab === 'scope') this.loadScopes();
  }

  // ── Roles matrix ──────────────────────────────────────────────────────────

  has(roleId: number, key: string): boolean {
    return this.grants.get(roleId)?.has(key) ?? false;
  }

  toggle(roleId: number, key: string): void {
    const set = this.grants.get(roleId);
    if (!set) return;
    if (set.has(key)) set.delete(key);
    else set.add(key);
  }

  /** Tick/untick a whole module for one role — the matrix is 42 rows deep. */
  toggleModule(roleId: number, group: { rows: PermissionRow[] }): void {
    const set = this.grants.get(roleId);
    if (!set) return;
    const allOn = group.rows.every((r) => set.has(r.name));
    for (const r of group.rows) {
      if (allOn) set.delete(r.name);
      else set.add(r.name);
    }
  }

  moduleState(roleId: number, group: { rows: PermissionRow[] }): 'all' | 'some' | 'none' {
    const set = this.grants.get(roleId);
    if (!set) return 'none';
    const on = group.rows.filter((r) => set.has(r.name)).length;
    return on === 0 ? 'none' : on === group.rows.length ? 'all' : 'some';
  }

  countFor(roleId: number): number {
    return this.grants.get(roleId)?.size ?? 0;
  }

  isRoleDirty(roleId: number): boolean {
    const now = this.grants.get(roleId) ?? new Set<string>();
    const was = this.original.get(roleId) ?? new Set<string>();
    if (now.size !== was.size) return true;
    for (const k of now) if (!was.has(k)) return true;
    return false;
  }

  get dirtyRoleIds(): number[] {
    return this.roles.map((r) => r.id).filter((id) => this.isRoleDirty(id));
  }

  get hasChanges(): boolean {
    return this.dirtyRoleIds.length > 0;
  }

  reset(): void {
    this.grants = new Map([...this.original].map(([id, set]) => [id, new Set(set)]));
  }

  save(): void {
    const dirty = this.dirtyRoleIds;
    if (!dirty.length) return;

    // Locking yourself out is one click and a logout away, so make it explicit.
    const losingOwnAccess = dirty.some(
      (id) => !this.grants.get(id)?.has('masters.permissions.manage'),
    );

    const run = () => this.commit(dirty);
    if (losingOwnAccess && this.perms.has('masters.permissions.manage')) {
      this.confirmationService.confirm({
        header: 'Remove permission management?',
        message:
          'One of the roles you edited no longer has "Role Permissions". ' +
          'If that is your own role, you will lose access to this screen and ' +
          'it can only be restored from the server. Continue?',
        acceptLabel: 'Save anyway',
        rejectLabel: 'Cancel',
        accept: run,
      });
    } else {
      run();
    }
  }

  private commit(dirty: number[]): void {
    this.saving = true;
    let remaining = dirty.length;
    let failed = 0;

    for (const roleId of dirty) {
      const keys = [...(this.grants.get(roleId) ?? [])];
      this.access.setRolePermissions(roleId, keys).subscribe({
        next: () => {
          this.original.set(roleId, new Set(keys));
          if (--remaining === 0) this.finish(failed, dirty.length);
        },
        error: (err) => {
          failed += 1;
          console.error('Failed to save role', roleId, err);
          if (--remaining === 0) this.finish(failed, dirty.length);
        },
      });
    }
  }

  private finish(failed: number, total: number): void {
    this.saving = false;
    if (failed === 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Saved',
        detail: `${total} role${total === 1 ? '' : 's'} updated. Users see the change on their next login or page reload.`,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Partly saved',
        detail: `${failed} of ${total} roles failed to save. Reload before editing again.`,
      });
    }
  }

  labelFor(key: string): string {
    return this.permissions.find((p) => p.name === key)?.label || key;
  }

  // ── Exception editor ──────────────────────────────────────────────────────

  openAdd(): void {
    this.editingEmployee = null;
    this.roleBaseline = new Set();
    this.draft = new Map();
    this.employeeQuery = '';
    this.employeeResults = [];
    this.dialogVisible = true;
    this.search$.next('');
  }

  openEdit(emp: OverriddenEmployee): void {
    this.dialogVisible = true;
    this.selectEmployee({
      id: emp.id,
      name: emp.name,
      employeeCode: emp.employeeCode,
      roleName: emp.roleName,
      departmentName: emp.departmentName,
    });
  }

  onEmployeeQuery(term: string): void {
    this.search$.next(term);
  }

  selectEmployee(option: EmployeeOption): void {
    this.editingEmployee = option;
    this.draft = new Map();
    this.roleBaseline = new Set();

    this.access.getEmployeeOverrides(option.id).subscribe({
      next: (detail) => {
        this.roleBaseline = new Set(detail.fromRole);
        const next = new Map<string, OverrideState>();
        for (const o of detail.overrides) next.set(o.name, o.granted ? 'grant' : 'deny');
        this.draft = next;
      },
      error: () =>
        this.messageService.add({
          severity: 'error', summary: 'Failed', detail: 'Could not load this employee.',
        }),
    });
  }

  clearEmployeeSelection(): void {
    this.editingEmployee = null;
    this.draft = new Map();
    this.roleBaseline = new Set();
    this.employeeQuery = '';
    this.search$.next('');
  }

  stateOf(key: string): OverrideState {
    return this.draft.get(key) ?? 'inherit';
  }

  setState(key: string, state: OverrideState): void {
    if (state === 'inherit') this.draft.delete(key);
    else this.draft.set(key, state);
  }

  /** What the person ends up with for this key, given role + the draft. */
  effectiveFor(key: string): boolean {
    const state = this.stateOf(key);
    if (state === 'grant') return true;
    if (state === 'deny') return false;
    return this.roleBaseline.has(key);
  }

  roleGrants(key: string): boolean {
    return this.roleBaseline.has(key);
  }

  /** A grant the role already gives (or a deny it never gave) changes nothing today. */
  isRedundant(key: string): boolean {
    const state = this.stateOf(key);
    if (state === 'inherit') return false;
    return (state === 'grant') === this.roleBaseline.has(key);
  }

  get draftCount(): number {
    return this.draft.size;
  }

  saveOverrides(): void {
    if (!this.editingEmployee) return;
    const employeeId = this.editingEmployee.id;
    const overrides = [...this.draft.entries()].map(([name, state]) => ({
      name,
      granted: state === 'grant',
    }));

    this.dialogSaving = true;
    this.access.setEmployeeOverrides(employeeId, overrides).subscribe({
      next: () => {
        this.dialogSaving = false;
        this.dialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: overrides.length
            ? `${overrides.length} exception${overrides.length === 1 ? '' : 's'} saved.`
            : 'Exceptions cleared — this person now follows their role.',
        });
        this.loadExceptions(true);
      },
      error: () => {
        this.dialogSaving = false;
        this.messageService.add({
          severity: 'error', summary: 'Failed', detail: 'Could not save the exceptions.',
        });
      },
    });
  }

  /** Drop every exception for one person — they fall back to their role. */
  clearOverrides(emp: OverriddenEmployee): void {
    this.confirmationService.confirm({
      header: 'Clear exceptions?',
      message: `${emp.name} will get exactly what the "${emp.roleName}" role grants, nothing more or less.`,
      acceptLabel: 'Clear',
      rejectLabel: 'Cancel',
      accept: () => {
        this.access.setEmployeeOverrides(emp.id, []).subscribe({
          next: () => {
            this.exceptions = this.exceptions.filter((e) => e.id !== emp.id);
            this.messageService.add({
              severity: 'success', summary: 'Cleared', detail: `${emp.name} now follows their role.`,
            });
          },
          error: () =>
            this.messageService.add({
              severity: 'error', summary: 'Failed', detail: 'Could not clear the exceptions.',
            }),
        });
      },
    });
  }

  // ── Data scope ────────────────────────────────────────────────────────────

  loadScopes(force = false): void {
    if (this.scopeLoading || (this.scopedEmployees.length && !force)) return;
    this.scopeLoading = true;

    // Options are needed by the editor and never change mid-session, so they
    // are fetched alongside the list rather than on every dialog open.
    if (!this.allBranches.length) {
      this.access.getScopeOptions().subscribe({
        next: (res) => {
          this.allBranches = res.branches;
          this.allDepartments = res.departments;
        },
        error: () =>
          this.messageService.add({
            severity: 'error', summary: 'Failed', detail: 'Could not load branches.',
          }),
      });
    }

    this.access.listScopedEmployees().subscribe({
      next: (res) => {
        this.scopedEmployees = res.employees;
        this.scopeLoading = false;
      },
      error: () => {
        this.scopeLoading = false;
        this.messageService.add({
          severity: 'error', summary: 'Failed', detail: 'Could not load data scopes.',
        });
      },
    });
  }

  openScopeAdd(): void {
    this.scopeEmployee = null;
    this.scopeWasGlobal = true;
    this.draftBranchIds = new Set();
    this.draftDepartmentIds = new Set();
    this.employeeQuery = '';
    this.employeeResults = [];
    this.scopeDialogVisible = true;
    this.search$.next('');
  }

  openScopeEdit(row: ScopedEmployee): void {
    this.scopeDialogVisible = true;
    this.selectScopeEmployee({
      id: row.employeeId,
      name: row.name,
      employeeCode: row.employeeCode ?? '',
      roleName: row.roleName,
      departmentName: null,
    });
  }

  selectScopeEmployee(option: EmployeeOption): void {
    this.scopeEmployee = option;
    this.draftBranchIds = new Set();
    this.draftDepartmentIds = new Set();

    this.access.getEmployeeScope(option.id).subscribe({
      next: (detail) => {
        this.scopeWasGlobal = detail.isGlobal;
        this.draftBranchIds = new Set(detail.branchIds);
        this.draftDepartmentIds = new Set(detail.departmentIds);
      },
      error: () =>
        this.messageService.add({
          severity: 'error', summary: 'Failed', detail: 'Could not load this employee.',
        }),
    });
  }

  clearScopeSelection(): void {
    this.scopeEmployee = null;
    this.draftBranchIds = new Set();
    this.draftDepartmentIds = new Set();
    this.employeeQuery = '';
    this.search$.next('');
  }

  toggleScopeBranch(id: number): void {
    if (this.draftBranchIds.has(id)) this.draftBranchIds.delete(id);
    else this.draftBranchIds.add(id);
  }

  toggleScopeDepartment(id: number): void {
    if (this.draftDepartmentIds.has(id)) this.draftDepartmentIds.delete(id);
    else this.draftDepartmentIds.add(id);
  }

  /** Nothing ticked = no restriction, i.e. back to seeing everyone. */
  get scopeDraftIsGlobal(): boolean {
    return this.draftBranchIds.size === 0 && this.draftDepartmentIds.size === 0;
  }

  /**
   * Plain-language summary of what the draft actually does. The AND between
   * branch and department is the part people get wrong, so it is spelled out
   * rather than left to be inferred from two checkbox lists.
   */
  get scopeDraftSummary(): string {
    if (this.scopeDraftIsGlobal) return 'Sees every employee in every branch.';
    const branches = [...this.draftBranchIds]
      .map((id) => this.allBranches.find((b) => b.id === id)?.name)
      .filter(Boolean);
    const departments = [...this.draftDepartmentIds]
      .map((id) => this.allDepartments.find((d) => d.id === id)?.name)
      .filter(Boolean);

    if (branches.length && departments.length) {
      return `Sees only ${departments.join(' / ')} employees at ${branches.join(' / ')}.`;
    }
    if (branches.length) return `Sees only employees at ${branches.join(' / ')}.`;
    return `Sees only ${departments.join(' / ')} employees, across all branches.`;
  }

  saveScope(): void {
    if (!this.scopeEmployee) return;
    const employeeId = this.scopeEmployee.id;
    const name = this.scopeEmployee.name;
    const branchIds = [...this.draftBranchIds];
    const departmentIds = [...this.draftDepartmentIds];

    const commit = () => {
      this.scopeSaving = true;
      this.access.setEmployeeScope(employeeId, branchIds, departmentIds).subscribe({
        next: () => {
          this.scopeSaving = false;
          this.scopeDialogVisible = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Saved',
            detail: this.scopeDraftIsGlobal
              ? `${name} can now see every branch again.`
              : `${name} is now limited to ${branchIds.length} branch(es). Takes effect within a minute.`,
          });
          this.loadScopes(true);
        },
        error: (err) => {
          this.scopeSaving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: err?.error?.error || 'Could not save the data scope.',
          });
        },
      });
    };

    // Widening back to global is the change worth a second look — it silently
    // hands someone the whole organisation again.
    if (this.scopeDraftIsGlobal && !this.scopeWasGlobal) {
      this.confirmationService.confirm({
        header: 'Remove the branch restriction?',
        message: `${name} will go back to seeing EVERY employee in EVERY branch. Continue?`,
        acceptLabel: 'Remove restriction',
        rejectLabel: 'Cancel',
        accept: commit,
      });
      return;
    }
    commit();
  }

  clearScope(row: ScopedEmployee): void {
    this.confirmationService.confirm({
      header: 'Remove the branch restriction?',
      message: `${row.name} will go back to seeing EVERY employee in EVERY branch.`,
      acceptLabel: 'Remove restriction',
      rejectLabel: 'Cancel',
      accept: () => {
        this.access.setEmployeeScope(row.employeeId, [], []).subscribe({
          next: () => {
            this.scopedEmployees = this.scopedEmployees.filter(
              (e) => e.employeeId !== row.employeeId,
            );
            this.messageService.add({
              severity: 'success', summary: 'Removed', detail: `${row.name} now sees all branches.`,
            });
          },
          error: () =>
            this.messageService.add({
              severity: 'error', summary: 'Failed', detail: 'Could not remove the restriction.',
            }),
        });
      },
    });
  }
}
