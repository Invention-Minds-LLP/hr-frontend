import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AssignTest {
  private apiUrl = 'http://192.168.1.15:3002/api/test-assign';

  constructor(private http: HttpClient) {}

  assign(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
  // assign-test.service.ts
getOverview(assignedId: number) {
  return this.http.get<any>(`${this.apiUrl}/${assignedId}/overview`);
}

}
