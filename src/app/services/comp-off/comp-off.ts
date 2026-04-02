import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({ providedIn: 'root' })
export class CompOffService {
  private apiUrl = environment.apiUrl + '/comp-off';
  constructor(private http: HttpClient) {}

  getCredits(params?: any): Observable<any[]> {
    let p = new HttpParams();
    if (params?.employeeId) p = p.set('employeeId', params.employeeId);
    if (params?.status) p = p.set('status', params.status);
    return this.http.get<any[]>(this.apiUrl, { params: p });
  }

  create(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
