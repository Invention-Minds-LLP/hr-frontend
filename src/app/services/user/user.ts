import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams  } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class User {
  private apiUrl = environment.apiUrl + '/users';
  // private apiUrl = 'http://localhost:3002/api/users';

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
  /**
   * Candidate login step 1 — password. Does NOT return a session token any
   * more; on success it emails a 6-digit code and responds
   * { otpRequired: true, email, expiresInSeconds }.
   */
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/candidate/login`, { email, password });
  }

  /** Candidate login step 2 — exchange the emailed code for the session. */
  verifyCandidateOtp(email: string, otp: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/candidate/login/verify-otp`, { email, otp });
  }

  // Optional: if you use a set-password flow for candidates
  setPassword(email: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/set-password`, { email, password });
  }
}
