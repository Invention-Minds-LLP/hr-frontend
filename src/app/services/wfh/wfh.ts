import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class Wfh {
  private apiUrl = 'http://192.168.1.15:3002/api/wfh';

  constructor(private http: HttpClient) { }

  createWFH(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getWFHRequests(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // updateWFHStatus(id: number, status: string, userId: number, declineReason?: string): Observable<any> {
  //   return this.http.patch(`${this.apiUrl}/${id}/status`, { status, userId, declineReason });
  // }
  updateWFHStatus(
    id: number,
    status: 'Approved' | 'Declined',
    userId: number,
    role: 'MANAGER' | 'HR',
    declineReason?: string
  ): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, {
      status,
      userId,
      role,
      declineReason
    });
  }


  getWhoIsOnWFHBuckets(date = new Date()) {
    const d = date.toISOString().slice(0, 10);
    return this.http.get<{ today: any[]; thisWeek: any[]; nextMonth: any[] }>(
      `${this.apiUrl}/wfh-buckets?date=${d}`
    );
  }

}
