import { Component, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { DownloadOtpService, PictureCaptcha } from './download-otp.service';

/**
 * Two-phase download check, driven by DownloadOtpService.request():
 *   otp       — emailed 6-digit code (skipped while the 60-minute grant lives)
 *   authorize — picture captcha + mandatory reason
 */
@Component({
  selector: 'app-download-otp-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule],
  template: `
    <p-dialog [visible]="!!svc.request()" [modal]="true" [closable]="false" [draggable]="false" [resizable]="false"
              [style]="{ width: '420px', maxWidth: '96vw' }" header="Verify to download" appendTo="body" styleClass="dotp-dialog">
      <div class="dotp">
        <p class="dotp__line">You are downloading <b>{{ svc.request()?.label }}</b>. Every download is recorded with your name and reason.</p>

        @if (phase === 'otp') {
          <p class="dotp__step">Step 1 of 2 · Email code <span class="dotp__muted">(unlocks downloads for 60 minutes)</span></p>
          @if (sending) {
            <p class="dotp__muted"><i class="pi pi-spin pi-spinner"></i> Sending code…</p>
          } @else if (sentTo) {
            <p class="dotp__muted">Code sent to <b>{{ sentTo }}</b></p>
          }
          @if (error) { <p class="dotp__error">{{ error }}</p> }
          <form (ngSubmit)="submitOtp()" #f="ngForm">
            <input class="dotp__input dotp__input--code" name="otp" [(ngModel)]="otp" inputmode="numeric" minlength="6" maxlength="6"
                   autocomplete="one-time-code" placeholder="6-digit code" required [disabled]="!sentTo" />
            <div class="dotp__actions">
              <button type="button" class="dotp__link" [disabled]="sending" (click)="sendOtp()">Resend code</button>
              <span class="dotp__spacer"></span>
              <button type="button" class="dotp__btn dotp__btn--ghost" (click)="close(false)">Cancel</button>
              <button type="submit" class="dotp__btn" [disabled]="!f.valid || busy || !sentTo">{{ busy ? 'Verifying…' : 'Next' }}</button>
            </div>
          </form>
        } @else {
          <p class="dotp__step">{{ needsOtp ? 'Step 2 of 2 · ' : '' }}Picture check and reason</p>
          <div class="dotp__prompt">
            <span>{{ captcha?.prompt || 'Loading picture…' }}</span>
            <button type="button" class="dotp__icon" title="New picture" aria-label="Load a new picture" (click)="loadCaptcha()">
              <i class="pi pi-refresh"></i>
            </button>
          </div>
          <div class="dotp__grid">
            @if (captcha) {
              <img [src]="captcha.image" alt="" width="304" height="304" draggable="false" />
              <div class="dotp__tiles" [style.grid-template-columns]="'repeat(' + captcha.grid + ', 1fr)'">
                @for (t of tiles; track t) {
                  <button type="button" class="dotp__tile" [class.dotp__tile--on]="selected.has(t)" (click)="toggleTile(t)"
                          [attr.aria-pressed]="selected.has(t)" [attr.aria-label]="'Tile ' + (t + 1)">
                    @if (selected.has(t)) { <i class="pi pi-check"></i> }
                  </button>
                }
              </div>
            } @else {
              <div class="dotp__grid-ph"><i class="pi pi-spin pi-spinner"></i></div>
            }
          </div>
          @if (error) { <p class="dotp__error">{{ error }}</p> }
          <form (ngSubmit)="submitAuthorize()" #g="ngForm">
            <label class="dotp__label" for="dotp-reason">Reason for this download *</label>
            <textarea id="dotp-reason" class="dotp__input dotp__textarea" name="reason" [(ngModel)]="reason" required minlength="5" maxlength="500"
                      placeholder="e.g. Monthly payroll audit for finance"></textarea>
            <div class="dotp__actions">
              <span class="dotp__spacer"></span>
              <button type="button" class="dotp__btn dotp__btn--ghost" (click)="close(false)">Cancel</button>
              <button type="submit" class="dotp__btn" [disabled]="!g.valid || busy || !captcha || selected.size === 0">{{ busy ? 'Checking…' : 'Download' }}</button>
            </div>
          </form>
        }
      </div>
    </p-dialog>
  `,
  styles: [`
    /* Dark, to match the app (and the global .p-dialog override that paints
       every dialog #020403). Shell colours live in styles.css under .dotp-dialog. */
    .dotp { font-family: inherit; color: #e5e7eb; }
    .dotp__line { margin: 0 0 14px; font-size: 13px; line-height: 1.5; color: #cbd5e1; }
    .dotp__line b { color: #fff; }
    .dotp__step { margin: 0 0 10px; font-size: 12.5px; font-weight: 600; color: #FB9C2A; text-transform: uppercase; letter-spacing: .4px; }
    .dotp__muted { margin: 0 0 8px; font-size: 12.5px; font-weight: 400; color: #94a3b8; text-transform: none; letter-spacing: 0; }
    .dotp__muted b { color: #fff; }
    .dotp__error { margin: 0 0 8px; padding: 8px 10px; border-radius: 8px; font-size: 12.5px; color: #fecaca; background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.35); }
    .dotp__label { display: block; margin: 12px 0 6px; font-size: 12.5px; color: #e5e7eb; }
    .dotp__input { width: 100%; box-sizing: border-box; height: 40px; padding: 0 12px; border: 1px solid #3a3a46; border-radius: 9px;
                   background: #15151c; color: #fff; font-family: inherit; font-size: 14px; outline: none; user-select: text; }
    .dotp__input::placeholder { color: #6b7280; }
    .dotp__input:disabled { opacity: .5; }
    .dotp__input--code { font-size: 18px; letter-spacing: 6px; text-align: center; }
    .dotp__textarea { height: 70px; padding: 8px 12px; resize: vertical; }
    .dotp__input:focus { border-color: #FB9C2A; box-shadow: 0 0 0 3px rgba(251,156,42,.18); }
    .dotp__prompt { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13.5px; font-weight: 600; color: #fff; }
    .dotp__prompt span { flex: 1; }
    .dotp__grid { position: relative; width: 304px; height: 304px; margin: 0 auto 8px; border-radius: 8px; overflow: hidden; }
    .dotp__grid img { display: block; width: 304px; height: 304px; pointer-events: none; }
    .dotp__grid-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #15151c; color: #6b7280; }
    /* Tile hit areas sit over the image: 4px gaps, 96px tiles (matches the server grid). */
    .dotp__tiles { position: absolute; inset: 0; display: grid; gap: 4px; padding: 4px; }
    .dotp__tile { position: relative; border: 2px solid transparent; border-radius: 6px; background: transparent; cursor: pointer; padding: 0; }
    .dotp__tile:hover { border-color: rgba(251,156,42,.7); }
    .dotp__tile:focus-visible { outline: 2px solid #FB9C2A; outline-offset: -2px; }
    .dotp__tile--on { border-color: #FB9C2A; background: rgba(251,156,42,.25); }
    .dotp__tile i { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; line-height: 20px; font-size: 11px;
                    border-radius: 50%; background: #FB9C2A; color: #111; }
    .dotp__icon { width: 34px; height: 34px; flex: none; border: 1px solid #3a3a46; border-radius: 8px; background: #1c1c25; color: #e5e7eb; cursor: pointer; }
    .dotp__icon:hover { border-color: #FB9C2A; color: #FB9C2A; }
    .dotp__actions { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
    .dotp__spacer { flex: 1; }
    .dotp__link { border: none; background: none; padding: 0; color: #FB9C2A; font-size: 12.5px; cursor: pointer; }
    .dotp__link:disabled { color: #6b7280; cursor: not-allowed; }
    .dotp__btn { height: 36px; padding: 0 18px; border: none; border-radius: 8px; background: #FB9C2A; color: #111; font-weight: 600; font-size: 13px; cursor: pointer; }
    .dotp__btn:disabled { opacity: .45; cursor: not-allowed; }
    .dotp__btn--ghost { background: transparent; color: #e5e7eb; border: 1px solid #3a3a46; font-weight: 400; }
  `],
})
export class DownloadOtpDialog {
  svc = inject(DownloadOtpService);

  phase: 'otp' | 'authorize' = 'otp';
  needsOtp = false;
  otp = '';
  sentTo = '';
  sending = false;
  captcha: PictureCaptcha | null = null;
  tiles: number[] = [];
  selected = new Set<number>();
  reason = '';
  busy = false;
  error = '';

  constructor() {
    // Each time the service opens the dialog, start from a clean slate.
    effect(() => {
      if (this.svc.request()) untracked(() => this.open());
    });
  }

  private open(): void {
    this.reason = '';
    this.otp = '';
    this.busy = false;
    this.error = '';
    this.needsOtp = !this.svc.currentGrant();
    if (this.needsOtp) {
      this.phase = 'otp';
      this.sendOtp();
    } else {
      this.toAuthorize();
    }
  }

  close(ok: boolean): void {
    this.captcha = null;
    this.svc.finish(ok);
  }

  sendOtp(): void {
    this.sending = true;
    this.error = '';
    this.otp = ''; // a new code replaces the old one — clear what was typed
    this.sentTo = '';
    this.svc.requestOtp().subscribe({
      next: (r) => { this.sending = false; this.sentTo = r.sentTo; },
      error: (e) => { this.sending = false; this.error = e.error?.error || 'Could not send the code. Please try again.'; },
    });
  }

  submitOtp(): void {
    this.busy = true;
    this.error = '';
    this.svc.confirmOtp(this.otp.trim()).subscribe({
      next: (g) => { this.svc.storeGrant(g); this.busy = false; this.toAuthorize(); },
      error: (e) => { this.busy = false; this.error = e.error?.error || 'Verification failed. Please try again.'; },
    });
  }

  private toAuthorize(): void {
    this.phase = 'authorize';
    this.error = '';
    this.loadCaptcha();
  }

  loadCaptcha(): void {
    this.captcha = null;
    this.selected.clear();
    this.svc.getCaptcha().subscribe({
      next: (c) => {
        this.captcha = c;
        this.tiles = Array.from({ length: c.grid * c.grid }, (_, i) => i);
      },
      error: (e) => { this.error = e.error?.error || 'Could not load the picture. Please try again.'; },
    });
  }

  toggleTile(t: number): void {
    if (this.selected.has(t)) this.selected.delete(t);
    else this.selected.add(t);
  }

  async submitAuthorize(): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      await this.svc.authorize({
        captchaId: this.captcha!.captchaId,
        captchaAnswer: [...this.selected],
        reason: this.reason.trim(),
        label: this.svc.request()?.label || 'Download',
      });
      this.busy = false;
      this.close(true);
    } catch (e: any) {
      this.busy = false;
      this.error = e?.error?.error || 'Could not verify. Please try again.';
      if (e?.status === 428) {
        // Grant expired while the dialog was open — start over with the OTP.
        this.needsOtp = true;
        this.phase = 'otp';
        this.sendOtp();
        return;
      }
      this.loadCaptcha(); // captchas are single use
    }
  }
}
