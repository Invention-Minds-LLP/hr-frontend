import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class Permission {
  private apiUrl = environment.apiUrl + '/permission';
  // private apiUrl = 'http://localhost:3002/api/permission';

  constructor(private http: HttpClient) {}

  createPermission(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getPermissions(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // updatePermissionStatus(id: number, status: string, userId: number, declineReason?: string): Observable<any> {
  //   return this.http.patch(`${this.apiUrl}/${id}/status`, { status, userId, declineReason });
  // }
  updatePermissionStatus(
    id: number,
    status: string,
    userId: number,
    role: 'REPORTING_MANAGER' | 'HR_MANAGER' | 'MANAGEMENT',
    declineReason?: string
  ): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, {
      status,
      userId,
      role,
      declineReason
    });
  }
  
  getPermissionBalance(employeeId: number, year: number) {
    return this.http.get(`${this.apiUrl}/balance/${employeeId}?year=${year}`);
  }
  
  
}
