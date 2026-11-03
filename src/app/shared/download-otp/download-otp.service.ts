import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment.prod';
import { DownloadGrant, currentDownloadGrant, setDownloadTicket, storeDownloadGrant } from './download-grant.store';

/**
 * DPDP gate for every download / export / print:
 *   1. email OTP — one verification unlocks downloads for 60 minutes
 *   2. every download — picture captcha + reason, logged server-side
 *      (who / what / when / why).
 *
 * Server file downloads (responseType 'blob' on a gated URL) are gated
 * automatically by AuthInterceptor. Exports built in the browser call:
 *
 *   if (!(await this.downloadOtp.verify('Employee list (Excel)'))) return;
 *
 * The dialog itself is <app-download-otp-dialog>, mounted once in app.html.
 */
@Injectable({ providedIn: 'root' })
export class DownloadOtpService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/download-otp`;
  private pending: Promise<boolean> | null = null;
  private resolveDialog: ((ok: boolean) => void) | null = null;

  /** Non-null while the dialog is open. */
  readonly request = signal<{ label: string } | null>(null);

  /** Resolves true once the user has passed OTP (if needed), captcha and reason. */
  verify(label = 'this download'): Promise<boolean> {
    // Several exports fired by one click share one prompt.
    if (!this.pending) {
      this.pending = new Promise<boolean>((resolve) => {
        this.resolveDialog = resolve;
        this.request.set({ label });
      }).finally(() => (this.pending = null));
    }
    return this.pending;
  }

  /** Called by the dialog when it closes. */
  finish(ok: boolean): void {
    this.request.set(null);
    const resolve = this.resolveDialog;
    this.resolveDialog = null;
    resolve?.(ok);
  }

  currentGrant(): string | null {
    return currentDownloadGrant();
  }

  requestOtp(): Observable<{ sentTo: string; expiresAt: string }> {
    return this.http.post<{ sentTo: string; expiresAt: string }>(`${this.apiUrl}/request`, {});
  }

  confirmOtp(otp: string): Observable<DownloadGrant> {
    return this.http.post<DownloadGrant>(`${this.apiUrl}/verify`, { otp });
  }

  storeGrant(g: DownloadGrant): void {
    storeDownloadGrant(g);
  }

  getCaptcha(): Observable<PictureCaptcha> {
    return this.http.get<PictureCaptcha>(`${this.apiUrl}/captcha`);
  }

  /** Footer line of the most recently authorised download ("Download ID: … | Download #n"). */
  private lastStamp: string | null = null;

  /** Logs the download (what/why) and arms the one-time ticket for a server file route. */
  async authorize(body: { captchaId: string; captchaAnswer: number[]; reason: string; label: string }): Promise<void> {
    const page = typeof window !== 'undefined' ? window.location.pathname : null;
    const res = await firstValueFrom(this.http.post<{ logId: string; ticket: string; downloadCode: string; stamp: string }>(
      `${this.apiUrl}/authorize`,
      { ...body, page },
      { headers: { 'X-Download-Grant': this.currentGrant() || '' } },
    ));
    this.lastStamp = res.stamp;
    setDownloadTicket(res.ticket);
  }

  /**
   * For exports built in the browser: runs the same check as verify() and
   * resolves the footer line to put in the file, or null if cancelled.
   * (Server files are stamped by the backend — no need to call this for them.)
   *
   *   const stamp = await this.downloadOtp.verifyStamp('Employee list (Excel)');
   *   if (!stamp) return;
   */
  async verifyStamp(label = 'this download'): Promise<string | null> {
    this.lastStamp = null;
    return (await this.verify(label)) ? this.lastStamp : null;
  }

  /** Print exports: the stamp is printed at the foot of every page (styles.css, @media print). */
  setPrintStamp(stamp: string): void {
    try { document.body.dataset['downloadStamp'] = stamp; } catch { /* SSR / no DOM */ }
  }

  getLogs(params: { page: number; pageSize: number; search?: string; from?: string; to?: string }): Observable<DownloadLogPage> {
    const query: Record<string, string> = { page: String(params.page), pageSize: String(params.pageSize) };
    if (params.search) query['search'] = params.search;
    if (params.from) query['from'] = params.from;
    if (params.to) query['to'] = params.to;
    return this.http.get<DownloadLogPage>(`${this.apiUrl}/logs`, { params: query });
  }
}

/** "Select every tile that contains a …" — answer is the tile indices, row by row. */
export interface PictureCaptcha { captchaId: string; image: string; prompt: string; grid: number }

export interface DownloadLogRow {
  id: string;
  downloadCode: string | null;
  employeeCode: string;
  username: string;
  role: string;
  departmentName: string | null;
  label: string;
  page: string | null;
  reason: string;
  ip: string | null;
  serverRoute: string | null;
  servedAt: string | null;
  createdAt: string;
}

export interface DownloadLogPage { data: DownloadLogRow[]; total: number; page: number; pageSize: number }

/**
 * Server file routes behind requireDownloadGrant, with the label shown in the
 * dialog and written to the log. Keep in sync with the backend routes.
 */
const GATED_DOWNLOADS: { pattern: RegExp; label: string }[] = [
  { pattern: /\/export\/[^/]+$/, label: 'Data export (Excel)' },
  { pattern: /\/dashboard\/missing-docs$/, label: 'Missing documents report' },
  { pattern: /\/payroll\/runs\/\d+\/working-sheet\.xlsx$/, label: 'Payroll working sheet' },
  { pattern: /\/payroll\/payslips\/\d+\/pdf$/, label: 'Payslip PDF' },
  { pattern: /\/payroll\/statutory\/[^/]+$/, label: 'Statutory filing file' },
  { pattern: /\/tax\/form16\/download(\/\d+)?$/, label: 'Form 16 PDF' },
  { pattern: /\/letters\/issued\/\d+\/pdf$/, label: 'Issued letter PDF' },
  { pattern: /\/performance\/export\/\d+$/, label: 'Performance sheet PDF' },
  { pattern: /\/probation\/evaluations\/\d+\/pdf$/, label: 'Probation evaluation PDF' },
  { pattern: /\/recruiting\/offers\/\d+\/pdf$/, label: 'Offer letter PDF' },
  { pattern: /\/shifts\/attendance-report\/export$/, label: 'Shift attendance report' },
  { pattern: /\/shifts\/adherence-report\/export$/, label: 'Shift adherence report' },
];

export function gatedDownloadLabel(url: string): string | null {
  const path = url.split('?')[0];
  return GATED_DOWNLOADS.find((g) => g.pattern.test(path))?.label ?? null;
}
