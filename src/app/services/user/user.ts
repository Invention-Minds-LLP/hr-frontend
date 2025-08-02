import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class User {
  private apiUrl = 'http://localhost:3002/api/users';

  constructor(private http: HttpClient) {}

  registerUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  loginUser(employeeCode: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { employeeCode, password });
  }
}
