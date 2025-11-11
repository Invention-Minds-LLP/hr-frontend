import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class Tests {
  private apiUrl = environment.apiUrl + '/tests';
  // private apiUrl = 'http://localhost:3002/api/tests';

  constructor(private http: HttpClient) {}

  create(test: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, test);
  }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
  // services/tests/tests.ts
update(id: number, payload: any) {
  return this.http.put<any>(`http://localhost:3002/api/tests/${id}`, payload);
}

}
