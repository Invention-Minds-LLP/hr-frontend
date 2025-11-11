import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class Posh {
  private baseUrl = environment.apiUrl + '/posh';
  // private baseUrl = 'http://localhost:3002/api/posh'; // Adjust if needed

  constructor(private http: HttpClient) {}
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, data);
  }

  getHearings(caseId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${caseId}/hearing`);
  }

  addHearing(caseId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${caseId}/hearing`, data);
  }
   // ✅ Update case status (e.g., FILED → UNDER_INVESTIGATION → CLOSED/REJECTED)
   updateStatus(caseId: number, status: string, committeeNote?: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${caseId}/status`, {
      status,
      committeeNote
    });
  }
}
