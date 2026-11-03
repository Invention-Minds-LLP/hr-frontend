/**
 * Download grant / ticket storage with no DI, so AuthInterceptor can read it
 * without a circular HttpClient dependency.
 *
 *   grant  — 60-minute JWT from the email OTP, kept in sessionStorage (this tab
 *            only) and bound to the logged-in userId.
 *   ticket — one-time JWT from captcha + reason, held in memory until the very
 *            next blob request takes it.
 */
export interface DownloadGrant { grant: string; expiresAt: string }

const STORAGE_KEY = 'downloadGrant';
const currentUserId = (): string | null => { try { return localStorage.getItem('userId'); } catch { return null; } };

export function currentDownloadGrant(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as DownloadGrant & { userId: string | null };
    if (g.userId !== currentUserId()) return null;
    return new Date(g.expiresAt).getTime() - 5000 > Date.now() ? g.grant : null;
  } catch {
    return null;
  }
}

export function storeDownloadGrant(g: DownloadGrant): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...g, userId: currentUserId() })); } catch { /* private mode */ }
}

export function clearDownloadGrant(): void {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

let pendingTicket: string | null = null;
export function setDownloadTicket(ticket: string): void { pendingTicket = ticket; }
export function takeDownloadTicket(): string | null { const t = pendingTicket; pendingTicket = null; return t; }
