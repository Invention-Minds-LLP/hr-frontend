import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class EncashmentService {
  private apiUrl = environment.apiUrl + '/encashment';

  constructor(private http: HttpClient) {}

  getEligible(year?: number): Observable<any> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    return this.http.get(`${this.apiUrl}/eligible`, { params });
  }

  processEncashment(data: {
    employeeId: number;
    days: number;
    year?: number;
    performedBy?: number;
    remarks?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/process`, data);
  }

  getHistory(employeeId: number, year?: number): Observable<any> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    return this.http.get(`${this.apiUrl}/history/${employeeId}`, { params });
  }
}
