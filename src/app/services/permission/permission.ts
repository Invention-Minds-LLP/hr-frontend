import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Permission {
  private apiUrl = 'http://localhost:3002/api/permission';

  constructor(private http: HttpClient) {}

  createPermission(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getPermissions(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  updatePermissionStatus(id: number, status: string, userId: number, declineReason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status, userId, declineReason });
  }
}
