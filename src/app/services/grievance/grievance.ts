import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Grievance {
  private baseUrl = 'http://localhost:3002/api/grievances'; // 👈 correct base URL

  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, data);
  }
  addComment(grievanceId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${grievanceId}/comment`, data);
  }

  updateStatus(grievanceId: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${grievanceId}/status`, { status });
  }
}
