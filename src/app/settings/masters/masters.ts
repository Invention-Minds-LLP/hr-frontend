import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Departments, Department } from '../../services/departments/departments';
import { Branches, Branch } from '../../services/branches/branches';
import { Designations, Designation } from '../../services/designations/designations';
import { Roles, Role } from '../../services/roles/roles';
import { Leaves } from '../../services/leaves/leaves';
import { Shifts } from '../../services/shifts/shifts';

type MasterTab = 'departments' | 'branches' | 'designations' | 'roles' | 'leaveTypes' | 'shiftTemplates';

@Component({
  selector: 'app-masters',
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, ToastModule,
    DialogModule, InputTextModule, TooltipModule, ToggleSwitchModule, ConfirmDialogModule
  ],
  templateUrl: './masters.html',
  styleUrl: './masters.css',
  providers: [MessageService, ConfirmationService]
})
export class Masters implements OnInit {
  activeTab: MasterTab = 'departments';

  // Data
  departments: Department[] = [];
  branches: Branch[] = [];
  designations: Designation[] = [];
  roles: Role[] = [];
  leaveTypes: any[] = [];
  shiftTemplates: any[] = [];

  loading = false;

  // Dialog
  dialogVisible = false;
  dialogTitle = '';
  isEditing = false;
  editingId: number | null = null;

  // Form fields
  formName = '';
  formLocation = '';
  formDescription = '';
  formIsActive = true;
  formShiftType = 'MORNING';
  formStartTime = '';
  formEndTime = '';

  shiftTypeOptions = [
    { label: 'Morning', value: 'MORNING' },
    { label: 'Evening', value: 'EVENING' },
    { label: 'Night', value: 'NIGHT' },
    { label: 'Flexible', value: 'FLEXIBLE' },
    { label: 'Nursing', value: 'NURSING' },
  ];

