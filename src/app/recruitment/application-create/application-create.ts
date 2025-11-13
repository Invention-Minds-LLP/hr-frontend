import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Recuriting, Job, Candidate, Application } from '../../services/recruiting/recuriting';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-application-create',
  imports: [FormsModule, ReactiveFormsModule, CommonModule,ProgressSpinnerModule],
  templateUrl: './application-create.html',
  styleUrl: './application-create.css',
  providers: [MessageService],
})

export class ApplicationCreate implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(Recuriting);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);

  jobs: Job[] = [];
  saving = false;
  error?: string;
  loading = true

  form = this.fb.group({
    jobId: [null as number | null, Validators.required],
    candidate: this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      source: [''],
      resumeUrl: [''],  
      qualification: [''],
      experience: [''],
      address:[''],
    }),
  });

  ngOnInit() {
    const jobIdFromQuery = Number(this.route.snapshot.queryParamMap.get('jobId'));
    if (jobIdFromQuery) this.form.patchValue({ jobId: jobIdFromQuery });
    this.loading = true

    this.api.listJobs({ status: 'OPEN', pageSize: 100 }).subscribe(res => (this.jobs = res.rows));
    setTimeout(()=>{
      this.loading = false
    }, 2000)
  }

  // submit() {
  //   this.error = undefined;
  //   if (this.form.invalid) {
  //     this.form.markAllAsTouched();
  //     return;
  //   }
  //   this.saving = true;
  //   this.form.value.candidate?.experience?.toString() // default to 0 if not provided
  //   this.api.createApplication(this.form.value as any).subscribe({
  //     next: (_app: Application) => {
  //       // alert('Application created!');
  //       this.messageService.add({severity:'success', summary:'Success', detail:'Application created!'});
  //       this.router.navigate(['/recruitment/jobs']);
  //       this.form.reset();
  //     },
  //     error: (e) => (this.error = e?.error?.error || 'Failed to create'),
  //     complete: () => (this.saving = false),
  //   });
  // }
  submit() {
    this.error = undefined;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if(this.selectedResumeFile === undefined){
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: "Please upload your resume!",
      });
      this.saving = false;
      return;
    }
  
    this.saving = true;
  
    // build FormData for multipart
    const formData = new FormData();
    formData.append("jobId", this.form.value.jobId!.toString());
  
    // stringify candidate group
    formData.append("candidate", JSON.stringify(this.form.value.candidate));
  
    // attach resume file if selected
    if (this.selectedResumeFile) {
      formData.append("resume", this.selectedResumeFile);
    }
  
    this.api.createApplication(formData).subscribe({
      next: (_app: Application) => {
        this.messageService.add({
          severity: "success",
          summary: "Success",
          detail: "Application created!",
        });
        this.router.navigate(["/recruitment/jobs"]);
        this.form.reset();
        this.selectedResumeFile = undefined;
      },
      error: (e) => (this.error = e?.error?.error || "Failed to create"),
      complete: () => (this.saving = false),
    });
  }
  
  selectedResumeFile?: File;

onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    this.selectedResumeFile = input.files[0];
  }
}
}
