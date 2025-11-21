import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class Incident {
  constructor(private http: HttpClient) {}

  private baseUrl = environment.apiUrl + '/incidents';

  createIncident(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}`, payload);
  }

  getIncidentsByReporter(reporterId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/reported-by/${reporterId}`);
  }

  getIncidentsByEmployee(employeeId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/employee/${employeeId}`);
  }
}
