import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LiveAnnStat {
  id: number;
  title: string;
  ackCount: number;
  audienceCount: number;
  ackRate: number;     // 0..1
  ackPercent: number;  // 0..100
}
export interface Attachment {
  name: string;
  url: string;
  file?: File;
}
export interface Announcement {
  id: number;
  circularCode: string;
  title: string;
  body: string;
  type?: string;
  requireAck: boolean;
  isPinned: boolean;
  startsAt: string;
  endsAt?: string;
  attachments?: Attachment[];
}

@Injectable({
  providedIn: 'root'
})
export class Announcements {
  private api = 'http://localhost:3002/api/announcement';

  constructor(private http: HttpClient) {}

  create(payload: FormData): Observable<Announcement> {
    return this.http.post<Announcement>(this.api, payload);
  }
  getLiveAnnouncements() {
    return this.http.get<LiveAnnStat[]>(`${this.api}/live`);
  }

  ack(announcementId: number, employeeId: number) {
    return this.http.post(`${this.api}/${announcementId}/ack`, { employeeId });
  }
  listLiveForEmployee(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/live-employee`);
  }

}
