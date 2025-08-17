import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Recuriting, Job, Candidate, Application } from '../../services/recruiting/recuriting';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-application-create',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './application-create.html',
  styleUrl: './application-create.css'
})

export class ApplicationCreate implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(Recuriting);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  jobs: Job[] = [];
  saving = false;
  error?: string;

  form = this.fb.group({
    jobId: [null as number | null, Validators.required],
    candidate: this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      source: [''],
      resumeUrl: [''],
    }),
  });

  ngOnInit() {
    const jobIdFromQuery = Number(this.route.snapshot.queryParamMap.get('jobId'));
    if (jobIdFromQuery) this.form.patchValue({ jobId: jobIdFromQuery });

    this.api.listJobs({ status: 'OPEN', pageSize: 100 }).subscribe(res => (this.jobs = res.rows));
  }

  submit() {
    this.error = undefined;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.api.createApplication(this.form.value as any).subscribe({
      next: (_app: Application) => {
        alert('Application created!');
        this.router.navigate(['/recruiting']);
      },
      error: (e) => (this.error = e?.error?.error || 'Failed to create'),
      complete: () => (this.saving = false),
    });
  }
}