  constructor(
    private departmentService: Departments,
    private branchService: Branches,
    private designationService: Designations,
    private roleService: Roles,
    private leaveService: Leaves,
    private shiftService: Shifts,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  switchTab(tab: MasterTab) {
    this.activeTab = tab;
    this.loadData();
  }

  loadData() {
    this.loading = true;
    switch (this.activeTab) {
      case 'departments':
        this.departmentService.getDepartments().subscribe({
          next: (data) => { this.departments = data; this.loading = false; },
          error: () => { this.showError('Failed to load departments'); this.loading = false; }
        });
        break;
      case 'branches':
        this.branchService.getBranches().subscribe({
          next: (data) => { this.branches = data; this.loading = false; },
          error: () => { this.showError('Failed to load branches'); this.loading = false; }
        });
        break;
      case 'designations':
        this.designationService.getDesignations().subscribe({
          next: (data) => { this.designations = data; this.loading = false; },
          error: () => { this.showError('Failed to load designations'); this.loading = false; }
        });
        break;
      case 'roles':
        this.roleService.getRoles().subscribe({
          next: (data) => { this.roles = data; this.loading = false; },
          error: () => { this.showError('Failed to load roles'); this.loading = false; }
        });
        break;
      case 'leaveTypes':
        this.leaveService.getLeaveTypes().subscribe({
          next: (data) => { this.leaveTypes = data; this.loading = false; },
          error: () => { this.showError('Failed to load leave types'); this.loading = false; }
        });
        break;
      case 'shiftTemplates':
        this.shiftService.getShiftTemplates().subscribe({
          next: (data) => { this.shiftTemplates = data; this.loading = false; },
          error: () => { this.showError('Failed to load shift templates'); this.loading = false; }
        });
        break;
    }
  }

  // ── Dialog Open ────────────────────────────────────────────────────────
  openCreateDialog() {
    this.isEditing = false;
    this.editingId = null;
    this.formName = '';
    this.formLocation = '';
    this.formDescription = '';
    this.formIsActive = true;
    this.formShiftType = 'MORNING';
    this.formStartTime = '';
    this.formEndTime = '';
    this.dialogTitle = `Add ${this.getTabLabel()}`;
    this.dialogVisible = true;
  }

  openEditDialog(item: any) {
    this.isEditing = true;
    this.editingId = item.id;
    this.formName = item.name || '';
    this.formLocation = item.location || '';
    this.formDescription = item.description || '';
    this.formIsActive = item.isActive !== undefined ? item.isActive : true;
    this.formShiftType = item.shiftType || 'MORNING';
    this.formStartTime = item.startTime ? this.toTimeString(item.startTime) : '';
    this.formEndTime = item.endTime ? this.toTimeString(item.endTime) : '';
    this.dialogTitle = `Edit ${this.getTabLabel()}`;
    this.dialogVisible = true;
  }

  private toTimeString(dt: string): string {
    const d = new Date(dt);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private toISOTime(time: string): string {
    const [h, m] = time.split(':');
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toISOString();
  }

  getTabLabel(): string {
    switch (this.activeTab) {
      case 'departments': return 'Department';
      case 'branches': return 'Branch';
      case 'designations': return 'Designation';
      case 'roles': return 'Role';
      case 'leaveTypes': return 'Leave Type';
      case 'shiftTemplates': return 'Shift Template';
    }
  }

  // ── Save (Create / Update) ─────────────────────────────────────────────
  save() {
    if (!this.formName.trim()) {
      this.showWarn('Name is required');
      return;
    }

    switch (this.activeTab) {
      case 'departments':
        if (this.isEditing) {
          this.departmentService.updateDepartment(this.editingId!, { name: this.formName }).subscribe({
            next: () => { this.onSaveSuccess('Department updated'); },
            error: (e) => this.onSaveError(e)
          });
        } else {
          this.departmentService.createDepartment({ name: this.formName }).subscribe({
            next: () => { this.onSaveSuccess('Department created'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;

      case 'branches':
        const branchData: Branch = { name: this.formName, location: this.formLocation || undefined };
        if (this.isEditing) {
          this.branchService.updateBranch(this.editingId!, branchData).subscribe({
            next: () => { this.onSaveSuccess('Branch updated'); },
            error: (e) => this.onSaveError(e)
          });
        } else {
          this.branchService.createBranch(branchData).subscribe({
            next: () => { this.onSaveSuccess('Branch created'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;

      case 'designations':
        const desigData: Designation = { name: this.formName, isActive: this.formIsActive };
        if (this.isEditing) {
          this.designationService.updateDesignation(this.editingId!, desigData).subscribe({
            next: () => { this.onSaveSuccess('Designation updated'); },
            error: (e) => this.onSaveError(e)
          });
        } else {
          this.designationService.createDesignation(desigData).subscribe({
            next: () => { this.onSaveSuccess('Designation created'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;

      case 'roles':
        const roleData: Role = { name: this.formName, description: this.formDescription || undefined };
        if (this.isEditing) {
          this.roleService.updateRole(this.editingId!, roleData).subscribe({
            next: () => { this.onSaveSuccess('Role updated'); },
            error: (e) => this.onSaveError(e)
          });
        } else {
          this.roleService.createRole(roleData).subscribe({
            next: () => { this.onSaveSuccess('Role created'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;

      case 'leaveTypes':
        if (!this.isEditing) {
          this.leaveService.createLeaveType(this.formName).subscribe({
            next: () => { this.onSaveSuccess('Leave Type created'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;

      case 'shiftTemplates':
        if (!this.formStartTime || !this.formEndTime) {
          this.showWarn('Start time and end time are required');
          return;
        }
        const shiftData = {
          name: this.formName,
          shiftType: this.formShiftType,
          startTime: this.toISOTime(this.formStartTime),
          endTime: this.toISOTime(this.formEndTime),
        };
        if (this.isEditing) {
          this.shiftService.updateShiftTemplate(this.editingId!, shiftData).subscribe({
            next: () => { this.onSaveSuccess('Shift Template updated'); },
            error: (e) => this.onSaveError(e)
          });
        } else {
          this.shiftService.createShiftTemplate(shiftData).subscribe({
            next: () => { this.onSaveSuccess('Shift Template created'); },
            error: (e) => this.onSaveError(e)
          });
        }
        break;
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  confirmDelete(item: any) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${item.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteItem(item),
    });
  }

  deleteItem(item: any) {
    switch (this.activeTab) {
      case 'departments':
        this.departmentService.deleteDepartment(item.id).subscribe({
          next: () => this.onDeleteSuccess(),
          error: (e) => this.onDeleteError(e)
        });
        break;
      case 'branches':
        this.branchService.deleteBranch(item.id).subscribe({
          next: () => this.onDeleteSuccess(),
          error: (e) => this.onDeleteError(e)
        });
        break;
      case 'designations':
        this.designationService.deleteDesignation(item.id).subscribe({
          next: () => this.onDeleteSuccess(),
          error: (e) => this.onDeleteError(e)
        });
        break;
      case 'roles':
        this.roleService.deleteRole(item.id).subscribe({
          next: () => this.onDeleteSuccess(),
          error: (e) => this.onDeleteError(e)
        });
        break;
      case 'shiftTemplates':
        this.shiftService.deleteShiftTemplate(item.id).subscribe({
          next: () => this.onDeleteSuccess(),
          error: (e) => this.onDeleteError(e)
        });
        break;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  private onSaveSuccess(msg: string) {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: msg });
    this.dialogVisible = false;
    this.loadData();
  }

  private onSaveError(e: any) {
    const msg = e.error?.error || e.error?.message || 'Operation failed';
    this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
  }

  private onDeleteSuccess() {
    this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Record deleted successfully' });
    this.loadData();
  }

  private onDeleteError(e: any) {
    const msg = e.error?.error || 'Delete failed. It may be in use.';
    this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
  }

  private showError(msg: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
  }

  private showWarn(msg: string) {
    this.messageService.add({ severity: 'warn', summary: 'Warning', detail: msg });
  }
}
