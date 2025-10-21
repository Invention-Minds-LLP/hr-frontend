import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Trainings {

  baseUrl:any = 'http://localhost:3002/api/trainings';
  constructor(private http: HttpClient) {}

  getAllTrainings(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  createTraining(data: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, data);
  }
  submitFeedback(data: any) {
    return this.http.post( `${this.baseUrl}/feedback`, data);
  }
  
  getFeedbackSummary(trainingId: number) {
    return this.http.get(`${this.baseUrl}/feedback/summary/${trainingId}`);
  }
  
}
