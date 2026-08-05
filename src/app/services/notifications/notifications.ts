import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';
import { AuthSession } from '../auth/auth-session';
@Injectable({
  providedIn: 'root'
})
export class Notifications {
  private apiUrl = environment.apiUrl + '/notifications';
  // private apiUrl = `http://localhost:3002/api/notifications`;
  private eventSource: EventSource | null = null;
  private connecting = false;
  private reconnectTimer: any;
  private readonly RECONNECT_DELAY_MS = 5000;
  private _notifications = new BehaviorSubject<any[]>([]);
  notifications$ = this._notifications.asObservable();

  constructor(private http: HttpClient, private zone: NgZone, private auth: AuthSession) {}
   /** ✅ Fetch all notifications (interceptor adds token automatically) */
   getAll(employeeId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?employeeId=${employeeId}`);
  }

  /** ✅ Mark a specific notification as read */
  markAsRead(id: number) {
    return this.http.put(`${this.apiUrl}/${id}/read`, {});
  }

  /** ✅ Delete a notification */
  delete(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * ✅ Connect to the live Server-Sent Events stream.
   *
   * EventSource can't carry an Authorization header, so we fetch a short-lived
   * ticket over normal (interceptor-authenticated) HTTP and hand that to the
   * stream. The server reads the employee id out of the signed ticket — the
   * URL no longer decides who we are.
   */
  connectStream(): void {
    if (!this.auth.isLoggedIn()) {
      console.warn('⚠️ No active session — skipping notifications stream.');
      return;
    }
    if (this.eventSource || this.connecting) {
      console.warn('⚠️ SSE already connected');
      return;
    }

    this.connecting = true;
    this.http.get<{ ticket: string }>(`${this.apiUrl}/stream-ticket`).subscribe({
      next: ({ ticket }) => {
        this.connecting = false;
        this.openStream(ticket);
      },
      error: (err) => {
        this.connecting = false;
        console.error('❌ Could not obtain notifications stream ticket:', err);
      }
    });
  }

  private openStream(ticket: string): void {
    if (this.eventSource) return;

    this.eventSource = new EventSource(`${this.apiUrl}/stream?ticket=${encodeURIComponent(ticket)}`);

    this.eventSource.addEventListener('notification', (event: MessageEvent) => {
      this.zone.run(() => {
        console.log('🔔 New notification received:', event.data);
        const data = JSON.parse(event.data);
        const current = this._notifications.value;
        console.log(current)
        this._notifications.next([data, ...current]);
      });
    });

    this.eventSource.onerror = (err) => {
      console.error('❌ SSE connection error:', err);
      // The browser retries automatically, but by then the one-minute ticket
      // has expired and every retry 401s. Tear the stream down and reconnect
      // with a fresh ticket instead, backing off so a dead session doesn't
      // spin. disconnectStream() sets eventSource to null, so the reconnect
      // isn't rejected as "already connected".
      this.disconnectStream();
      this.zone.run(() => {
        this.reconnectTimer = setTimeout(() => this.connectStream(), this.RECONNECT_DELAY_MS);
      });
    };
  }

  /** ✅ Disconnect from SSE (important for OnDestroy) */
  disconnectStream(): void {
    clearTimeout(this.reconnectTimer);
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
