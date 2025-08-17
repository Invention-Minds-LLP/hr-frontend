import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Recuriting, Job } from '../../services/recruiting/recuriting';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Departments, Department } from '../../services/departments/departments';


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

  
  departments: Department[] = [];
  saving = false;
  error?: string;
  created?: Job;
  userId: string = ''

  form = this.fb.group({
    title: ['', Validators.required],
    departmentId: [null as number | null, Validators.required],
    location: [''],
    headcount: [1, [Validators.required, Validators.min(1)]],
    createdBy: [null as number | null], // your current user id
  });


  ngOnInit(){
    this.deptApi.getDepartments().subscribe({
      next: (rows) => (this.departments = rows || []),
      error: () => (this.departments = []),
    });
    this.userId = localStorage.getItem('empId')|| ''
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
        alert('Job created!');
        // this.router.navigate(['/recruiting']); // or to job list
      },
      error: (e) => (this.error = e?.error?.error || 'Failed to create'),
      complete: () => (this.saving = false),
    });
  }
}
