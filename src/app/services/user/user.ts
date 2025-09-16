import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams  } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class User {
  private apiUrl = 'http://192.168.1.15:3002/api/users';

  constructor(private http: HttpClient) {}

  registerUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  loginUser(employeeCode: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { employeeCode, password });
  }
  resetMyPassword(userId: any,confirmPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/reset-password`,
      { confirmPassword, newPassword, userId }
    );
  }

  // Admin reset someone else’s password
  adminResetPassword(userId: number, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/admin/reset-password`,
      { userId, newPassword }
    );
  }
  listAllUsers(): Observable<any> {
    const params = new HttpParams().set('all', 'true');
    return this.http.get<any>(`${this.apiUrl}/users`, {
      params
    });
  }
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/candidate/login`, { email, password });
  }

  // Optional: if you use a set-password flow for candidates
  setPassword(email: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/set-password`, { email, password });
  }
}
