import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup, FormsModule } from '@angular/forms';
import { Announcements, Attachment } from '../../services/announcement/announcements';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { Card, CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { Departments, Department } from '../../services/departments/departments';
import { Branches, Branch } from '../../services/branches/branches';
import { Roles, Role } from '../../services/roles/roles';
import { Employees, EmployeeRow } from '../../services/employees/employees';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-announcement-form',
  imports: [ReactiveFormsModule, SelectModule, CommonModule, CardModule, DatePickerModule, CheckboxModule, FormsModule, ButtonModule, MultiSelectModule, AutoCompleteModule, RadioButtonModule, TextareaModule,InputTextModule],
  templateUrl: './announcement-form.html',
  styleUrl: './announcement-form.css',
  providers: [MessageService]
})
export class AnnouncementForm {
  form: FormGroup;
  departments: Department[] = [];
  branches: Branch[] = [];
  roles: Role[] = [];
  employees: EmployeeRow[] = [];
  filteredEmployees: EmployeeRow[] = [];
  constructor(
    private fb: FormBuilder,
    private svc: Announcements,
    private msg: MessageService,
    private deptSvc: Departments,
    private branchSvc: Branches,
    private roleSvc: Roles,
    private empSvc: Employees,
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      body: ['', Validators.required],
      type: ['',Validators.required],
      requireAck: [false,Validators.required],
      isPinned: [false, Validators.required],
      startsAt: [new Date(),Validators.required],
      endsAt: [null],
      attachments: this.fb.control<Attachment[]>([]),

      audienceMode: ['ALL', Validators.required],
      audienceDepartments: this.fb.control<number[]>([]),
      audienceBranches: this.fb.control<number[]>([]),
      audienceRoles: this.fb.control<number[]>([]),
      audienceEmployees: this.fb.control<number[]>([])
    });
  }
  get attachments(): Attachment[] {
    return this.form.value.attachments || [];
  }

  ngOnInit() {
    this.loadAudienceData();
  }

  loadAudienceData() {
    this.deptSvc.getDepartments().subscribe((d) => (this.departments = d));
    this.branchSvc.getBranches().subscribe((b) => (this.branches = b));
    this.roleSvc.getRoles().subscribe((r) => (this.roles = r));
    this.empSvc.getEmployees().subscribe((e) => {
      this.employees = e.map((x) => ({
        id: x.id!,
        firstName: x.firstName,
        lastName: x.lastName,
        employeeCode: x.employeeCode,
        departmentId: x.departmentId,
        fullName: `${x.firstName} ${x.lastName} (${x.employeeCode ?? ''})`
      }));
      
      this.filteredEmployees = this.employees;
    });
  }

   // ✅ Employee filtering
   filterEmployees(event: any) {
    const query = (event.query || '').toLowerCase();
    this.filteredEmployees = this.employees.filter(
      (e) =>
        e.firstName.toLowerCase().includes(query) ||
        e.lastName.toLowerCase().includes(query) ||
        (e.employeeCode ?? '').toLowerCase().includes(query)
    );
  }


  uploading = false;

  addAttachment(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input?.files;
    if (!files?.length) return;
  
    const list = [...this.attachments];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const fakeUrl = URL.createObjectURL(f);
      list.push({ name: f.name, url: fakeUrl, file: f });
    }
    this.form.patchValue({ attachments: list });
  }
  
  

  removeAttachment(i: number) {
    const list = [...(this.form.value.attachments || [])];
    list.splice(i, 1);
    this.form.patchValue({ attachments: list });
  }

  submitted = false

  submit() {
    this.submitted =true;

    if (this.form.invalid) {
      this.form.markAllAsTouched()
      this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Fill all required fields' });
      return;
    }
  
    // Build audience JSON for backend
    let audience: any = {};
    switch (this.form.value.audienceMode) {
      case 'ALL':
        audience = { all: true };
        break;
      case 'DEPARTMENTS':
        audience = { departmentId: this.form.value.audienceDepartments };
        break;
      case 'BRANCHES':
        audience = { branchId: this.form.value.audienceBranches };
        break;
      case 'ROLES':
        audience = { roleId: this.form.value.audienceRoles };
        break;
      case 'EMPLOYEES':
        audience = { employeeId: this.form.value.audienceEmployees };
        break;
    }
  
    // Use formData to include both files + fields
    const formData = new FormData();
    formData.append('title', this.form.value.title!);
    formData.append('body', this.form.value.body!);
    formData.append('type', this.form.value.type!);
    formData.append('requireAck', String(this.form.value.requireAck));
    formData.append('isPinned', (this.form.value.isPinned));
    formData.append('startsAt', this.form.value.startsAt?.toISOString());
    if (this.form.value.endsAt) {
      formData.append('endsAt', this.form.value.endsAt.toISOString());
    }
    formData.append('audience', JSON.stringify(audience));
  
    // Attach files
    if (this.form.value.attachments && this.form.value.attachments.length) {
      for (let f of this.form.value.attachments) {
        if (f.file instanceof File) {
          formData.append('attachments', f.file, f.name);
        }
      }
    }
  
    console.log('Submitting FormData...');
  
    this.svc.create(formData).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Created', detail: 'Circular created' });
        this.form.reset({
          type: 'GENERAL',
          requireAck: false,
          isPinned: false,
          audienceMode: 'ALL',
          attachments: []
        });
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to create circular' });
      },
    });
  }
  

  
}
