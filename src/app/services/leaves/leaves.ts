import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Leaves {
  private apiUrl = 'http://localhost:3002/api/leaves'; // adjust base url

  constructor(private http: HttpClient) {}

  createLeave(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getLeaves(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
  getLeaveTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/types`);
  }

  // Create a new leave type
  createLeaveType(name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/types`, { name });
  }
}
