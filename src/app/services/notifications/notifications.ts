import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';
@Injectable({
  providedIn: 'root'
})
export class Notifications {
  private apiUrl = environment.apiUrl + '/notifications';
  // private apiUrl = `http://localhost:3002/api/notifications`;
  private eventSource: EventSource | null = null;
  private _notifications = new BehaviorSubject<any[]>([]);
  notifications$ = this._notifications.asObservable();

  constructor(private http: HttpClient, private zone: NgZone) {}
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

  /** ✅ Connect to the live Server-Sent Events stream */
  connectStream(): void {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No token found — skipping notifications stream.');
      return;
    }

    const empId = localStorage.getItem('empId');
    const url = `${this.apiUrl}/stream?employeeId=${empId}`;
    
    this.eventSource = new EventSource(url);

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
    };
  }

  /** ✅ Disconnect from SSE (important for OnDestroy) */
  disconnectStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
