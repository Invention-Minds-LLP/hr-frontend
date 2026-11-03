import { Injectable, NgZone, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AuthSession } from '../../services/auth/auth-session';

/**
 * DPDP screen protection, app-wide (ported from DocMinds):
 *   • no copy / cut / select / drag / right-click outside form fields
 *   • blocks PrintScreen, Ctrl+P / S / U, F12 and devtools shortcuts
 *   • covers the page when the window loses focus (screenshot tools, Alt+Tab)
 *     and briefly on PrintScreen, overwriting the clipboard
 *   • tiled watermark with the user, employee code and date, so any photo or
 *     capture that slips through is traceable
 *
 * Browsers cannot fully stop OS-level screenshots or phone cameras; these
 * measures deter casual capture and make leaks attributable.
 */
/** How long the window must stay unfocused before the privacy cover goes up. */
const PRIVACY_COVER_DELAY_MS = 300;

@Injectable({ providedIn: 'root' })
export class ScreenProtectionService {
  private doc = inject(DOCUMENT);
  private zone = inject(NgZone);
  private auth = inject(AuthSession);
  private started = false;
  private watermarkEl: HTMLElement | null = null;
  private watermarkKey = '';
  // Blur only applies to a signed-in session. The login page shows nothing
  // personal, and the Google Authenticator QR must stay scannable while the
  // user's focus is on their phone or another window.
  private sessionActive = false;

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    const body = this.doc.body;
    body.classList.add('hm-protected');

    this.zone.runOutsideAngular(() => {
      const win = this.doc.defaultView!;
      const block = (e: Event) => { if (!this.isEditable(e.target)) e.preventDefault(); };
      this.doc.addEventListener('copy', block, true);
      this.doc.addEventListener('cut', block, true);
      this.doc.addEventListener('selectstart', block, true);
      this.doc.addEventListener('dragstart', block, true);
      this.doc.addEventListener('contextmenu', (e) => e.preventDefault(), true);
      this.doc.addEventListener('keydown', (e) => this.onKeyDown(e), true);
      this.doc.addEventListener('keyup', (e) => { if (e.key === 'PrintScreen') this.onPrintScreen(); }, true);
      // The privacy cover is one opaque layer over the page. It used to be
      // filter: blur() on every element, which Firefox repaints slowly enough
      // to freeze big pages — and Firefox fires window blur for its own file
      // pickers and prompts, so it ran during ordinary use.
      const cover = this.doc.createElement('div');
      cover.className = 'hm-privacy-cover';
      cover.setAttribute('aria-hidden', 'true');
      cover.textContent = 'HR Minds — content hidden while this window is not in focus';
      body.appendChild(cover);

      // Wait a moment before covering: a focus blip (dropdown, picker opening)
      // shouldn't flash the cover. Focus moving into an embedded iframe
      // (PDF / résumé viewer) also fires window blur; skip it.
      let blurTimer: ReturnType<typeof setTimeout> | undefined;
      win.addEventListener('blur', () => {
        clearTimeout(blurTimer);
        blurTimer = setTimeout(() => {
          if (this.sessionActive && !this.doc.hasFocus() && this.doc.activeElement?.tagName !== 'IFRAME') {
            body.classList.add('hm-privacy-blur');
          }
        }, PRIVACY_COVER_DELAY_MS);
      });
      win.addEventListener('focus', () => { clearTimeout(blurTimer); body.classList.remove('hm-privacy-blur'); });
      this.doc.addEventListener('visibilitychange', () => {
        body.classList.toggle('hm-privacy-blur', this.sessionActive && this.doc.visibilityState === 'hidden');
      });
    });
  }

  /** Call on every navigation — shows the watermark once logged in, removes it on logout. */
  refreshWatermark(): void {
    if (typeof window === 'undefined') return;
    let name = '', code = '';
    try {
      if (this.auth.isLoggedIn()) {
        name = localStorage.getItem('name') || '';
        code = localStorage.getItem('employeeId') || '';
      }
    } catch { /* storage blocked */ }
    const date = new Date().toLocaleDateString('en-IN');
    const key = name ? `${name}|${code}|${date}` : '';
    this.sessionActive = !!key;
    if (!key) this.doc.body.classList.remove('hm-privacy-blur');
    if (key === this.watermarkKey) return;
    this.watermarkKey = key;

    if (!key) {
      this.watermarkEl?.remove();
      this.watermarkEl = null;
      return;
    }
    if (!this.watermarkEl) {
      this.watermarkEl = this.doc.createElement('div');
      this.watermarkEl.className = 'hm-watermark';
      this.watermarkEl.setAttribute('aria-hidden', 'true');
      this.doc.body.appendChild(this.watermarkEl);
    }
    const label = [name.split('@')[0], code && code !== 'null' ? code : '', date].filter(Boolean).join(' · ');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">` +
      `<text x="20" y="110" transform="rotate(-24 160 90)" font-family="Arial" font-size="14" fill="#3b0764">` +
      `${this.escapeXml(label)}</text></svg>`;
    this.watermarkEl.style.backgroundImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = (e.key || '').toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    const blocked =
      key === 'printscreen' || key === 'f12' ||
      (mod && ['p', 's', 'u'].includes(key)) ||
      (mod && ['c', 'x', 'a'].includes(key) && !this.isEditable(e.target)) ||
      (mod && e.shiftKey && ['i', 'j', 'c', 's'].includes(key));
    if (blocked) { e.preventDefault(); e.stopPropagation(); }
    if (key === 'printscreen') this.onPrintScreen();
  }

  private onPrintScreen(): void {
    if (!this.sessionActive) return;
    const body = this.doc.body;
    body.classList.add('hm-privacy-blur');
    try { this.doc.defaultView?.navigator.clipboard?.writeText('Screenshots are disabled in HR Minds.').catch(() => {}); } catch { /* ignore */ }
    setTimeout(() => body.classList.remove('hm-privacy-blur'), 1500);
  }

  private isEditable(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el || typeof el.closest !== 'function') return false;
    return !!el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], .ql-editor');
  }

  private escapeXml(s: string): string {
    return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
  }
}
