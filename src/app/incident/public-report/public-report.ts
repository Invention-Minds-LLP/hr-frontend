import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { Incident } from '../../services/incident/incident';

/**
 * Public anonymous incident report page — accessible WITHOUT login.
 *
 * Two modes:
 *   • Submit form         → POST /incidents/public/report
 *   • Track previous case → GET  /incidents/public/track/:token
 *
 * The submit returns a `trackingToken` and a friendly `caseReference`.
 * We persist the token in localStorage so the user can re-open the page
 * later and check progress without remembering the token themselves.
 */
@Component({
  selector: 'app-public-report',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ToastModule, ButtonModule, InputTextModule, TextareaModule, SelectModule,
  ],
  providers: [MessageService],
  templateUrl: './public-report.html',
  styleUrl: './public-report.css',
})
export class PublicReport implements OnInit {
  private api    = inject(Incident);
  private toast  = inject(MessageService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  /* ── State ──────────────────────────────────────── */
  /** 'form' = submit a new report; 'track' = check status of an existing one. */
  mode: 'form' | 'track' = 'form';

  loading = false;
  submitted = false;

  // Submit form
  categories: any[] = [];
  form = {
    categoryId: null as number | null,
    title: '',
    description: '',
    location: '',
    contactInfo: '',  // optional — anonymous reporter may want a callback channel
  };
  result: { caseReference: string; trackingToken: string } | null = null;

  // Track flow
  trackToken = '';
  trackingResult: any = null;
  trackError: string | null = null;

  ngOnInit() {
    this.loadCategories();
    // If the URL contains ?track=TOKEN or /:token, jump straight to track mode.
    const tokenFromUrl = this.route.snapshot.paramMap.get('token')
                       ?? this.route.snapshot.queryParamMap.get('track');
    if (tokenFromUrl) {
      this.mode = 'track';
      this.trackToken = tokenFromUrl;
      this.runTrack();
      return;
    }
    // Otherwise, restore last token from localStorage so the user can quickly
    // check on a previously-submitted report.
    const saved = localStorage.getItem('incident_public_token');
    if (saved) this.trackToken = saved;
  }

  private loadCategories() {
    this.api.publicCategories().subscribe({
      next: (rows) => {
        this.categories = (rows ?? []).map((c) => ({
          label: c.name + (c.description ? ` — ${c.description}` : ''),
          value: c.id,
        }));
      },
      error: () => {
        this.toast.add({
          severity: 'warn',
          summary: 'Categories unavailable',
          detail: 'Could not load report categories. Please try again later.',
        });
      },
    });
  }

  switchMode(mode: 'form' | 'track') {
    this.mode = mode;
    this.submitted = false;
    this.result = null;
    this.trackingResult = null;
    this.trackError = null;
  }

  /* ── Submit ───────────────────────────────────────── */
  submit() {
    if (!this.form.categoryId || !this.form.title.trim() || !this.form.description.trim()) {
      this.toast.add({
        severity: 'warn',
        summary: 'Missing fields',
        detail: 'Category, title, and description are required.',
      });
      return;
    }
    this.loading = true;
    this.api.publicReport({
      categoryId:  this.form.categoryId,
      title:       this.form.title.trim(),
      description: this.form.description.trim(),
      location:    this.form.location.trim() || null,
      contactInfo: this.form.contactInfo.trim() || null,
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.submitted = true;
        this.result = { caseReference: res.caseReference, trackingToken: res.trackingToken };
        // Save token so the next visit pre-fills the track box.
        try { localStorage.setItem('incident_public_token', res.trackingToken); } catch {}
        this.toast.add({
          severity: 'success',
          summary: 'Report submitted',
          detail: 'Save the tracking code below — you will need it to check status.',
          life: 6000,
        });
      },
      error: (err) => {
        this.loading = false;
        this.toast.add({
          severity: 'error',
          summary: 'Submit failed',
          detail: err?.error?.error ?? 'Could not submit your report. Try again.',
          life: 6000,
        });
      },
    });
  }

  copyToken() {
    if (!this.result?.trackingToken) return;
    navigator.clipboard.writeText(this.result.trackingToken)
      .then(() => this.toast.add({ severity: 'success', summary: 'Copied', detail: 'Tracking code copied to clipboard.' }))
      .catch(() => {});
  }

  startNew() {
    this.submitted = false;
    this.result = null;
    this.form = { categoryId: null, title: '', description: '', location: '', contactInfo: '' };
  }

  /* ── Track ────────────────────────────────────────── */
  runTrack() {
    const token = this.trackToken.trim();
    if (!token) {
      this.trackError = 'Enter your tracking code.';
      return;
    }
    this.trackError = null;
    this.trackingResult = null;
    this.loading = true;
    this.api.publicTrack(token).subscribe({
      next: (res) => {
        this.loading = false;
        this.trackingResult = res;
      },
      error: (err) => {
        this.loading = false;
        this.trackError = err?.error?.error ?? 'No report found for that code.';
      },
    });
  }

  goLogin() {
    this.router.navigateByUrl('/login');
  }
}
