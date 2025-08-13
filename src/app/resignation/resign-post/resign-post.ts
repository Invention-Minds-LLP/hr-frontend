import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { BadgeModule } from 'primeng/badge';
import { ToastModule } from 'primeng/toast';

import { Resignation } from '../../services/resignation/resignation';
import { MessageService } from 'primeng/api';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';
type ClearanceType = 'IT'|'FINANCE'|'HR'|'ADMIN'|'SECURITY'|'OTHER';
type ApprovalDecision = 'PENDING'|'APPROVED'|'REJECTED';
type SettlementStatus = 'DUE'|'PROCESSING'|'PAID';

@Component({
  selector: 'app-resign-post',
  imports: [    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, InputTextModule, TextareaModule,
    Select, DatePicker, BadgeModule, ToastModule],
  templateUrl: './resign-post.html',
  styleUrl: './resign-post.css',
  providers: [MessageService]
})
export class ResignPost implements OnInit {

  @Input() resignationId!: number;
  @Input() employeeName?: string; // optional label in header

  // ---- HANDOVER ----
  taskForm!: FormGroup;
  tasksLocal: Array<any> = []; // shows tasks added in this session (until you add GET endpoints)

  // ---- CLEARANCE ----
  clearanceTypes: ClearanceType[] = ['IT','FINANCE','HR','ADMIN','SECURITY','OTHER'];
  clearanceDrafts: Record<ClearanceType, { decision: ApprovalDecision; note?: string; verifierId?: number }> = {
    IT: { decision: 'PENDING' },
    FINANCE: { decision: 'PENDING' },
    HR: { decision: 'PENDING' },
    ADMIN: { decision: 'PENDING' },
    SECURITY: { decision: 'PENDING' },
    OTHER: { decision: 'PENDING' }
  };

  // ---- EXIT INTERVIEW ----
  exitAt?: Date | null = null;
  interviewerId?: number;
  exitNotes: string = '';

  // ---- F&F ----
  fnfStatus: SettlementStatus = 'DUE';
  fnfNote: string = '';

  // UI
  busy = signal(false);
  toast = signal<{type:'success'|'error'|'info'; msg:string} | null>(null);
  employeeId = Number(localStorage.getItem('empId') );

  lockedClearances: Record<ClearanceType, boolean> = {
    IT: false, FINANCE: false, HR: false, ADMIN: false, SECURITY: false, OTHER: false
  };

  constructor(private fb: FormBuilder, private api: Resignation, private msg: MessageService) {}

  ngOnInit(): void {
    if (!this.resignationId) return;
    this.taskForm = this.fb.group({
      tasks: this.fb.array([ this.newTaskRow() ])
    });
    this.loadPostHrSnapshot()
    
  }
  private notify(
    type: 'success'|'error'|'info'|'warn',
    detail: string,
    summary = type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info'
  ) {
    this.msg.add({ severity: type, summary, detail });
  }

  private loadPostHrSnapshot() {
    this.api.get(this.resignationId).subscribe({
      next: row => {
        // --- tasks ---
        this.tasksLocal = (row.handoverTasks || []).map((t: any) => ({
          ...t,
          // normalize dates to Date for templates if you want to display/edit
          dueDate: t.dueDate ? new Date(t.dueDate) : null
        }));
  
        // --- clearances ---
        // start with defaults
        this.clearanceTypes.forEach(t => {
          this.clearanceDrafts[t] = { decision: 'PENDING' };
          this.lockedClearances[t] = false;
        });
        (row.clearances || []).forEach((c: any) => {
          const type = c.type as ClearanceType;
          this.clearanceDrafts[type] = {
            decision: c.decision as ApprovalDecision,
            note: c.note ?? '',
            verifierId: c.verifierId ?? undefined
          };
          if (c.decision === 'APPROVED') {
            this.lockedClearances[type] = true; // hide Save on approved
          }
        });
  
        // --- exit interview ---
        if (row.exitInterview) {
          this.exitAt      = row.exitInterview.scheduledAt ? new Date(row.exitInterview.scheduledAt) : null;
          this.interviewerId = row.exitInterview.interviewerId ?? undefined;
          this.exitNotes     = row.exitInterview.notes ?? '';
        }
  
        // --- final settlement ---
        if (row.finalSettlement) {
          this.fnfStatus = row.finalSettlement.status as SettlementStatus;
          this.fnfNote   = row.finalSettlement.note ?? '';
        }
      },
      error: () => this.notify('error', 'Failed to load resignation details.')
    });
  }

