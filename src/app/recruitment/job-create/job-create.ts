import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Recuriting, Job } from '../../services/recruiting/recuriting';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Departments, Department } from '../../services/departments/departments';
import { MessageService } from 'primeng/api';


@Component({
  selector: 'app-job-create',
  imports: [FormsModule, ReactiveFormsModule,CommonModule],
  templateUrl: './job-create.html',
  styleUrl: './job-create.css'
})
export class JobCreate {
  private fb = inject(FormBuilder);
  private api = inject(Recuriting);
  private deptApi = inject(Departments);
  private router = inject(Router);


  constructor(private messageService : MessageService){}

  
  departments: Department[] = [];
  saving = false;
  error?: string;
  created?: Job;
  userId: string = ''

  /**
   * Interview round sequences. One department often hires several
   * designations that need different orders — a staff nurse screened by a
   * written test first, a ward clerk interviewed first — so the sequence is
   * chosen per job. Left blank, the job takes its department's sequence (or
   * the default), which is what most jobs want.
   */
  roundTemplates: any[] = [];

  form = this.fb.group({
    title: ['', Validators.required],
    departmentId: [null as number | null, Validators.required],
    location: [''],
    headcount: [1, [Validators.required, Validators.min(1)]],
    createdBy: [null as number | null], // your current user id
    roundTemplateId: [null as number | null],
  });


  ngOnInit(){
    this.deptApi.getDepartments().subscribe({
      next: (rows) => (this.departments = rows || []),
      error: () => (this.departments = []),
    });
    this.api.listRoundTemplates().subscribe({
      next: (rows) => (this.roundTemplates = rows || []),
      error: () => (this.roundTemplates = []),
    });
    this.userId = localStorage.getItem('empId')|| ''
  }

  /** "1 Written test → 2 Clinical panel", so the choice is readable. */
  templateFlow(template: any): string {
    return (template?.items || []).map((i: any) => `${i.seq} ${i.name}`).join('  →  ');
  }

  /** What this job will run, given the current choices. */
  get chosenFlow(): string {
    const chosen = this.roundTemplates.find(t => t.id === this.form.value.roundTemplateId);
    if (chosen) return this.templateFlow(chosen);

    const deptId = this.form.value.departmentId;
    const forDept = deptId ? this.roundTemplates.find(t => t.departmentId === deptId) : null;
    if (forDept) return `${this.templateFlow(forDept)}   (from ${forDept.name})`;

    const fallback = this.roundTemplates.find(t => t.isDefault);
    if (fallback) return `${this.templateFlow(fallback)}   (default sequence)`;

    return '1 Panel  →  2 Test  →  3 Management   (built-in order — no sequences configured yet)';
  }

  submit() {
    this.error = undefined;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.form.patchValue({
      createdBy: Number(this.userId)
    })
    console.log(this.form.value)
    this.saving = true;
    this.api.createJob(this.form.value as any).subscribe({
      next: (job) => {
        this.created = job;
        // alert('Job created!');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Job created successfully!'
        });
        this.router.navigate(['/recruitment/jobs']); // or to job list
      },
      error: (e) => (this.error = e?.error?.error || 'Failed to create'),
      complete: () => (this.saving = false),
    });
  }
}
