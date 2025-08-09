import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuestionsService {
  private apiUrl = 'http://localhost:3002/api/questions';

  constructor(private http: HttpClient) {}

  getByBank(bankId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/bank/${bankId}`);
  }

  create(question: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, question);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
