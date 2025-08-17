import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface LiveAnnStat {
  id: number;
  title: string;
  ackCount: number;
  audienceCount: number;
  ackRate: number;     // 0..1
  ackPercent: number;  // 0..100
}

@Injectable({
  providedIn: 'root'
})
@Injectable({ providedIn: 'root' })
export class Announcements {
  private api = 'http://localhost:3002/api/announcement';

  constructor(private http: HttpClient) {}

  createAnnouncement(payload: {
    title: string;
    body: string;
    audience?: { departmentId?: number[]; branchId?: number[] } | null;
    startsAt?: string;
    endsAt?: string | null;
  }) {
    return this.http.post(`${this.api}`, payload);
  }

  getLiveAnnouncements() {
    return this.http.get<LiveAnnStat[]>(`${this.api}/live`);
  }

  ack(announcementId: number, employeeId: number) {
    return this.http.post(`${this.api}/${announcementId}/ack`, { employeeId });
  }
}
