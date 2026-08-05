import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Recuriting } from '../services/recruiting/recuriting';

/** Candidate portal — view and accept/decline your own offer letter. */
@Component({
  selector: 'app-candidate-offers',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, ButtonModule, DialogModule, TagModule, ToastModule],
  templateUrl: './candidate-offers.html',
  styleUrl: './candidate-offers.css',
  providers: [MessageService],
})
export class CandidateOffers {
  username = localStorage.getItem('name') || 'Candidate';
  candidateId = Number(localStorage.getItem('candidateId'));
  offers: any[] = [];
  loading = true;
  acting = false;

  // Accept dialog
  acceptOpen = false;
  acceptTarget: any = null;

  // Decline dialog
  declineOpen = false;
  declineTarget: any = null;
  declineReason = '';

  constructor(private api: Recuriting, private router: Router, private msg: MessageService) {}

  ngOnInit() { this.load(); }

  load() {
    if (!this.candidateId) { this.loading = false; return; }
    this.loading = true;
    this.api.getCandidateOffers(this.candidateId).subscribe({
      next: (rows) => {
        this.offers = rows || [];
        this.loading = false;
        // Auto-mark freshly-sent offers as viewed.
        for (const r of this.offers) {
          if (r.offer?.status === 'SENT') {
            this.api.markOfferViewed(r.offer.id).subscribe({ next: (o: any) => { r.offer = o; }, error: () => {} });
          }
        }
      },
      error: () => { this.loading = false; },
    });
  }

  canAct(o: any): boolean {
    return o?.status === 'SENT' || o?.status === 'VIEWED';
  }

  statusSeverity(s: string): 'success' | 'danger' | 'warn' | 'info' {
    switch (s) {
      case 'SIGNED': return 'success';
      case 'DECLINED': case 'WITHDRAWN': case 'EXPIRED': return 'danger';
      case 'SENT': case 'VIEWED': return 'warn';
      default: return 'info';
    }
  }
  statusLabel(s: string): string {
    if (s === 'SIGNED') return 'Accepted';
    if (s === 'DRAFT') return 'Pending';
    return s ? s.charAt(0) + s.slice(1).toLowerCase() : '';
  }

  viewLetter(r: any) {
    this.api.getOfferPdf(r.offer.id).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Could not open the offer letter.' }),
    });
  }

  accept(r: any) { this.acceptTarget = r; this.acceptOpen = true; }

  confirmAccept() {
    if (!this.acceptTarget) return;
    this.acting = true;
    this.api.markOfferSigned(this.acceptTarget.offer.id).subscribe({
      next: (o: any) => {
        this.acting = false; this.acceptOpen = false; this.acceptTarget.offer = o;
        this.msg.add({ severity: 'success', summary: 'Accepted', detail: 'You have accepted the offer. HR will be in touch.' });
      },
      error: (err) => {
        this.acting = false;
        this.msg.add({ severity: 'error', summary: 'Error', detail: err?.error?.error || err?.error?.message || 'Failed to accept' });
      },
    });
  }

  openDecline(r: any) { this.declineTarget = r; this.declineReason = ''; this.declineOpen = true; }

  submitDecline() {
    if (!this.declineTarget) return;
    this.acting = true;
    this.api.declineOffer(this.declineTarget.offer.id, this.declineReason.trim() || undefined).subscribe({
      next: (o: any) => {
        this.acting = false; this.declineOpen = false; this.declineTarget.offer = o;
        this.msg.add({ severity: 'success', summary: 'Declined', detail: 'You have declined the offer.' });
      },
      error: (err) => {
        this.acting = false;
        this.msg.add({ severity: 'error', summary: 'Error', detail: err?.error?.error || err?.error?.message || 'Failed to decline' });
      },
    });
  }

  goToTests() { this.router.navigate(['/candidate-tests']); }
}