  // ===== HANDOVER TASKS =====
  get tasks(): FormArray { return this.taskForm.get('tasks') as FormArray; }

  newTaskRow(): FormGroup {
    return this.fb.group({
      title: ['', Validators.required],
      description: [''],
      assigneeId: [this.employeeId],
      dueDate: [null]
    });
  }
  addTaskRow() { this.tasks.push(this.newTaskRow()); }
  removeTaskRow(i: number) { this.tasks.removeAt(i); }

  async submitTasks() {
    if (this.taskForm.invalid) {this.notify('error', 'Please fill required fields.'); return; }
    this.busy.set(true);
    try {
      const payload = this.tasks.value.map((t:any)=>({
        title: t.title,
        description: t.description || undefined,
        assigneeId: t.assigneeId ? Number(t.assigneeId) : undefined,
        dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : undefined
      }));
      const created = await this.api.addTasks(this.resignationId, payload).toPromise();
      // show what we just created
      this.tasksLocal.push(...(created || []));
      // reset to one blank row
      this.taskForm.setControl('tasks', this.fb.array([ this.newTaskRow() ]));
      this.notify('success', 'Handover tasks added.');
    } catch {
      this.notify('error', 'Failed to add tasks.');
    } finally { this.busy.set(false); }
  }

  // status buttons for rows we just added (or if you later bind with GET results)
  setTaskStatus(row: any, status: TaskStatus) {
    if (!row?.id) { return; } // only server-created rows will have id
    this.api.updateTask(this.resignationId, row.id, status).subscribe({
      next: (upd) => {
        row.status = upd.status;
        row.completedAt = upd.completedAt;
        this.notify('success','Task updated.'); 
      },
      error: () => this.notify('error','Task update failed.')
    });
  }
  isClearanceLocked(t: ClearanceType) {
    return !!this.lockedClearances[t];
  }
  // ===== CLEARANCES =====
  saveClearance(t: ClearanceType) {
    const d = this.clearanceDrafts[t];
    this.api.upsertClearance(this.resignationId, {
      type: t,
      decision: d.decision,
      note: d.note,
      verifierId: d.verifierId
    }).subscribe({
      next: (row: { decision: ApprovalDecision }) => {
        // lock after a successful APPROVED save
        if (row?.decision === 'APPROVED') {
          this.lockedClearances[t] = true;
        }
        this.notify('success', `${t} clearance saved.`);
      },
      error: () => this.notify('error', `${t} clearance failed.`)
  
    });
  }

  // ===== EXIT INTERVIEW =====
  scheduleExit() {
    const scheduledAt = this.exitAt ? new Date(this.exitAt).toISOString() : undefined;
    this.api.scheduleExitInterview(this.resignationId, {
      scheduledAt, interviewerId: this.interviewerId, notes: this.exitNotes
    }).subscribe({
      next: () => this.notify('success', 'Exit interview scheduled.'),
      error: () => this.notify('error', 'Scheduling failed.')
    });
  }

  // ===== FINAL SETTLEMENT =====
  saveFnF() {
    this.api.setFinalSettlement(this.resignationId, { status: this.fnfStatus, note: this.fnfNote }).subscribe({
      next: () => this.notify('success', 'Final settlement updated.'),
      error: () => this.notify('error', 'Final settlement failed.')
    });
  }

  // ===== COMPLETE =====
  markCompleted() {
    this.api.markCompleted(this.resignationId).subscribe({
      next: () => this.notify('success', 'Resignation marked as COMPLETED.'),
      error: () => this.notify('error', 'Completion failed.')
    });
  }
}
